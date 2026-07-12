use std::collections::{BTreeMap, BTreeSet};
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
    let exports = build_export_index(&syntax.items);
    analyze_module(&syntax.items, &[], &[], &exports, &mut findings);

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

/// Validates Testcontainers construction with crate-target-wide module exports.
///
/// # Errors
///
/// Rejects parse failures or any source that violates the closed image policy.
pub fn validate_testcontainers_source_set(
    sources: &[(&str, &str)],
) -> Result<(), ImagePolicyError> {
    let parsed = sources
        .iter()
        .map(|(path, source)| {
            syn::parse_file(source)
                .map(|syntax| (*path, syntax))
                .map_err(|error| ImagePolicyError(format!("cannot parse {path}: {error}")))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let mut targets = BTreeMap::<String, Vec<usize>>::new();
    for (index, (path, _)) in parsed.iter().enumerate() {
        targets
            .entry(target_namespace(path))
            .or_default()
            .push(index);
    }
    for indices in targets.values() {
        let units = indices
            .iter()
            .map(|index| {
                let (path, syntax) = &parsed[*index];
                (&syntax.items[..], source_module_components(path))
            })
            .collect::<Vec<_>>();
        let exports = build_export_index_units(&units);
        for index in indices {
            let (path, syntax) = &parsed[*index];
            let mut findings = Findings::default();
            analyze_module(
                &syntax.items,
                &[],
                &source_module_components(path),
                &exports,
                &mut findings,
            );
            let factory = *path == "tools/harness-runtime/src/images.rs";
            validate_findings(path, &syntax.items, factory, &findings)?;
        }
    }
    Ok(())
}

fn validate_findings(
    path: &str,
    items: &[Item],
    factory: bool,
    findings: &Findings,
) -> Result<(), ImagePolicyError> {
    if !factory {
        return (findings.references == 0 && findings.macro_escapes == 0)
            .then_some(())
            .ok_or_else(|| {
                ImagePolicyError(format!(
                    "Testcontainers image constructor reference outside approved factory: {path}"
                ))
            });
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
    validate_constants(items)
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

type ExportIndex = BTreeSet<Vec<String>>;

fn analyze_module(
    items: &[Item],
    parents: &[ScopeSymbols],
    module_path: &[String],
    exports: &ExportIndex,
    findings: &mut Findings,
) {
    let symbols = resolve_symbols(
        items,
        &ScopeSymbols::default(),
        parents,
        module_path,
        exports,
    );
    let mut visitor = ScopeVisitor {
        symbols: &symbols,
        parents,
        module_path,
        exports,
        findings,
    };
    for item in items {
        match item {
            Item::Mod(module) => {
                if let Some((_, nested)) = &module.content {
                    let mut nested_parents = parents.to_vec();
                    nested_parents.push(symbols.clone());
                    let mut nested_path = module_path.to_vec();
                    nested_path.push(module.ident.to_string());
                    analyze_module(
                        nested,
                        &nested_parents,
                        &nested_path,
                        exports,
                        visitor.findings,
                    );
                }
            }
            _ => visitor.visit_item(item),
        }
    }
}

fn resolve_symbols(
    items: &[Item],
    base: &ScopeSymbols,
    parents: &[ScopeSymbols],
    module_path: &[String],
    exports: &ExportIndex,
) -> ScopeSymbols {
    let mut symbols = base.clone();
    let mut bindings = Vec::new();
    for item in items {
        match item {
            Item::Use(item_use) => collect_use_bindings(&item_use.tree, &[], &mut bindings),
            Item::ExternCrate(item_extern) if item_extern.ident == "testcontainers" => {
                let name = item_extern.rename.as_ref().map_or_else(
                    || item_extern.ident.to_string(),
                    |(_, rename)| rename.to_string(),
                );
                symbols.modules.insert(name);
            }
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
            if canonical_type_path(path, &symbols, parents, module_path, exports) {
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

fn build_export_index(items: &[Item]) -> ExportIndex {
    build_export_index_units(&[(items, Vec::new())])
}

fn build_export_index_units(units: &[(&[Item], Vec<String>)]) -> ExportIndex {
    let mut exports = ExportIndex::new();
    loop {
        let previous = exports.len();
        for (items, module_path) in units {
            collect_module_exports(items, module_path, &mut exports);
        }
        if exports.len() == previous {
            return exports;
        }
    }
}

fn collect_module_exports(items: &[Item], module_path: &[String], exports: &mut ExportIndex) {
    for item in items {
        match item {
            Item::Use(item_use) if !matches!(item_use.vis, syn::Visibility::Inherited) => {
                let mut bindings = Vec::new();
                collect_use_bindings(&item_use.tree, &[], &mut bindings);
                for (name, source) in bindings {
                    let segments = source
                        .segments
                        .iter()
                        .map(|part| part.ident.to_string())
                        .collect::<Vec<_>>();
                    if segments == ["testcontainers", "GenericImage"]
                        || exports.contains(&absolute_path(&segments, module_path))
                    {
                        let mut exported = module_path.to_vec();
                        exported.push(name);
                        exports.insert(exported);
                    }
                }
                let mut globs = Vec::new();
                collect_glob_paths(&item_use.tree, &[], &mut globs);
                for source in globs {
                    let mut wildcard = absolute_path(&source, module_path);
                    wildcard.push("*".to_owned());
                    if source == ["testcontainers"] || exports.contains(&wildcard) {
                        let mut exported = module_path.to_vec();
                        exported.push("*".to_owned());
                        exports.insert(exported);
                    }
                }
            }
            Item::Mod(module) => {
                if let Some((_, nested)) = &module.content {
                    let mut nested_path = module_path.to_vec();
                    nested_path.push(module.ident.to_string());
                    collect_module_exports(nested, &nested_path, exports);
                }
            }
            _ => {}
        }
    }
}

fn absolute_path(segments: &[String], module_path: &[String]) -> Vec<String> {
    if segments.first().is_some_and(|part| part == "crate") {
        return segments[1..].to_vec();
    }
    if segments.first().is_some_and(|part| part == "self") {
        return module_path
            .iter()
            .cloned()
            .chain(segments[1..].iter().cloned())
            .collect();
    }
    let supers = segments.iter().take_while(|part| *part == "super").count();
    if supers > 0 {
        return module_path[..module_path.len().saturating_sub(supers)]
            .iter()
            .cloned()
            .chain(segments[supers..].iter().cloned())
            .collect();
    }
    module_path
        .iter()
        .cloned()
        .chain(segments.iter().cloned())
        .collect()
}

fn target_namespace(path: &str) -> String {
    let crate_root = ["/src/", "/tests/", "/examples/", "/benches/"]
        .iter()
        .find_map(|marker| path.split_once(marker).map(|(root, _)| root))
        .unwrap_or(path);
    for (directory, kind) in [
        ("/tests/", "test"),
        ("/examples/", "example"),
        ("/benches/", "bench"),
    ] {
        if let Some(relative) = path.split(directory).nth(1) {
            let target = relative
                .split('/')
                .next()
                .unwrap_or_default()
                .trim_end_matches(".rs");
            return format!("{crate_root}|{kind}:{target}");
        }
    }
    if let Some(relative) = path.split("/src/bin/").nth(1) {
        let target = relative
            .split('/')
            .next()
            .unwrap_or_default()
            .trim_end_matches(".rs");
        return format!("{crate_root}|bin:{target}");
    }
    if path.ends_with("/src/main.rs") {
        return format!("{crate_root}|bin:main");
    }
    format!("{crate_root}|lib")
}

fn source_module_components(path: &str) -> Vec<String> {
    let Some(relative) = path.split("/src/").nth(1) else {
        return Vec::new();
    };
    if let Some(binary) = relative.strip_prefix("bin/") {
        let mut parts = binary.split('/').map(str::to_owned).collect::<Vec<_>>();
        if parts.len() == 1 {
            return Vec::new();
        }
        parts.remove(0);
        let Some(file) = parts.pop() else {
            return parts;
        };
        if !matches!(file.as_str(), "main.rs" | "mod.rs") {
            parts.push(file.trim_end_matches(".rs").to_owned());
        }
        return parts;
    }
    let mut parts = relative.split('/').map(str::to_owned).collect::<Vec<_>>();
    let Some(file) = parts.pop() else {
        return parts;
    };
    if !matches!(file.as_str(), "lib.rs" | "main.rs" | "mod.rs") {
        parts.push(file.trim_end_matches(".rs").to_owned());
    }
    parts
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

fn collect_glob_paths(tree: &UseTree, prefix: &[String], globs: &mut Vec<Vec<String>>) {
    match tree {
        UseTree::Path(path) => {
            let mut nested = prefix.to_vec();
            nested.push(path.ident.to_string());
            collect_glob_paths(&path.tree, &nested, globs);
        }
        UseTree::Group(group) => {
            for item in &group.items {
                collect_glob_paths(item, prefix, globs);
            }
        }
        UseTree::Glob(_) => globs.push(prefix.to_vec()),
        UseTree::Name(_) | UseTree::Rename(_) => {}
    }
}

fn path_from_segments(segments: &[String]) -> syn::Path {
    syn::parse_str(&segments.join("::")).expect("use path segments are valid Rust identifiers")
}

fn canonical_type_path(
    path: &syn::Path,
    symbols: &ScopeSymbols,
    parents: &[ScopeSymbols],
    module_path: &[String],
    exports: &ExportIndex,
) -> bool {
    let segments = path
        .segments
        .iter()
        .map(|part| part.ident.to_string())
        .collect::<Vec<_>>();
    let (scope, rest) = qualified_scope(&segments, symbols, parents);
    let explicitly_qualified = segments.len() > 1
        && !(segments.len() == 2 && segments.first().is_some_and(|part| part == "self"));
    (explicitly_qualified && exports.contains(&absolute_path(&segments, module_path)))
        || rest == ["testcontainers", "GenericImage"]
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
    module_path: &'a [String],
    exports: &'a ExportIndex,
    findings: &'a mut Findings,
}

impl Visit<'_> for ScopeVisitor<'_> {
    fn visit_item_use(&mut self, item: &syn::ItemUse) {
        let mut globs = Vec::new();
        collect_glob_paths(&item.tree, &[], &mut globs);
        if globs.into_iter().any(|source| {
            let path = path_from_segments(&source);
            let mut wildcard = absolute_path(&source, self.module_path);
            wildcard.push("*".to_owned());
            canonical_module_path(&path, self.symbols, self.parents)
                || self.exports.contains(&wildcard)
        }) {
            self.findings.macro_escapes += 1;
        }
    }

    fn visit_block(&mut self, block: &syn::Block) {
        let items = block
            .stmts
            .iter()
            .filter_map(|statement| match statement {
                syn::Stmt::Item(item) => Some(item.clone()),
                _ => None,
            })
            .collect::<Vec<_>>();
        let symbols = resolve_symbols(
            &items,
            self.symbols,
            self.parents,
            self.module_path,
            self.exports,
        );
        let mut visitor = ScopeVisitor {
            symbols: &symbols,
            parents: self.parents,
            module_path: self.module_path,
            exports: self.exports,
            findings: self.findings,
        };
        for statement in &block.stmts {
            visitor.visit_stmt(statement);
        }
    }

    fn visit_expr_path(&mut self, path: &ExprPath) {
        if constructor_path(
            &path.path,
            self.symbols,
            self.parents,
            self.module_path,
            self.exports,
        ) {
            self.findings.references += 1;
        }
        syn::visit::visit_expr_path(self, path);
    }

    fn visit_expr_call(&mut self, call: &ExprCall) {
        if let Expr::Path(function) = call.func.as_ref()
            && constructor_path(
                &function.path,
                self.symbols,
                self.parents,
                self.module_path,
                self.exports,
            )
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

fn constructor_path(
    path: &syn::Path,
    symbols: &ScopeSymbols,
    parents: &[ScopeSymbols],
    module_path: &[String],
    exports: &ExportIndex,
) -> bool {
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
            module_path,
            exports,
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
