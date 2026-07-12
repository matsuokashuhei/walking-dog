use std::collections::{HashMap, HashSet};
use std::error::Error;
use std::fmt::{self, Display, Formatter};

use proc_macro2::{Span, TokenStream, TokenTree};
use syn::spanned::Spanned;
use syn::visit::{self, Visit};
use syn::{
    ExprCall, ExprLit, ExprMacro, ExprMethodCall, Item, ItemExternCrate, ItemUse, Lit, Macro, Path,
    UseTree, Visibility,
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
    let file = syn::parse_file(unit.source).map_err(|error| ValidationError::Parse {
        path: unit.path.to_owned(),
        message: error.to_string(),
    })?;
    let aliases = collect_aliases(&file);
    let mut analyzer = Analyzer {
        unit,
        aliases,
        diagnostics: Vec::new(),
        seen: HashSet::new(),
        public_boundary: false,
    };
    analyzer.visit_file(&file);
    Ok(analyzer.diagnostics)
}

struct Analyzer<'a> {
    unit: SourceUnit<'a>,
    aliases: HashMap<String, Vec<String>>,
    diagnostics: Vec<Diagnostic>,
    seen: HashSet<(&'static str, usize)>,
    public_boundary: bool,
}

impl Analyzer<'_> {
    fn report(
        &mut self,
        rule_id: &'static str,
        span: Span,
        symbol: impl Into<String>,
        guidance: &'static str,
    ) {
        let line = span.start().line.max(1);
        if self.seen.insert((rule_id, line)) {
            self.diagnostics.push(Diagnostic {
                rule_id,
                path: self.unit.path.to_owned(),
                line,
                symbol: symbol.into(),
                guidance,
            });
        }
    }

    fn inspect_path(&mut self, path: &Path) {
        let raw = path_segments(path);
        let canonical = canonicalize(&raw, &self.aliases);
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
        if self.unit.crate_name != "adapter-graphql"
            && (root == "async_graphql"
                || segments.iter().any(|part| {
                    matches!(
                        part.as_str(),
                        "SimpleObject" | "InputObject" | "Context" | "Upload"
                    )
                }))
        {
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
    }

    fn inspect_macro(&mut self, node: &Macro) {
        let path = canonicalize(&path_segments(&node.path), &self.aliases);
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
            && ((path.first().is_some_and(|part| part == "sqlx") && name.starts_with("query"))
                || tokens_contain_sql(&node.tokens))
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
            let canonical = canonicalize(&leaf.path, &self.aliases);
            let previous = self.public_boundary;
            self.public_boundary = public;
            self.inspect_segments(&canonical, leaf.span, leaf.name.as_deref().unwrap_or("use"));
            self.public_boundary = previous;
            if self.unit.crate_name == "application"
                && imports_another_application_module(self.unit.path, &canonical)
            {
                self.report(
                    "API-ARCH-010",
                    leaf.span,
                    leaf.name.unwrap_or_else(|| "use".to_owned()),
                    "share domain values or compose modules from api-bootstrap",
                );
            }
        }
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
        visit::visit_expr_method_call(self, node);
    }

    fn visit_expr_call(&mut self, node: &'ast ExprCall) {
        if let syn::Expr::Path(function) = node.func.as_ref() {
            let path = canonicalize(&path_segments(&function.path), &self.aliases);
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
            if !raw_sql_location_is_allowed(self.unit)
                && (path.starts_with(&["sqlx".to_owned(), "query".to_owned()])
                    || path
                        .windows(2)
                        .any(|parts| parts == ["Statement", "from_string"]))
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

    fn visit_expr_lit(&mut self, node: &'ast ExprLit) {
        if !raw_sql_location_is_allowed(self.unit) && lit_contains_sql(&node.lit) {
            self.report(
                "API-ARCH-011",
                node.lit.span(),
                "raw SQL",
                "keep raw SQL in classified adapter-postgres query or migration modules",
            );
        }
        visit::visit_expr_lit(self, node);
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

fn collect_aliases(file: &syn::File) -> HashMap<String, Vec<String>> {
    let mut aliases = HashMap::new();
    for item in &file.items {
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
            _ => {}
        }
    }
    aliases
}

fn canonicalize(path: &[String], aliases: &HashMap<String, Vec<String>>) -> Vec<String> {
    let mut result = path.to_vec();
    let mut expanded = HashSet::new();
    while let Some(first) = result.first().cloned() {
        if !expanded.insert(first.clone()) {
            break;
        }
        let Some(replacement) = aliases.get(&first) else {
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

fn tokens_contain_sql(tokens: &TokenStream) -> bool {
    let mut words = Vec::new();
    token_words(tokens, &mut words);
    words
        .iter()
        .any(|(_, word)| string_contains_sql(word.trim_matches('"').trim_matches('#')))
}

fn lit_contains_sql(lit: &Lit) -> bool {
    matches!(lit, Lit::Str(value) if string_contains_sql(&value.value()))
}

fn string_contains_sql(value: &str) -> bool {
    let lowercase = value.trim_start().to_ascii_lowercase();
    lowercase.starts_with("select ") || lowercase.starts_with("insert into ")
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
    let current = path
        .split("/src/")
        .nth(1)
        .and_then(|relative| relative.split('/').next());
    let module = match imported {
        [root, module, ..] if root == "crate" || root == "super" => Some(module.as_str()),
        _ => None,
    };
    module.is_some_and(|module| MODULES.contains(&module) && Some(module) != current)
}

fn raw_sql_location_is_allowed(unit: SourceUnit<'_>) -> bool {
    unit.crate_name == "adapter-postgres"
        && ["/query/", "/queries/", "/migrations/"]
            .iter()
            .any(|part| unit.path.contains(part))
}
