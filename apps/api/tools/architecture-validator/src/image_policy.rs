use std::fs;
use std::path::Path;

use syn::visit::Visit;

/// Validates the closed Testcontainers manifest and generated-source surface.
///
/// # Errors
/// Returns a fail-closed error for discovery, I/O, TOML, Rust parsing, or policy violations.
pub fn validate(root: &Path) -> Result<(), String> {
    for manifest in walk(root, "Cargo.toml")? {
        let relative = manifest
            .strip_prefix(root)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();
        let body = fs::read_to_string(&manifest).map_err(|error| error.to_string())?;
        let value: toml::Value = toml::from_str(&body).map_err(|error| error.to_string())?;
        if value
            .get("package")
            .and_then(|value| value.get("build"))
            .is_some()
            || manifest
                .parent()
                .is_some_and(|directory| directory.join("build.rs").exists())
        {
            return Err(format!(
                "{relative}: build scripts are forbidden for test image policy"
            ));
        }
        validate_manifest(&relative, &value)?;
    }
    for source in walk(root, ".rs")? {
        validate_source(root, &source)?;
    }
    let generated = root.join("tools/harness-runtime/src/generated_postgres.rs");
    let body = fs::read_to_string(&generated).map_err(|error| error.to_string())?;
    if !body.starts_with("// @generated image-catalog:v1") {
        return Err(
            "generated Postgres surface is missing marker or exposes testcontainers".into(),
        );
    }
    let syntax = syn::parse_file(&body).map_err(|error| error.to_string())?;
    let mut exposure = PublicExposure { forbidden: false };
    exposure.visit_file(&syntax);
    if exposure.forbidden {
        return Err("generated Postgres surface exposes testcontainers".into());
    }
    Ok(())
}

fn validate_manifest(path: &str, value: &toml::Value) -> Result<(), String> {
    for table in ["dependencies", "dev-dependencies", "build-dependencies"] {
        if let Some(entries) = value.get(table).and_then(toml::Value::as_table) {
            for (key, dependency) in entries {
                let package = dependency
                    .as_table()
                    .and_then(|entry| entry.get("package"))
                    .and_then(toml::Value::as_str);
                if (key == "testcontainers" || package == Some("testcontainers"))
                    && (path != "tools/harness-runtime/Cargo.toml"
                        || table != "dependencies"
                        || key != "testcontainers"
                        || package.is_some())
                {
                    return Err(format!(
                        "{path}: testcontainers is allowed only as canonical harness-runtime dependency"
                    ));
                }
            }
        }
    }
    if let Some(table) = value.as_table() {
        for (key, nested) in table {
            if key != "dependencies" && key != "dev-dependencies" && key != "build-dependencies" {
                validate_manifest(path, nested)?;
            }
        }
    }
    Ok(())
}

fn validate_source(root: &Path, source: &Path) -> Result<(), String> {
    let relative = source
        .strip_prefix(root)
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .into_owned();
    if relative.ends_with("/build.rs") || relative == "build.rs" {
        return Err(format!(
            "{relative}: build scripts are forbidden for test image policy"
        ));
    }
    let body = fs::read_to_string(source).map_err(|error| error.to_string())?;
    if relative.starts_with("tools/xtask/templates/")
        && relative != "tools/xtask/templates/postgres_container.rs"
    {
        return (!body.contains("testcontainers") && !body.contains("include!"))
            .then_some(())
            .ok_or_else(|| format!("{relative}: template contains generated-surface escape"));
    }
    let syntax = syn::parse_file(&body).map_err(|error| format!("{relative}: {error}"))?;
    let mut visitor = Forbidden {
        forbidden: false,
        include: false,
    };
    visitor.visit_file(&syntax);
    if matches!(
        relative.as_str(),
        "tools/harness-runtime/src/generated_postgres.rs"
            | "tools/xtask/templates/postgres_container.rs"
    ) {
        return (!visitor.include)
            .then_some(())
            .ok_or_else(|| format!("{relative}: include! is forbidden"));
    }
    if visitor.forbidden || visitor.include {
        return Err(format!(
            "{relative}: testcontainers and include! are generated-file-only"
        ));
    }
    Ok(())
}

