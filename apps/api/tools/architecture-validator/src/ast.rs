use std::collections::{HashMap, HashSet};
use std::error::Error;
use std::fmt::{self, Display, Formatter};

use proc_macro2::{Span, TokenStream, TokenTree};
use syn::spanned::Spanned;
use syn::visit::{self, Visit};
use syn::{
    Block, ExprCall, ExprMacro, ExprMethodCall, ImplItemConst, ImplItemFn, ImplItemType, Item,
    ItemExternCrate, ItemFn, ItemImpl, ItemMod, ItemUse, Macro, Path, Stmt, UseTree, Visibility,
};

#[derive(Clone, Copy, Debug)]
pub struct SourceUnit<'a> {
    pub crate_name: &'a str,
    pub path: &'a str,
    pub source: &'a str,
    pub production: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Diagnostic {
    pub rule_id: &'static str,
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub symbol: String,
    pub guidance: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ValidationError {
    Parse { path: String, message: String },
}

impl Display for ValidationError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        match self {
            Self::Parse { path, message } => write!(formatter, "cannot parse {path}: {message}"),
        }
    }
}

impl Error for ValidationError {}

/// Parses one discovered Rust source and returns every applicable architecture violation.
///
/// # Errors
///
/// Returns [`ValidationError::Parse`] when `syn` cannot parse the complete source. Parse
/// failures are fatal so unreachable files cannot bypass architecture validation.
pub fn analyze_source(unit: SourceUnit<'_>) -> Result<Vec<Diagnostic>, ValidationError> {
    analyze_source_set(&[unit])
}

