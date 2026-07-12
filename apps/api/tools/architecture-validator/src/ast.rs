use std::collections::{HashMap, HashSet};
use std::error::Error;
use std::fmt::{self, Display, Formatter};

use proc_macro2::{Span, TokenStream, TokenTree};
use syn::spanned::Spanned;
use syn::visit::{self, Visit};
use syn::{
    Attribute, Block, ExprCall, ExprMacro, ExprMethodCall, ImplItemConst, ImplItemFn, ImplItemType,
    Item, ItemExternCrate, ItemFn, ItemImpl, ItemMod, ItemUse, Macro, Meta, Path, Stmt, UseTree,
    Visibility,
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
    let mut diagnostics = Vec::new();
    for (unit, file) in &parsed {
        diagnostics.extend(analyze_parsed(*unit, file));
    }
    Ok(diagnostics)
}

fn analyze_parsed(unit: SourceUnit<'_>, file: &syn::File) -> Vec<Diagnostic> {
    let trait_scope = collect_item_traits(&file.items);
    let mut analyzer = Analyzer {
        unit,
        diagnostics: Vec::new(),
        seen: HashSet::new(),
        public_boundary: false,
        trait_impl: false,
        trait_scopes: vec![trait_scope],
        module_path: source_module_components(unit.path),
    };
    analyzer.visit_file(file);
    analyzer.diagnostics
}

