use std::collections::BTreeSet;
use std::error::Error;
use std::fmt::{self, Display, Formatter};

use proc_macro2::{TokenStream, TokenTree};
use syn::visit::Visit;
use syn::{Expr, ExprCall, ExprPath, Item, ItemConst, ItemMacro, Type, UseTree};

#[derive(Debug)]
pub struct ImagePolicyError(String);

impl Display for ImagePolicyError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}
impl Error for ImagePolicyError {}

/// Validates closed Testcontainers construction in one parsed Rust source.
///
/// # Errors
///
/// Rejects parse failures, references outside the approved factory, dynamic
/// factory arguments, duplicate constructors, macro escapes, and bad digests.
pub fn validate_testcontainers_source(
    path: &str,
    source: &str,
    factory: bool,
) -> Result<(), ImagePolicyError> {
    let syntax = syn::parse_file(source)
        .map_err(|error| ImagePolicyError(format!("cannot parse {path}: {error}")))?;
    let mut findings = Findings::default();
    analyze_scope(&syntax.items, &BTreeSet::new(), &mut findings);

    if !factory {
        if findings.references == 0 && findings.macro_escapes == 0 {
            return Ok(());
        }
        return Err(ImagePolicyError(format!(
            "Testcontainers image constructor reference outside approved factory: {path}"
        )));
    }
    if findings.references != 1
        || findings.calls.len() != 1
        || findings.macro_escapes != 0
        || findings.calls[0] != ("POSTGRES_NAME".to_owned(), "POSTGRES_TAG".to_owned())
    {
        return Err(ImagePolicyError(
            "approved image factory must contain one direct closed constructor and no macro escape"
                .to_owned(),
        ));
    }
    validate_constants(&syntax.items)
}

#[derive(Default)]
struct Findings {
    references: usize,
    calls: Vec<(String, String)>,
    macro_escapes: usize,
}

fn analyze_scope(items: &[Item], inherited: &BTreeSet<String>, findings: &mut Findings) {
    let aliases = resolve_aliases(items, inherited);
    let mut visitor = ScopeVisitor {
        aliases: &aliases,
        findings,
    };
    for item in items {
        match item {
            Item::Mod(module) => {
                if let Some((_, nested)) = &module.content {
                    analyze_scope(nested, inherited, visitor.findings);
                }
            }
            _ => visitor.visit_item(item),
        }
    }
}

fn resolve_aliases(items: &[Item], inherited: &BTreeSet<String>) -> BTreeSet<String> {
    let mut aliases = inherited.clone();
    for item in items {
        if let Item::Use(item_use) = item {
            collect_canonical_use(&item_use.tree, false, &mut aliases);
        }
    }
    loop {
        let previous = aliases.len();
        for item in items {
            if let Item::Type(item_type) = item
                && type_is_canonical(&item_type.ty, &aliases)
            {
                aliases.insert(item_type.ident.to_string());
            }
        }
        if aliases.len() == previous {
            break;
        }
    }
    for item in items {
        match item {
            Item::Struct(value) => {
                aliases.remove(&value.ident.to_string());
            }
            Item::Enum(value) => {
                aliases.remove(&value.ident.to_string());
            }
            _ => {}
        }
    }
    aliases
}

fn collect_canonical_use(
    tree: &UseTree,
    under_testcontainers: bool,
    aliases: &mut BTreeSet<String>,
) {
    match tree {
        UseTree::Path(path) => collect_canonical_use(
            &path.tree,
            under_testcontainers || path.ident == "testcontainers",
            aliases,
        ),
        UseTree::Name(name) if under_testcontainers && name.ident == "GenericImage" => {
            aliases.insert(name.ident.to_string());
        }
        UseTree::Rename(rename) if under_testcontainers && rename.ident == "GenericImage" => {
            aliases.insert(rename.rename.to_string());
        }
        UseTree::Group(group) => {
            for item in &group.items {
                collect_canonical_use(item, under_testcontainers, aliases);
            }
        }
        _ => {}
    }
}

fn type_is_canonical(value: &Type, aliases: &BTreeSet<String>) -> bool {
    let Type::Path(path) = value else {
        return false;
    };
    let segments = path
        .path
        .segments
        .iter()
        .map(|part| part.ident.to_string())
        .collect::<Vec<_>>();
    segments.ends_with(&["testcontainers".to_owned(), "GenericImage".to_owned()])
        || segments.last().is_some_and(|name| aliases.contains(name))
}

struct ScopeVisitor<'a> {
    aliases: &'a BTreeSet<String>,
    findings: &'a mut Findings,
}

