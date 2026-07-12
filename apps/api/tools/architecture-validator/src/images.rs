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

#[derive(Clone, Default)]
struct ScopeSymbols {
    types: BTreeSet<String>,
    modules: BTreeSet<String>,
}

fn analyze_scope(items: &[Item], _inherited: &BTreeSet<String>, findings: &mut Findings) {
    analyze_module(items, &[], findings);
}

fn analyze_module(items: &[Item], parents: &[ScopeSymbols], findings: &mut Findings) {
    let symbols = resolve_symbols(items, &ScopeSymbols::default(), parents);
    let mut visitor = ScopeVisitor {
        symbols: &symbols,
        parents,
        findings,
    };
    for item in items {
        match item {
            Item::Mod(module) => {
                if let Some((_, nested)) = &module.content {
                    let mut nested_parents = parents.to_vec();
                    nested_parents.push(symbols.clone());
                    analyze_module(nested, &nested_parents, visitor.findings);
                }
            }
            _ => visitor.visit_item(item),
        }
    }
}

fn resolve_symbols(items: &[Item], base: &ScopeSymbols, parents: &[ScopeSymbols]) -> ScopeSymbols {
    let mut symbols = base.clone();
    let mut bindings = Vec::new();
    for item in items {
        match item {
            Item::Use(item_use) => collect_use_bindings(&item_use.tree, &[], &mut bindings),
            Item::Type(item_type) => {
                let Type::Path(path) = item_type.ty.as_ref() else {
                    symbols.types.remove(&item_type.ident.to_string());
                    continue;
                };
                bindings.push((item_type.ident.to_string(), path.path.clone()));
            }
            Item::Struct(value) => {
                symbols.types.remove(&value.ident.to_string());
            }
            Item::Enum(value) => {
                symbols.types.remove(&value.ident.to_string());
            }
            Item::Union(value) => {
                symbols.types.remove(&value.ident.to_string());
            }
            _ => {}
        }
    }
    for (name, _) in &bindings {
        symbols.types.remove(name);
        symbols.modules.remove(name);
    }
    loop {
        let previous = symbols.types.len() + symbols.modules.len();
        for (name, path) in &bindings {
            if canonical_type_path(path, &symbols, parents) {
                symbols.types.insert(name.clone());
            } else if canonical_module_path(path, &symbols, parents) {
                symbols.modules.insert(name.clone());
            }
        }
        if symbols.types.len() + symbols.modules.len() == previous {
            break;
        }
    }
    symbols
}

fn collect_use_bindings(
    tree: &UseTree,
    prefix: &[String],
    bindings: &mut Vec<(String, syn::Path)>,
) {
    match tree {
        UseTree::Path(path) => {
            let mut nested = prefix.to_vec();
            nested.push(path.ident.to_string());
            collect_use_bindings(&path.tree, &nested, bindings);
        }
        UseTree::Name(name) => {
            let mut source = prefix.to_vec();
            source.push(name.ident.to_string());
            bindings.push((name.ident.to_string(), path_from_segments(&source)));
        }
        UseTree::Rename(rename) => {
            let mut source = prefix.to_vec();
            source.push(rename.ident.to_string());
            bindings.push((rename.rename.to_string(), path_from_segments(&source)));
        }
        UseTree::Group(group) => {
            for item in &group.items {
                collect_use_bindings(item, prefix, bindings);
            }
        }
        UseTree::Glob(_) => {}
    }
}

fn path_from_segments(segments: &[String]) -> syn::Path {
    syn::parse_str(&segments.join("::")).expect("use path segments are valid Rust identifiers")
}

fn canonical_type_path(path: &syn::Path, symbols: &ScopeSymbols, parents: &[ScopeSymbols]) -> bool {
    let segments = path
        .segments
        .iter()
        .map(|part| part.ident.to_string())
        .collect::<Vec<_>>();
    let (scope, rest) = qualified_scope(&segments, symbols, parents);
    rest == ["testcontainers", "GenericImage"]
        || (rest.len() == 2 && scope.modules.contains(&rest[0]) && rest[1] == "GenericImage")
        || (rest.len() == 1 && scope.types.contains(&rest[0]))
}