/// Parses and analyzes a complete source set with cross-file trait visibility context.
///
/// # Errors
///
/// Returns [`ValidationError::Parse`] when any source fails to parse. No partial result is
/// returned, so an unindexable file cannot weaken public-boundary enforcement.
pub fn analyze_source_set(units: &[SourceUnit<'_>]) -> Result<Vec<Diagnostic>, ValidationError> {
    let parsed = units
        .iter()
        .map(|unit| {
            syn::parse_file(unit.source)
                .map(|file| (*unit, file))
                .map_err(|error| ValidationError::Parse {
                    path: unit.path.to_owned(),
                    message: error.to_string(),
                })
        })
        .collect::<Result<Vec<_>, _>>()?;
    let mut trait_index = HashMap::new();
    for (unit, file) in &parsed {
        let prefix = source_module_components(unit.path);
        for (identity, public) in collect_qualified_traits(&file.items, &prefix) {
            trait_index.insert((unit.crate_name.to_owned(), identity), public);
        }
    }
    let mut diagnostics = Vec::new();
    for (unit, file) in &parsed {
        diagnostics.extend(analyze_parsed(*unit, file, &trait_index));
    }
    Ok(diagnostics)
}

fn analyze_parsed(
    unit: SourceUnit<'_>,
    file: &syn::File,
    trait_index: &HashMap<(String, Vec<String>), bool>,
) -> Vec<Diagnostic> {
    let aliases = collect_item_aliases(&file.items);
    let trait_scope = collect_item_traits(&file.items);
    let qualified_traits = trait_index
        .iter()
        .filter(|((crate_name, _), _)| crate_name == unit.crate_name)
        .map(|((_, identity), public)| (identity.clone(), *public))
        .collect();
    let mut analyzer = Analyzer {
        unit,
        alias_scopes: vec![aliases],
        diagnostics: Vec::new(),
        seen: HashSet::new(),
        public_boundary: false,
        trait_impl: false,
        trait_scopes: vec![trait_scope],
        qualified_traits,
        module_path: source_module_components(unit.path),
    };
    analyzer.visit_file(file);
    analyzer.diagnostics
}

struct Analyzer<'a> {
    unit: SourceUnit<'a>,
    alias_scopes: Vec<HashMap<String, Vec<String>>>,
    diagnostics: Vec<Diagnostic>,
    seen: HashSet<(&'static str, usize, usize, String)>,
    public_boundary: bool,
    trait_impl: bool,
    trait_scopes: Vec<HashMap<String, bool>>,
    qualified_traits: HashMap<Vec<String>, bool>,
    module_path: Vec<String>,
}

impl Analyzer<'_> {
    fn report(
        &mut self,
        rule_id: &'static str,
        span: Span,
        symbol: impl Into<String>,
        guidance: &'static str,
    ) {
        let start = span.start();
        let line = start.line.max(1);
        let symbol = symbol.into();
        if self
            .seen
            .insert((rule_id, line, start.column, symbol.clone()))
        {
            self.diagnostics.push(Diagnostic {
                rule_id,
                path: self.unit.path.to_owned(),
                line,
                column: start.column + 1,
                symbol,
                guidance,
            });
        }
    }

    fn inspect_path(&mut self, path: &Path) {
        let raw = path_segments(path);
        let canonical = canonicalize(&raw, &self.alias_scopes);
        self.inspect_segments(
            &canonical,
            path.span(),
            raw.last().map_or("path", String::as_str),
        );
    }

    fn inspect_segments(&mut self, segments: &[String], span: Span, symbol: &str) {
        let joined = segments.join("::");
        let root = segments.first().map(String::as_str).unwrap_or_default();
        if self.unit.crate_name != "api-bootstrap"
            && (joined.starts_with("std::env") || matches!(root, "env" | "option_env"))
        {
            self.report(
                "API-ARCH-001",
                span,
                symbol,
                "inject typed configuration from api-bootstrap",
            );
        }
        if self.unit.crate_name != "adapter-postgres" && root == "sea_orm" {
            self.report(
                "API-ARCH-002",
                span,
                symbol,
                "move SeaORM access behind adapter-postgres",
            );
        }
        if (matches!(root, "aws_config") || root.starts_with("aws_sdk_"))
            && !aws_location_is_allowed(self.unit.crate_name, root)
        {
            self.report(
                "API-ARCH-003",
                span,
                symbol,
                "move provider SDK use to its AWS adapter or bootstrap wiring",
            );
        }
        if self.unit.crate_name != "adapter-graphql" && root == "async_graphql" {
            self.report(
                "API-ARCH-004",
                span,
                symbol,
                "keep GraphQL presentation types inside adapter-graphql",
            );
        }
        if matches!(self.unit.crate_name, "domain" | "application")
            && self.public_boundary
            && segments.iter().any(|part| part.starts_with("adapter_"))
        {
            self.report(
                "API-ARCH-006",
                span,
                symbol,
                "expose domain or application-owned types at inner boundaries",
            );
        }
        if matches!(self.unit.crate_name, "domain" | "application")
            && (matches!(root, "reqwest" | "axum" | "aws_config" | "sea_orm")
                || root.starts_with("aws_sdk_")
                || joined.starts_with("std::fs")
                || joined.starts_with("std::env")
                || joined.starts_with("tokio::fs"))
        {
            self.report(
                "API-ARCH-007",
                span,
                symbol,
                "express external capabilities as application ports",
            );
        }
        if self.unit.crate_name == "adapter-graphql"
            && is_resolver_path(self.unit.path)
            && segments.iter().any(|part| is_resolver_concern(part))
        {
            self.report(
                "API-ARCH-008",
                span,
                symbol,
                "delegate orchestration to an application use case",
            );
        }
        if self.unit.crate_name == "application"
            && imports_another_application_module(self.unit.path, segments)
        {
            self.report(
                "API-ARCH-010",
                span,
                symbol,
                "share domain values or compose modules from api-bootstrap",
            );
        }
    }

    fn inspect_macro(&mut self, node: &Macro) {
        let path = canonicalize(&path_segments(&node.path), &self.alias_scopes);
        let name = path.last().map(String::as_str).unwrap_or_default();
        if self.unit.production && matches!(name, "panic" | "todo" | "unimplemented") {
            self.report(
                "API-ARCH-005",
                node.path.span(),
                name,
                "return a typed error instead of aborting a production target",
            );
        }
        if !raw_sql_location_is_allowed(self.unit)
            && path.first().is_some_and(|part| part == "sqlx")
            && name.starts_with("query")
        {
            self.report(
                "API-ARCH-011",
                node.path.span(),
                "raw SQL",
                "keep raw SQL in classified adapter-postgres query or migration modules",
            );
        }
        if matches!(path.first().map(String::as_str), Some("tracing" | "log"))
            && let Some((span, _field)) = sensitive_token(&node.tokens)
        {
            self.report(
                "API-ARCH-012",
                span,
                format!("{}!", path.join("::")),
                "log only approved low-cardinality identifiers and redacted outcomes",
            );
        }
    }
}