impl Visit<'_> for ScopeVisitor<'_> {
    fn visit_block(&mut self, block: &syn::Block) {
        let items = block
            .stmts
            .iter()
            .filter_map(|statement| match statement {
                syn::Stmt::Item(item) => Some(item.clone()),
                _ => None,
            })
            .collect::<Vec<_>>();
        let aliases = resolve_aliases(&items, self.aliases);
        let mut visitor = ScopeVisitor {
            aliases: &aliases,
            findings: self.findings,
        };
        for statement in &block.stmts {
            visitor.visit_stmt(statement);
        }
    }

    fn visit_expr_path(&mut self, path: &ExprPath) {
        if constructor_path(&path.path, self.aliases) {
            self.findings.references += 1;
        }
        syn::visit::visit_expr_path(self, path);
    }

    fn visit_expr_call(&mut self, call: &ExprCall) {
        if let Expr::Path(function) = call.func.as_ref()
            && constructor_path(&function.path, self.aliases)
        {
            let values = call.args.iter().map(path_ident).collect::<Option<Vec<_>>>();
            self.findings.calls.push(match values {
                Some(values) if values.len() == 2 => (values[0].clone(), values[1].clone()),
                _ => (String::new(), String::new()),
            });
        }
        syn::visit::visit_expr_call(self, call);
    }

    fn visit_item_macro(&mut self, item: &ItemMacro) {
        if macro_constructor_tokens(&item.mac.tokens, self.aliases) {
            self.findings.macro_escapes += 1;
        }
    }

    fn visit_expr_macro(&mut self, expression: &syn::ExprMacro) {
        if macro_constructor_tokens(&expression.mac.tokens, self.aliases) {
            self.findings.macro_escapes += 1;
        }
    }

    fn visit_item_mod(&mut self, _module: &syn::ItemMod) {}
}

fn constructor_path(path: &syn::Path, aliases: &BTreeSet<String>) -> bool {
    let segments = path
        .segments
        .iter()
        .map(|part| part.ident.to_string())
        .collect::<Vec<_>>();
    segments.len() >= 2
        && segments.last().is_some_and(|name| name == "new")
        && (aliases.contains(&segments[segments.len() - 2])
            || segments.ends_with(&[
                "testcontainers".to_owned(),
                "GenericImage".to_owned(),
                "new".to_owned(),
            ]))
}

fn macro_constructor_tokens(tokens: &TokenStream, aliases: &BTreeSet<String>) -> bool {
    let mut identifiers = Vec::new();
    collect_token_idents(tokens, &mut identifiers);
    identifiers
        .windows(2)
        .any(|pair| pair[1] == "new" && aliases.contains(&pair[0]))
        || identifiers
            .windows(3)
            .any(|pair| pair == ["testcontainers", "GenericImage", "new"])
}

fn collect_token_idents(tokens: &TokenStream, output: &mut Vec<String>) {
    for token in tokens.clone() {
        match token {
            TokenTree::Ident(value) => output.push(value.to_string()),
            TokenTree::Group(group) => collect_token_idents(&group.stream(), output),
            TokenTree::Literal(_) | TokenTree::Punct(_) => {}
        }
    }
}

fn validate_constants(items: &[Item]) -> Result<(), ImagePolicyError> {
    let mut name = None;
    let mut tag = None;
    for item in items {
        if let Item::Const(value) = item {
            read_constant(value, &mut name, &mut tag);
        }
    }
    let name = name.ok_or_else(|| ImagePolicyError("missing closed image name".to_owned()))?;
    let tag = tag.ok_or_else(|| ImagePolicyError("missing closed image tag".to_owned()))?;
    if name.is_empty() || !valid_digest_tag(&tag) {
        return Err(ImagePolicyError(
            "approved image reference is not digest pinned".to_owned(),
        ));
    }
    Ok(())
}

fn read_constant(item: &ItemConst, name: &mut Option<String>, tag: &mut Option<String>) {
    let Expr::Lit(value) = item.expr.as_ref() else {
        return;
    };
    let syn::Lit::Str(value) = &value.lit else {
        return;
    };
    match item.ident.to_string().as_str() {
        "POSTGRES_NAME" => *name = Some(value.value()),
        "POSTGRES_TAG" => *tag = Some(value.value()),
        _ => {}
    }
}

fn valid_digest_tag(tag: &str) -> bool {
    tag.rsplit_once("@sha256:").is_some_and(|(prefix, digest)| {
        !prefix.is_empty()
            && digest.len() == 64
            && digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    })
}

fn path_ident(expr: &Expr) -> Option<String> {
    let Expr::Path(path) = expr else { return None };
    (path.path.segments.len() == 1).then(|| path.path.segments[0].ident.to_string())
}