fn canonical_module_path(
    path: &syn::Path,
    symbols: &ScopeSymbols,
    parents: &[ScopeSymbols],
) -> bool {
    let segments = path
        .segments
        .iter()
        .map(|part| part.ident.to_string())
        .collect::<Vec<_>>();
    let (scope, rest) = qualified_scope(&segments, symbols, parents);
    rest == ["testcontainers"] || (rest.len() == 1 && scope.modules.contains(&rest[0]))
}

fn qualified_scope<'a>(
    segments: &'a [String],
    current: &'a ScopeSymbols,
    parents: &'a [ScopeSymbols],
) -> (&'a ScopeSymbols, &'a [String]) {
    if segments.first().is_some_and(|part| part == "crate") {
        return (parents.first().unwrap_or(current), &segments[1..]);
    }
    if segments.first().is_some_and(|part| part == "self") {
        return (current, &segments[1..]);
    }
    let supers = segments.iter().take_while(|part| *part == "super").count();
    if supers > 0 {
        let index = parents.len().saturating_sub(supers);
        return (parents.get(index).unwrap_or(current), &segments[supers..]);
    }
    (current, segments)
}

struct ScopeVisitor<'a> {
    symbols: &'a ScopeSymbols,
    parents: &'a [ScopeSymbols],
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
        let symbols = resolve_symbols(&items, self.symbols, self.parents);
        let mut visitor = ScopeVisitor {
            symbols: &symbols,
            parents: self.parents,
            findings: self.findings,
        };
        for statement in &block.stmts {
            visitor.visit_stmt(statement);
        }
    }

    fn visit_expr_path(&mut self, path: &ExprPath) {
        if constructor_path(&path.path, self.symbols, self.parents) {
            self.findings.references += 1;
        }
        syn::visit::visit_expr_path(self, path);
    }

    fn visit_expr_call(&mut self, call: &ExprCall) {
        if let Expr::Path(function) = call.func.as_ref()
            && constructor_path(&function.path, self.symbols, self.parents)
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
        if unsafe_macro_definition(&item.mac.tokens)
            || macro_constructor_tokens(&item.mac.tokens, self.symbols)
        {
            self.findings.macro_escapes += 1;
        }
    }

    fn visit_expr_macro(&mut self, expression: &syn::ExprMacro) {
        if macro_constructor_tokens(&expression.mac.tokens, self.symbols) {
            self.findings.macro_escapes += 1;
        }
    }

    fn visit_item_mod(&mut self, _module: &syn::ItemMod) {}
}

fn constructor_path(path: &syn::Path, symbols: &ScopeSymbols, parents: &[ScopeSymbols]) -> bool {
    let segments = path
        .segments
        .iter()
        .map(|part| part.ident.to_string())
        .collect::<Vec<_>>();
    segments.last().is_some_and(|name| name == "new")
        && canonical_type_path(
            &syn::parse_str(&segments[..segments.len() - 1].join("::"))
                .expect("expression path is valid"),
            symbols,
            parents,
        )
}

fn unsafe_macro_definition(tokens: &TokenStream) -> bool {
    let mut identifiers = Vec::new();
    collect_token_idents(tokens, &mut identifiers);
    identifiers
        .iter()
        .any(|value| value == "path" || value == "ty")
        && identifiers.iter().any(|value| value == "new")
}

fn macro_constructor_tokens(tokens: &TokenStream, symbols: &ScopeSymbols) -> bool {
    let mut identifiers = Vec::new();
    collect_token_idents(tokens, &mut identifiers);
    identifiers
        .windows(2)
        .any(|pair| pair[1] == "new" && symbols.types.contains(&pair[0]))
        || identifiers
            .windows(3)
            .any(|pair| pair == ["testcontainers", "GenericImage", "new"])
        || identifiers.iter().any(|value| value == "testcontainers")
        || identifiers
            .iter()
            .any(|value| symbols.types.contains(value))
        || identifiers
            .iter()
            .any(|value| symbols.modules.contains(value))
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