struct Analyzer<'a> {
    unit: SourceUnit<'a>,
    diagnostics: Vec<Diagnostic>,
    seen: HashSet<(&'static str, usize, usize, String)>,
    public_boundary: bool,
    trait_impl: bool,
    trait_scopes: Vec<HashMap<String, bool>>,
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
        self.inspect_segments(&raw, path.span(), raw.last().map_or("path", String::as_str));
    }

    fn inspect_segments(&mut self, segments: &[String], span: Span, symbol: &str) {
        let joined = segments.join("::");
        let root = segments.first().map(String::as_str).unwrap_or_default();
        if self.unit.crate_name != "api-bootstrap" && joined.starts_with("std::env") {
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
        if self.unit.crate_name == "application"
            && imports_another_application_module(&self.module_path, segments)
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
        let path = path_segments(&node.path);
        let name = path.last().map(String::as_str).unwrap_or_default();
        if name == "include" {
            self.report(
                "API-ARCH-001",
                node.path.span(),
                "include!",
                "keep governed source explicit; include! cannot hide architecture-relevant syntax",
            );
        }
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

    fn inspect_attributes(&mut self, attributes: &[Attribute]) {
        for attribute in attributes {
            if attribute_hides_cfg(attribute) {
                self.report(
                    "API-ARCH-001",
                    attribute.span(),
                    if attribute.path().is_ident("cfg") {
                        "cfg"
                    } else {
                        "cfg_attr"
                    },
                    "cfg and cfg_attr cannot hide governed architecture syntax",
                );
            }
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
        self.inspect_attributes(&node.attrs);
        if use_is_noncanonical(&node.tree) || !matches!(node.vis, Visibility::Inherited) {
            self.report(
                "API-ARCH-001",
                node.use_token.span,
                "noncanonical use",
                "use direct canonical paths; aliases, globs, and re-exports are forbidden",
            );
        }
        let public = !matches!(node.vis, Visibility::Inherited);
        for leaf in use_leaves(&node.tree) {
            let canonical = leaf.path;
            let previous = self.public_boundary;
            self.public_boundary = public;
            self.inspect_segments(&canonical, leaf.span, leaf.name.as_deref().unwrap_or("use"));
            self.public_boundary = previous;
        }
    }

    fn visit_attribute(&mut self, node: &'ast syn::Attribute) {
        self.inspect_attributes(std::slice::from_ref(node));
        visit::visit_attribute(self, node);
    }

    fn visit_item_mod(&mut self, node: &'ast ItemMod) {
        self.inspect_attributes(&node.attrs);
        let Some((_, items)) = &node.content else {
            visit::visit_item_mod(self, node);
            return;
        };
        self.trait_scopes.push(collect_item_traits(items));
        self.module_path.push(node.ident.to_string());
        visit::visit_item_mod(self, node);
        self.module_path.pop();
        self.trait_scopes.pop();
    }

    fn visit_block(&mut self, node: &'ast Block) {
        self.trait_scopes.push(collect_block_traits(node));
        visit::visit_block(self, node);
        self.trait_scopes.pop();
    }

    fn visit_item_impl(&mut self, node: &'ast ItemImpl) {
        self.inspect_attributes(&node.attrs);
        let previous = self.trait_impl;
        self.trait_impl = node.trait_.as_ref().is_some_and(|(_, path, _)| {
            let canonical = path_segments(path);
            trait_is_public(&canonical, &self.trait_scopes)
        });
        visit::visit_item_impl(self, node);
        self.trait_impl = previous;
    }

    fn visit_impl_item_fn(&mut self, node: &'ast ImplItemFn) {
        self.inspect_attributes(&node.attrs);
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
        self.inspect_attributes(&node.attrs);
        let previous = self.public_boundary;
        self.public_boundary = !matches!(node.vis, Visibility::Inherited);
        visit::visit_signature(self, &node.sig);
        self.public_boundary = false;
        self.visit_block(&node.block);
        self.public_boundary = previous;
    }

    fn visit_item_extern_crate(&mut self, node: &'ast ItemExternCrate) {
        self.inspect_attributes(&node.attrs);
        self.report(
            "API-ARCH-001",
            node.ident.span(),
            "extern crate",
            "extern crate is forbidden in governed source",
        );
        let path = vec![node.ident.to_string()];
        self.inspect_segments(&path, node.ident.span(), &node.ident.to_string());
    }

    fn visit_item_type(&mut self, node: &'ast syn::ItemType) {
        self.inspect_attributes(&node.attrs);
        self.report(
            "API-ARCH-006",
            node.ident.span(),
            "type alias",
            "type aliases cannot hide governed boundary types",
        );
        visit::visit_item_type(self, node);
    }

    fn visit_path(&mut self, node: &'ast Path) {
        self.inspect_path(node);
        visit::visit_path(self, node);
    }

    fn visit_expr_method_call(&mut self, node: &'ast ExprMethodCall) {
        let method = node.method.to_string();
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
            let path = path_segments(&function.path);
            if is_declared_resolver_boundary(self.unit)
                && is_declared_resolver_orchestration_path(&path)
            {
                self.report(
                    "API-ARCH-008",
                    function.path.span(),
                    "adapter-postgres transaction",
                    "delegate orchestration to an application use case",
                );
            }
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

fn use_is_noncanonical(tree: &UseTree) -> bool {
    match tree {
        UseTree::Glob(_) | UseTree::Rename(_) => true,
        UseTree::Path(path) => use_is_noncanonical(&path.tree),
        UseTree::Group(group) => group.items.iter().any(use_is_noncanonical),
        UseTree::Name(_) => false,
    }
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

fn trait_is_public(canonical: &[String], trait_scopes: &[HashMap<String, bool>]) -> bool {
    match canonical {
        [name] => trait_scopes
            .iter()
            .rev()
            .find_map(|traits| traits.get(name))
            .copied()
            .unwrap_or(true),
        _ => true,
    }
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

fn attribute_hides_cfg(attribute: &Attribute) -> bool {
    if attribute.path().is_ident("cfg") {
        return true;
    }
    if !attribute.path().is_ident("cfg_attr") {
        return false;
    }
    let Ok(meta) = attribute.meta.require_list() else {
        return true;
    };
    let Ok(arguments) =
        meta.parse_args_with(syn::punctuated::Punctuated::<Meta, syn::Token![,]>::parse_terminated)
    else {
        return true;
    };
    arguments.iter().skip(1).any(meta_hides_cfg)
}

fn meta_hides_cfg(meta: &Meta) -> bool {
    if meta.path().is_ident("cfg") {
        return true;
    }
    let Meta::List(list) = meta else {
        return false;
    };
    if !list.path.is_ident("cfg_attr") {
        return false;
    }
    list.parse_args_with(syn::punctuated::Punctuated::<Meta, syn::Token![,]>::parse_terminated)
        .map_or(true, |arguments| {
            arguments.iter().skip(1).any(meta_hides_cfg)
        })
}

fn is_declared_resolver_boundary(unit: SourceUnit<'_>) -> bool {
    unit.crate_name == "adapter-graphql" && unit.path == "crates/adapter-graphql/src/resolver.rs"
}

fn is_declared_resolver_orchestration_path(path: &[String]) -> bool {
    matches!(path, [adapter, repository, transaction]
        if adapter == "adapter_postgres"
            && repository == "Repository"
            && transaction == "begin_transaction")
}

fn imports_another_application_module(source: &[String], imported: &[String]) -> bool {
    const MODULES: [&str; 6] = [
        "identity",
        "owner",
        "dog",
        "walk_recording",
        "walk_event",
        "walk_insight",
    ];
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