impl<'ast> Visit<'ast> for Analyzer<'_> {
    fn visit_item(&mut self, node: &'ast Item) {
        let previous = self.public_boundary;
        self.public_boundary = item_is_public(node);
        visit::visit_item(self, node);
        self.public_boundary = previous;
    }

    fn visit_item_use(&mut self, node: &'ast ItemUse) {
        let public = !matches!(node.vis, Visibility::Inherited);
        for leaf in use_leaves(&node.tree) {
            let canonical = canonicalize(&leaf.path, &self.alias_scopes);
            let previous = self.public_boundary;
            self.public_boundary = public;
            self.inspect_segments(&canonical, leaf.span, leaf.name.as_deref().unwrap_or("use"));
            self.public_boundary = previous;
        }
    }

    fn visit_item_mod(&mut self, node: &'ast ItemMod) {
        let Some((_, items)) = &node.content else {
            visit::visit_item_mod(self, node);
            return;
        };
        self.alias_scopes.push(collect_item_aliases(items));
        self.trait_scopes.push(collect_item_traits(items));
        self.module_path.push(node.ident.to_string());
        visit::visit_item_mod(self, node);
        self.module_path.pop();
        self.trait_scopes.pop();
        self.alias_scopes.pop();
    }

    fn visit_block(&mut self, node: &'ast Block) {
        self.alias_scopes.push(collect_block_aliases(node));
        self.trait_scopes.push(collect_block_traits(node));
        visit::visit_block(self, node);
        self.trait_scopes.pop();
        self.alias_scopes.pop();
    }

    fn visit_item_impl(&mut self, node: &'ast ItemImpl) {
        let previous = self.trait_impl;
        self.trait_impl = node.trait_.as_ref().is_some_and(|(_, path, _)| {
            let canonical = canonicalize(&path_segments(path), &self.alias_scopes);
            trait_is_public(
                &canonical,
                &self.module_path,
                &self.trait_scopes,
                &self.qualified_traits,
            )
        });
        visit::visit_item_impl(self, node);
        self.trait_impl = previous;
    }

    fn visit_impl_item_fn(&mut self, node: &'ast ImplItemFn) {
        let previous = self.public_boundary;
        self.public_boundary = self.trait_impl || !matches!(node.vis, Visibility::Inherited);
        visit::visit_signature(self, &node.sig);
        self.public_boundary = false;
        self.visit_block(&node.block);
        self.public_boundary = previous;
    }

    fn visit_impl_item_const(&mut self, node: &'ast ImplItemConst) {
        let previous = self.public_boundary;
        self.public_boundary = self.trait_impl || !matches!(node.vis, Visibility::Inherited);
        self.visit_type(&node.ty);
        self.public_boundary = false;
        self.visit_expr(&node.expr);
        self.public_boundary = previous;
    }

    fn visit_impl_item_type(&mut self, node: &'ast ImplItemType) {
        let previous = self.public_boundary;
        self.public_boundary = self.trait_impl || !matches!(node.vis, Visibility::Inherited);
        visit::visit_impl_item_type(self, node);
        self.public_boundary = previous;
    }

    fn visit_item_fn(&mut self, node: &'ast ItemFn) {
        let previous = self.public_boundary;
        self.public_boundary = !matches!(node.vis, Visibility::Inherited);
        visit::visit_signature(self, &node.sig);
        self.public_boundary = false;
        self.visit_block(&node.block);
        self.public_boundary = previous;
    }

    fn visit_item_extern_crate(&mut self, node: &'ast ItemExternCrate) {
        let path = vec![node.ident.to_string()];
        self.inspect_segments(&path, node.ident.span(), &node.ident.to_string());
    }

    fn visit_path(&mut self, node: &'ast Path) {
        self.inspect_path(node);
        visit::visit_path(self, node);
    }

    fn visit_expr_method_call(&mut self, node: &'ast ExprMethodCall) {
        let method = node.method.to_string();
        if self.unit.production && matches!(method.as_str(), "unwrap" | "expect") {
            self.report(
                "API-ARCH-005",
                node.method.span(),
                method.clone(),
                "return a typed error instead of aborting a production target",
            );
        }
        if self.unit.crate_name == "adapter-graphql"
            && is_resolver_path(self.unit.path)
            && is_resolver_concern(&method)
        {
            self.report(
                "API-ARCH-008",
                node.method.span(),
                method.clone(),
                "delegate orchestration to an application use case",
            );
        }
        if self.unit.crate_name == "adapter-postgres"
            && !raw_sql_location_is_allowed(self.unit)
            && matches!(method.as_str(), "execute" | "execute_unprepared")
        {
            self.report(
                "API-ARCH-011",
                node.method.span(),
                "raw SQL execution",
                "keep raw SQL in classified adapter-postgres query or migration modules",
            );
        }
        visit::visit_expr_method_call(self, node);
    }

    fn visit_expr_call(&mut self, node: &'ast ExprCall) {
        if let syn::Expr::Path(function) = node.func.as_ref() {
            let path = canonicalize(&path_segments(&function.path), &self.alias_scopes);
            if self.unit.crate_name != "api-bootstrap"
                && path.last().is_some_and(|part| part == "new")
                && path.iter().any(|part| part.starts_with("adapter_"))
            {
                self.report(
                    "API-ARCH-009",
                    function.path.span(),
                    "adapter constructor",
                    "construct production adapters only in api-bootstrap",
                );
            }
            let name = path.last().map(String::as_str).unwrap_or_default();
            if !raw_sql_location_is_allowed(self.unit)
                && ((path.first().is_some_and(|part| part == "sqlx")
                    && (name.starts_with("query")
                        || name == "raw_sql"
                        || (name == "execute" && path.iter().any(|part| part == "Executor"))))
                    || (path.first().is_some_and(|part| part == "sea_orm")
                        && matches!(
                            name,
                            "from_string" | "from_sql_and_values" | "execute_unprepared"
                        )))
            {
                self.report(
                    "API-ARCH-011",
                    function.path.span(),
                    "raw SQL",
                    "keep raw SQL in classified adapter-postgres query or migration modules",
                );
            }
        }
        visit::visit_expr_call(self, node);
    }

    fn visit_expr_macro(&mut self, node: &'ast ExprMacro) {
        self.inspect_macro(&node.mac);
        visit::visit_expr_macro(self, node);
    }

    fn visit_macro(&mut self, node: &'ast Macro) {
        self.inspect_macro(node);
        visit::visit_macro(self, node);
    }
}

