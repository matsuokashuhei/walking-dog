use std::collections::BTreeSet;
use std::error::Error;
use std::fmt::{self, Display, Formatter};

use syn::visit::Visit;
use syn::{Expr, ExprCall, ItemConst, ItemType, ItemUse, Type, UseTree};

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
/// Rejects parse failures, constructors outside the approved factory, dynamic
/// factory arguments, duplicate constructors, and malformed image digests.
pub fn validate_testcontainers_source(
    path: &str,
    source: &str,
    factory: bool,
) -> Result<(), ImagePolicyError> {
    let syntax = syn::parse_file(source)
        .map_err(|error| ImagePolicyError(format!("cannot parse {path}: {error}")))?;
    let mut aliases = AliasCollector {
        aliases: BTreeSet::from(["GenericImage".to_owned()]),
    };
    aliases.visit_file(&syntax);
    let mut calls = CallCollector {
        aliases: &aliases.aliases,
        calls: Vec::new(),
    };
    calls.visit_file(&syntax);
    if !factory {
        if calls.calls.is_empty() {
            return Ok(());
        }
        return Err(ImagePolicyError(format!(
            "direct Testcontainers image construction outside approved factory: {path}"
        )));
    }
    if calls.calls.len() != 1
        || calls.calls[0] != ("POSTGRES_NAME".to_owned(), "POSTGRES_TAG".to_owned())
    {
        return Err(ImagePolicyError(
            "approved image factory must contain exactly one closed constructor".to_owned(),
        ));
    }
    let mut name = None;
    let mut tag = None;
    for item in &syntax.items {
        if let syn::Item::Const(value) = item {
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

struct AliasCollector {
    aliases: BTreeSet<String>,
}
impl<'ast> Visit<'ast> for AliasCollector {
    fn visit_item_use(&mut self, item: &'ast ItemUse) {
        collect_use(&item.tree, &mut self.aliases);
        syn::visit::visit_item_use(self, item);
    }
    fn visit_item_type(&mut self, item: &'ast ItemType) {
        if type_is_generic_image(&item.ty, &self.aliases) {
            self.aliases.insert(item.ident.to_string());
        }
        syn::visit::visit_item_type(self, item);
    }
}

fn collect_use(tree: &UseTree, aliases: &mut BTreeSet<String>) {
    match tree {
        UseTree::Name(name) if name.ident == "GenericImage" => {
            aliases.insert("GenericImage".to_owned());
        }
        UseTree::Rename(rename) if rename.ident == "GenericImage" => {
            aliases.insert(rename.rename.to_string());
        }
        UseTree::Path(path) => collect_use(&path.tree, aliases),
        UseTree::Group(group) => {
            for item in &group.items {
                collect_use(item, aliases);
            }
        }
        _ => {}
    }
}

fn type_is_generic_image(value: &Type, aliases: &BTreeSet<String>) -> bool {
    let Type::Path(path) = value else {
        return false;
    };
    path.path
        .segments
        .last()
        .is_some_and(|segment| aliases.contains(&segment.ident.to_string()))
}

struct CallCollector<'a> {
    aliases: &'a BTreeSet<String>,
    calls: Vec<(String, String)>,
}
impl<'ast> Visit<'ast> for CallCollector<'_> {
    fn visit_expr_call(&mut self, call: &'ast ExprCall) {
        if let Expr::Path(function) = call.func.as_ref() {
            let segments = function
                .path
                .segments
                .iter()
                .map(|segment| segment.ident.to_string())
                .collect::<Vec<_>>();
            if segments.len() >= 2
                && segments.last().is_some_and(|last| last == "new")
                && self.aliases.contains(&segments[segments.len() - 2])
            {
                let values = call.args.iter().map(path_ident).collect::<Option<Vec<_>>>();
                if let Some(values) = values
                    && values.len() == 2
                {
                    self.calls.push((values[0].clone(), values[1].clone()));
                } else {
                    self.calls.push((String::new(), String::new()));
                }
            }
        }
        syn::visit::visit_expr_call(self, call);
    }
}

fn path_ident(expr: &Expr) -> Option<String> {
    let Expr::Path(path) = expr else {
        return None;
    };
    (path.path.segments.len() == 1).then(|| path.path.segments[0].ident.to_string())
}
