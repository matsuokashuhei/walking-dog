use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::fmt::{self, Display, Formatter};

use cargo_metadata::{DependencyKind as CargoDependencyKind, Metadata, PackageId};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
pub struct Policy {
    version: u16,
    default: String,
    workspace_edges: WorkspaceEdges,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
struct WorkspaceEdges {
    normal: BTreeMap<String, Vec<String>>,
    dev: BTreeMap<String, Vec<String>>,
    build: BTreeMap<String, Vec<String>>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DependencyKind {
    Normal,
    Dev,
    Build,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct WorkspaceEdge<'a> {
    pub from: &'a str,
    pub to: &'a str,
    pub kind: DependencyKind,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EdgeDiagnostic {
    pub rule_id: &'static str,
    pub from: String,
    pub to: String,
    pub kind: DependencyKind,
    pub guidance: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyError {
    Parse(String),
    UnsupportedVersion(u16),
    InvalidDefault(String),
    UnknownWorkspaceCrate { name: String },
}

impl Display for PolicyError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        match self {
            Self::Parse(message) => write!(formatter, "invalid dependency policy: {message}"),
            Self::UnsupportedVersion(version) => {
                write!(
                    formatter,
                    "unsupported dependency policy version: {version}"
                )
            }
            Self::InvalidDefault(value) => {
                write!(
                    formatter,
                    "dependency policy default must be deny, got {value}"
                )
            }
            Self::UnknownWorkspaceCrate { name } => {
                write!(
                    formatter,
                    "workspace crate is not declared by policy: {name}"
                )
            }
        }
    }
}

impl Error for PolicyError {}

/// Rejects Cargo dependency aliases for the canonical `testcontainers` package.
///
/// # Errors
///
/// Returns an error for malformed manifests or any dependency key other than
/// `testcontainers` whose table declares `package = "testcontainers"`.
pub fn validate_testcontainers_dependency_names(
    path: &str,
    source: &str,
) -> Result<(), PolicyError> {
    let manifest: toml::Value =
        toml::from_str(source).map_err(|error| PolicyError::Parse(error.to_string()))?;
    validate_dependency_tables(path, &manifest)
}

fn validate_dependency_tables(path: &str, value: &toml::Value) -> Result<(), PolicyError> {
    let Some(table) = value.as_table() else {
        return Ok(());
    };
    for (name, nested) in table {
        if matches!(
            name.as_str(),
            "dependencies" | "dev-dependencies" | "build-dependencies"
        ) && let Some(dependencies) = nested.as_table()
        {
            for (key, dependency) in dependencies {
                if key != "testcontainers"
                    && dependency
                        .as_table()
                        .and_then(|detail| detail.get("package"))
                        .and_then(toml::Value::as_str)
                        == Some("testcontainers")
                {
                    return Err(PolicyError::Parse(format!(
                        "{path}: dependency key {key} aliases package testcontainers"
                    )));
                }
            }
        }
        validate_dependency_tables(path, nested)?;
    }
    Ok(())
}

impl Policy {
    /// Parses and validates the closed dependency policy schema.
    ///
    /// # Errors
    ///
    /// Returns a typed error for malformed TOML, unsupported versions, or any
    /// default other than `deny`.
    pub fn parse(source: &str) -> Result<Self, PolicyError> {
        let policy: Self =
            toml::from_str(source).map_err(|error| PolicyError::Parse(error.to_string()))?;
        if policy.version != 1 {
            return Err(PolicyError::UnsupportedVersion(policy.version));
        }
        if policy.default != "deny" {
            return Err(PolicyError::InvalidDefault(policy.default));
        }
        Ok(policy)
    }

    fn declared_crates(&self) -> BTreeSet<&str> {
        let maps = [
            &self.workspace_edges.normal,
            &self.workspace_edges.dev,
            &self.workspace_edges.build,
        ];
        maps.into_iter()
            .flat_map(|map| {
                map.iter().flat_map(|(name, targets)| {
                    std::iter::once(name.as_str()).chain(targets.iter().map(String::as_str))
                })
            })
            .collect()
    }

    fn allowed_targets(&self, from: &str, kind: DependencyKind) -> Option<&[String]> {
        let map = match kind {
            DependencyKind::Normal => &self.workspace_edges.normal,
            DependencyKind::Dev => &self.workspace_edges.dev,
            DependencyKind::Build => &self.workspace_edges.build,
        };
        map.get(from).map(Vec::as_slice)
    }
}

/// Applies exact dependency-kind permissions to resolved workspace edges.
///
/// # Errors
///
/// Returns [`PolicyError::UnknownWorkspaceCrate`] when either endpoint is absent
/// from the closed policy registry.
pub fn validate_edges(
    policy: &Policy,
    edges: &[WorkspaceEdge<'_>],
) -> Result<Vec<EdgeDiagnostic>, PolicyError> {
    let declared = policy.declared_crates();
    let mut diagnostics = Vec::new();
    for edge in edges {
        for name in [edge.from, edge.to] {
            if !declared.contains(name) {
                return Err(PolicyError::UnknownWorkspaceCrate {
                    name: name.to_owned(),
                });
            }
        }
        let allowed = policy
            .allowed_targets(edge.from, edge.kind)
            .is_some_and(|targets| targets.iter().any(|target| target == edge.to));
        if !allowed {
            diagnostics.push(EdgeDiagnostic {
                rule_id: "API-DEP-001",
                from: edge.from.to_owned(),
                to: edge.to.to_owned(),
                kind: edge.kind,
                guidance: "declare the exact edge and dependency kind in dependency-policy.toml",
            });
        }
    }
    Ok(diagnostics)
}

/// Validates the dependency-kind edges from locked Cargo metadata.
///
/// # Errors
///
/// Returns a typed policy error when Cargo reports a workspace package that is
/// absent from the closed policy registry.
pub fn validate_metadata(
    policy: &Policy,
    metadata: &Metadata,
) -> Result<Vec<EdgeDiagnostic>, PolicyError> {
    let Some(resolve) = &metadata.resolve else {
        return Err(PolicyError::Parse(
            "cargo metadata did not include a resolved graph".to_owned(),
        ));
    };
    let mut edges = Vec::new();
    for node in &resolve.nodes {
        if !metadata.workspace_members.contains(&node.id) {
            continue;
        }
        let from = package_name(metadata, &node.id)?;
        for dependency in &node.deps {
            if !metadata.workspace_members.contains(&dependency.pkg) {
                continue;
            }
            let to = package_name(metadata, &dependency.pkg)?;
            for kind in &dependency.dep_kinds {
                edges.push(WorkspaceEdge {
                    from,
                    to,
                    kind: match kind.kind {
                        CargoDependencyKind::Normal => DependencyKind::Normal,
                        CargoDependencyKind::Development => DependencyKind::Dev,
                        CargoDependencyKind::Build => DependencyKind::Build,
                        _ => {
                            return Err(PolicyError::Parse(
                                "cargo metadata returned an unknown dependency kind".to_owned(),
                            ));
                        }
                    },
                });
            }
        }
    }
    validate_edges(policy, &edges)
}

fn package_name<'a>(metadata: &'a Metadata, id: &PackageId) -> Result<&'a str, PolicyError> {
    metadata
        .packages
        .iter()
        .find(|package| &package.id == id)
        .map(|package| package.name.as_str())
        .ok_or_else(|| PolicyError::Parse(format!("missing package for Cargo ID {id}")))
}