#[derive(Clone)]
struct UseLeaf {
    path: Vec<String>,
    name: Option<String>,
    span: Span,
}

fn use_leaves(tree: &UseTree) -> Vec<UseLeaf> {
    fn walk(tree: &UseTree, prefix: &mut Vec<String>, output: &mut Vec<UseLeaf>) {
        match tree {
            UseTree::Path(path) => {
                prefix.push(path.ident.to_string());
                walk(&path.tree, prefix, output);
                prefix.pop();
            }
            UseTree::Name(name) => {
                let mut path = prefix.clone();
                if name.ident != "self" {
                    path.push(name.ident.to_string());
                }
                output.push(UseLeaf {
                    path,
                    name: Some(name.ident.to_string()),
                    span: name.ident.span(),
                });
            }
            UseTree::Rename(rename) => {
                let mut path = prefix.clone();
                if rename.ident != "self" {
                    path.push(rename.ident.to_string());
                }
                output.push(UseLeaf {
                    path,
                    name: Some(rename.rename.to_string()),
                    span: rename.rename.span(),
                });
            }
            UseTree::Glob(glob) => output.push(UseLeaf {
                path: prefix.clone(),
                name: Some("*".to_owned()),
                span: glob.star_token.span,
            }),
            UseTree::Group(group) => {
                for item in &group.items {
                    walk(item, prefix, output);
                }
            }
        }
    }
    let mut output = Vec::new();
    walk(tree, &mut Vec::new(), &mut output);
    output
}

fn collect_item_aliases(items: &[Item]) -> HashMap<String, Vec<String>> {
    let mut aliases = HashMap::new();
    for item in items {
        match item {
            Item::Use(item) => {
                for leaf in use_leaves(&item.tree) {
                    if let Some(name) = leaf.name
                        && name != "*"
                        && name != "self"
                    {
                        aliases.insert(name, leaf.path);
                    }
                }
            }
            Item::ExternCrate(item) => {
                let alias = item
                    .rename
                    .as_ref()
                    .map_or_else(|| item.ident.to_string(), |(_, ident)| ident.to_string());
                aliases.insert(alias, vec![item.ident.to_string()]);
            }
            Item::Type(item) => {
                if let syn::Type::Path(target) = item.ty.as_ref() {
                    aliases.insert(item.ident.to_string(), path_segments(&target.path));
                }
            }
            _ => {}
        }
    }
    aliases
}