struct Forbidden {
    forbidden: bool,
    include: bool,
}
impl<'ast> Visit<'ast> for Forbidden {
    fn visit_item_use(&mut self, node: &'ast syn::ItemUse) {
        if use_tree_contains_testcontainers(&node.tree) {
            self.forbidden = true;
        }
        syn::visit::visit_item_use(self, node);
    }
    fn visit_path(&mut self, node: &'ast syn::Path) {
        if node
            .segments
            .first()
            .is_some_and(|segment| segment.ident == "testcontainers")
        {
            self.forbidden = true;
        }
        syn::visit::visit_path(self, node);
    }
    fn visit_item_extern_crate(&mut self, node: &'ast syn::ItemExternCrate) {
        if node.ident == "testcontainers" {
            self.forbidden = true;
        }
    }
    fn visit_macro(&mut self, node: &'ast syn::Macro) {
        if node.path.is_ident("include") {
            self.include = true;
        }
        syn::visit::visit_macro(self, node);
    }
}

fn use_tree_contains_testcontainers(tree: &syn::UseTree) -> bool {
    match tree {
        syn::UseTree::Path(path) => {
            path.ident == "testcontainers" || use_tree_contains_testcontainers(&path.tree)
        }
        syn::UseTree::Name(name) => name.ident == "testcontainers",
        syn::UseTree::Rename(rename) => rename.ident == "testcontainers",
        syn::UseTree::Group(group) => group.items.iter().any(use_tree_contains_testcontainers),
        syn::UseTree::Glob(_) => false,
    }
}

struct PublicExposure {
    forbidden: bool,
}
impl PublicExposure {
    fn public(vis: &syn::Visibility) -> bool {
        matches!(vis, syn::Visibility::Public(_))
    }
}
impl<'ast> Visit<'ast> for PublicExposure {
    fn visit_item_struct(&mut self, node: &'ast syn::ItemStruct) {
        if Self::public(&node.vis) {
            for field in &node.fields {
                if Self::public(&field.vis) {
                    self.visit_type(&field.ty);
                }
            }
        }
    }
    fn visit_item_fn(&mut self, node: &'ast syn::ItemFn) {
        if Self::public(&node.vis) {
            syn::visit::visit_signature(self, &node.sig);
        }
    }
    fn visit_item_type(&mut self, node: &'ast syn::ItemType) {
        if Self::public(&node.vis) {
            self.visit_type(&node.ty);
        }
    }
    fn visit_item_const(&mut self, node: &'ast syn::ItemConst) {
        if Self::public(&node.vis) {
            self.visit_type(&node.ty);
        }
    }
    fn visit_item_static(&mut self, node: &'ast syn::ItemStatic) {
        if Self::public(&node.vis) {
            self.visit_type(&node.ty);
        }
    }
    fn visit_item_use(&mut self, node: &'ast syn::ItemUse) {
        if Self::public(&node.vis) && use_tree_contains_testcontainers(&node.tree) {
            self.forbidden = true;
        }
    }
    fn visit_impl_item_fn(&mut self, node: &'ast syn::ImplItemFn) {
        if Self::public(&node.vis) {
            syn::visit::visit_signature(self, &node.sig);
        }
    }
    fn visit_path(&mut self, node: &'ast syn::Path) {
        if node
            .segments
            .first()
            .is_some_and(|segment| segment.ident == "testcontainers")
            || node
                .segments
                .iter()
                .any(|segment| segment.ident == "GenericImage")
        {
            self.forbidden = true;
        }
        syn::visit::visit_path(self, node);
    }
}

fn walk(root: &Path, suffix: &str) -> Result<Vec<std::path::PathBuf>, String> {
    fn visit(
        path: &Path,
        suffix: &str,
        output: &mut Vec<std::path::PathBuf>,
    ) -> Result<(), String> {
        for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.is_dir() {
                if !matches!(
                    path.file_name().and_then(|name| name.to_str()),
                    Some("target" | ".git")
                ) {
                    visit(&path, suffix, output)?;
                }
            } else if path
                .file_name()
                .is_some_and(|name| name.to_string_lossy() == suffix)
                || (suffix == ".rs" && path.extension().is_some_and(|extension| extension == "rs"))
            {
                output.push(path);
            }
        }
        Ok(())
    }
    let mut output = Vec::new();
    visit(root, suffix, &mut output)?;
    output.sort();
    Ok(output)
}