fn collect_item_traits(items: &[Item]) -> HashMap<String, bool> {
    items
        .iter()
        .filter_map(|item| match item {
            Item::Trait(item) => Some((
                item.ident.to_string(),
                !matches!(item.vis, Visibility::Inherited),
            )),
            _ => None,
        })
        .collect()
}

fn collect_qualified_traits(items: &[Item], prefix: &[String]) -> HashMap<Vec<String>, bool> {
    fn walk(
        items: &[Item],
        module_path: &mut Vec<String>,
        traits: &mut HashMap<Vec<String>, bool>,
    ) {
        for item in items {
            match item {
                Item::Trait(item) => {
                    let mut identity = module_path.clone();
                    identity.push(item.ident.to_string());
                    traits.insert(identity, !matches!(item.vis, Visibility::Inherited));
                }
                Item::Mod(item) => {
                    if let Some((_, items)) = &item.content {
                        module_path.push(item.ident.to_string());
                        walk(items, module_path, traits);
                        module_path.pop();
                    }
                }
                _ => {}
            }
        }
    }
    let mut traits = HashMap::new();
    walk(items, &mut prefix.to_vec(), &mut traits);
    traits
}

fn collect_block_aliases(block: &Block) -> HashMap<String, Vec<String>> {
    let items = block
        .stmts
        .iter()
        .filter_map(|statement| match statement {
            Stmt::Item(item) => Some(item.clone()),
            Stmt::Local(_) | Stmt::Expr(_, _) | Stmt::Macro(_) => None,
        })
        .collect::<Vec<_>>();
    collect_item_aliases(&items)
}

fn collect_block_traits(block: &Block) -> HashMap<String, bool> {
    block
        .stmts
        .iter()
        .filter_map(|statement| match statement {
            Stmt::Item(Item::Trait(item)) => Some((
                item.ident.to_string(),
                !matches!(item.vis, Visibility::Inherited),
            )),
            _ => None,
        })
        .collect()
}

fn trait_is_public(
    canonical: &[String],
    module_path: &[String],
    trait_scopes: &[HashMap<String, bool>],
    qualified_traits: &HashMap<Vec<String>, bool>,
) -> bool {
    match canonical {
        [name] => trait_scopes
            .iter()
            .rev()
            .find_map(|traits| traits.get(name))
            .copied()
            .unwrap_or(true),
        [root, rest @ ..] if root == "crate" => qualified_traits.get(rest).copied().unwrap_or(true),
        [root, rest @ ..] if root == "self" => {
            let mut identity = module_path.to_vec();
            identity.extend_from_slice(rest);
            qualified_traits.get(&identity).copied().unwrap_or(true)
        }
        [root, rest @ ..] if root == "super" => {
            let count = canonical
                .iter()
                .take_while(|part| part.as_str() == "super")
                .count();
            if count > module_path.len() {
                return true;
            }
            let mut identity = module_path[..module_path.len() - count].to_vec();
            identity.extend_from_slice(&rest[count - 1..]);
            qualified_traits.get(&identity).copied().unwrap_or(true)
        }
        _ => true,
    }
}

fn canonicalize(path: &[String], alias_scopes: &[HashMap<String, Vec<String>>]) -> Vec<String> {
    let mut result = path.to_vec();
    let mut expanded = HashSet::new();
    while let Some(first) = result.first().cloned() {
        if !expanded.insert(first.clone()) {
            break;
        }
        let Some(replacement) = alias_scopes
            .iter()
            .rev()
            .find_map(|aliases| aliases.get(&first))
        else {
            break;
        };
        let mut next = replacement.clone();
        next.extend_from_slice(&result[1..]);
        result = next;
    }
    result
}

fn path_segments(path: &Path) -> Vec<String> {
    path.segments
        .iter()
        .map(|segment| segment.ident.to_string())
        .collect()
}

fn item_is_public(item: &Item) -> bool {
    let visibility = match item {
        Item::Const(v) => &v.vis,
        Item::Enum(v) => &v.vis,
        Item::ExternCrate(v) => &v.vis,
        Item::Fn(v) => &v.vis,
        Item::Mod(v) => &v.vis,
        Item::Static(v) => &v.vis,
        Item::Struct(v) => &v.vis,
        Item::Trait(v) => &v.vis,
        Item::TraitAlias(v) => &v.vis,
        Item::Type(v) => &v.vis,
        Item::Union(v) => &v.vis,
        Item::Use(v) => &v.vis,
        _ => return false,
    };
    !matches!(visibility, Visibility::Inherited)
}

fn token_words(tokens: &TokenStream, output: &mut Vec<(Span, String)>) {
    for token in tokens.clone() {
        match token {
            TokenTree::Ident(ident) => output.push((ident.span(), ident.to_string())),
            TokenTree::Literal(literal) => output.push((literal.span(), literal.to_string())),
            TokenTree::Group(group) => token_words(&group.stream(), output),
            TokenTree::Punct(_) => {}
        }
    }
}

fn sensitive_token(tokens: &TokenStream) -> Option<(Span, String)> {
    let mut words = Vec::new();
    token_words(tokens, &mut words);
    words
        .into_iter()
        .find(|(_, word)| {
            let value = word.trim_matches('"').to_ascii_lowercase();
            [
                "token",
                "otp",
                "one_time_password",
                "email",
                "coordinate",
                "latitude",
                "longitude",
                "object_key",
                "storage_key",
            ]
            .iter()
            .any(|sensitive| value.contains(sensitive))
        })
        .map(|(span, _)| (span, "sensitive log field".to_owned()))
}

fn aws_location_is_allowed(crate_name: &str, sdk: &str) -> bool {
    crate_name == "api-bootstrap"
        || [
            ("aws_sdk_cognitoidentityprovider", "adapter-aws-cognito"),
            ("aws_sdk_dynamodb", "adapter-aws-dynamodb"),
            ("aws_sdk_s3", "adapter-aws-s3"),
            ("aws_sdk_sqs", "adapter-aws-sqs"),
        ]
        .iter()
        .any(|(expected_sdk, owner)| sdk == *expected_sdk && crate_name == *owner)
}

fn is_resolver_path(path: &str) -> bool {
    ["/resolver", "/query", "/mutation"]
        .iter()
        .any(|part| path.contains(part))
}

fn is_resolver_concern(value: &str) -> bool {
    let value = value.to_ascii_lowercase();
    ["transaction", "retry", "clock", "repository", "storage"]
        .iter()
        .any(|part| value.contains(part))
        || value.starts_with("aws_sdk_")
}

fn imports_another_application_module(path: &str, imported: &[String]) -> bool {
    const MODULES: [&str; 6] = [
        "identity",
        "owner",
        "dog",
        "walk_recording",
        "walk_event",
        "walk_insight",
    ];
    let source = source_module_components(path);
    let current = source.first().map(String::as_str);
    let resolved = match imported {
        [root, rest @ ..] if root == "crate" => rest.to_vec(),
        [root, ..] if root == "super" => {
            let count = imported
                .iter()
                .take_while(|part| part.as_str() == "super")
                .count();
            if count > source.len() {
                return true;
            }
            let mut resolved = source[..source.len() - count].to_vec();
            resolved.extend_from_slice(&imported[count..]);
            resolved
        }
        _ => return false,
    };
    resolved.first().is_some_and(|module| {
        MODULES.contains(&module.as_str()) && Some(module.as_str()) != current
    })
}

fn source_module_components(path: &str) -> Vec<String> {
    let Some(relative) = path.split("/src/").nth(1) else {
        return Vec::new();
    };
    let mut parts = relative.split('/').map(str::to_owned).collect::<Vec<_>>();
    let Some(file) = parts.pop() else {
        return parts;
    };
    if !matches!(file.as_str(), "lib.rs" | "main.rs" | "mod.rs") {
        parts.push(file.trim_end_matches(".rs").to_owned());
    }
    parts
}

fn raw_sql_location_is_allowed(unit: SourceUnit<'_>) -> bool {
    unit.crate_name == "adapter-postgres"
        && ["/query/", "/queries/", "/migrations/"]
            .iter()
            .any(|part| unit.path.contains(part))
}
