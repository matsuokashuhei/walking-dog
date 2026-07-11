use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::fmt::{self, Display, Formatter};

use serde::Deserialize;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct IntentManifest {
    version: u16,
    id: String,
    title: String,
    change_kind: ChangeKind,
    owner: String,
    issue: String,
    product_axes: Vec<ProductAxis>,
    canonical_journeys: Vec<CanonicalJourney>,
    application_modules: Vec<ApplicationModule>,
    touched_seams: Vec<Seam>,
    schema_impact: Impact,
    data_migration_impact: Impact,
    expected_failure_modes: Vec<FailureMode>,
    required_evidence: Vec<Evidence>,
    owned_files: Vec<String>,
}

macro_rules! closed_registry {
    ($name:ident { $($variant:ident => $value:literal),+ $(,)? }) => {
        #[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
        enum $name {
            $(#[serde(rename = $value)] $variant),+
        }
    };
}

closed_registry!(ChangeKind {
    Architecture => "architecture",
    Presentation => "presentation",
    Application => "application",
    Infrastructure => "infrastructure",
    DataMigration => "data_migration",
});
closed_registry!(ProductAxis {
    DogExperience => "dog_experience",
    WalkData => "walk_data",
    OwnerContribution => "owner_contribution",
});
closed_registry!(CanonicalJourney {
    Authentication => "authentication",
    DogManagement => "dog_management",
    WalkLifecycle => "walk_lifecycle",
    WalkHistory => "walk_history",
    ProfileManagement => "profile_management",
});
closed_registry!(ApplicationModule {
    Identity => "identity",
    Owner => "owner",
    Dog => "dog",
    WalkRecording => "walk_recording",
    WalkEvent => "walk_event",
    WalkInsight => "walk_insight",
});
closed_registry!(Seam {
    Graphql => "graphql",
    Postgres => "postgres",
    Cognito => "cognito",
    S3 => "s3",
    Sqs => "sqs",
    DynamoDb => "dynamodb",
});
closed_registry!(Impact {
    None => "none",
    Compatible => "compatible",
    Breaking => "breaking",
});
closed_registry!(FailureMode {
    Validation => "validation_failure",
    Configuration => "configuration_failure",
    DependencyPolicy => "dependency_policy_failure",
    Build => "build_failure",
    Deployment => "deployment_failure",
    Authorization => "authorization_failure",
    Persistence => "persistence_failure",
    Provider => "provider_failure",
});
closed_registry!(Evidence {
    ArchitectureValidator => "architecture_validator",
    IntegrationTest => "integration_test",
    ApiTest => "api_test",
    MigrationTest => "migration_test",
    SchemaDiff => "schema_diff",
    DeploymentHealth => "deployment_health",
    Maestro => "maestro",
});

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IntentDiff {
    changed_files: BTreeSet<String>,
}

impl IntentDiff {
    #[must_use]
    pub fn new<I, S>(changed_files: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        Self {
            changed_files: changed_files.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum IntentError {
    Parse(String),
    UnsupportedVersion(u16),
    InvalidField { id: String, field: &'static str },
    DuplicateId { id: String },
    OverlappingOwnership { file: String },
    UnownedChangedFile { file: String },
    OwnershipOfUnchangedFile { file: String },
    SecretLikeValue { id: String },
    ArchitectureJourney { id: String },
    AdapterDeclarationMissing { id: String, file: String },
}

impl Display for IntentError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        write!(formatter, "invalid change intent: {self:?}")
    }
}

impl Error for IntentError {}

impl IntentManifest {
    /// Parses the closed, versioned change-intent schema.
    ///
    /// # Errors
    ///
    /// Returns a typed error for malformed TOML or an unsupported schema version.
    pub fn parse(source: &str) -> Result<Self, IntentError> {
        let manifest: Self =
            toml::from_str(source).map_err(|error| IntentError::Parse(error.to_string()))?;
        if manifest.version != 1 {
            return Err(IntentError::UnsupportedVersion(manifest.version));
        }
        Ok(manifest)
    }

    #[must_use]
    pub fn owned_files(&self) -> &[String] {
        &self.owned_files
    }
}

/// Validates intent contents and exact, bidirectional ownership of the supplied diff.
///
/// # Errors
///
/// Returns the first invalid declaration, duplicate, ownership mismatch, secret, or
/// missing adapter declaration.
pub fn validate_intents(
    manifests: &[IntentManifest],
    diff: &IntentDiff,
) -> Result<(), IntentError> {
    let mut ids = BTreeSet::new();
    let mut owners = BTreeMap::new();
    for manifest in manifests {
        validate_manifest(manifest)?;
        if !ids.insert(manifest.id.as_str()) {
            return Err(IntentError::DuplicateId {
                id: manifest.id.clone(),
            });
        }
        for file in &manifest.owned_files {
            if owners.insert(file.as_str(), manifest.id.as_str()).is_some() {
                return Err(IntentError::OverlappingOwnership { file: file.clone() });
            }
            if !diff.changed_files.contains(file) {
                return Err(IntentError::OwnershipOfUnchangedFile { file: file.clone() });
            }
            if let Some(required_seam) = adapter_seam(file)
                && (!manifest.touched_seams.contains(&required_seam)
                    || !manifest
                        .required_evidence
                        .contains(&Evidence::IntegrationTest))
            {
                return Err(IntentError::AdapterDeclarationMissing {
                    id: manifest.id.clone(),
                    file: file.clone(),
                });
            }
        }
    }
    if let Some(file) = diff
        .changed_files
        .iter()
        .find(|file| !owners.contains_key(file.as_str()))
    {
        return Err(IntentError::UnownedChangedFile { file: file.clone() });
    }
    Ok(())
}

fn validate_manifest(manifest: &IntentManifest) -> Result<(), IntentError> {
    let scalar_fields = [
        (!manifest.id.trim().is_empty(), "id"),
        (!manifest.title.trim().is_empty(), "title"),
        (
            manifest.owner.starts_with("github:") && manifest.owner.len() > 7,
            "owner",
        ),
        (
            manifest.issue.starts_with("https://github.com/")
                && manifest.issue.contains("/issues/"),
            "issue",
        ),
        (!manifest.product_axes.is_empty(), "product_axes"),
        (
            !manifest.expected_failure_modes.is_empty(),
            "expected_failure_modes",
        ),
        (!manifest.required_evidence.is_empty(), "required_evidence"),
        (!manifest.owned_files.is_empty(), "owned_files"),
    ];
    if let Some((_, field)) = scalar_fields.into_iter().find(|(valid, _)| !valid) {
        return Err(IntentError::InvalidField {
            id: manifest.id.clone(),
            field,
        });
    }
    if manifest.owned_files.iter().any(|file| {
        file.trim().is_empty()
            || file.starts_with('/')
            || file.contains(['*', '?', '[', ']'])
            || file.ends_with('/')
    }) {
        return Err(IntentError::InvalidField {
            id: manifest.id.clone(),
            field: "owned_files",
        });
    }
    if matches!(manifest.change_kind, ChangeKind::Architecture)
        && !manifest.canonical_journeys.is_empty()
    {
        return Err(IntentError::ArchitectureJourney {
            id: manifest.id.clone(),
        });
    }
    if matches!(manifest.change_kind, ChangeKind::Application)
        && manifest.application_modules.is_empty()
    {
        return Err(IntentError::InvalidField {
            id: manifest.id.clone(),
            field: "application_modules",
        });
    }
    if contains_secret_like_value(manifest) {
        return Err(IntentError::SecretLikeValue {
            id: manifest.id.clone(),
        });
    }
    let _ = (
        &manifest.application_modules,
        manifest.schema_impact,
        manifest.data_migration_impact,
    );
    Ok(())
}

fn adapter_seam(file: &str) -> Option<Seam> {
    [
        ("crates/adapter-graphql/", Seam::Graphql),
        ("crates/adapter-postgres/", Seam::Postgres),
        ("crates/adapter-aws-cognito/", Seam::Cognito),
        ("crates/adapter-aws-s3/", Seam::S3),
        ("crates/adapter-aws-sqs/", Seam::Sqs),
        ("crates/adapter-aws-dynamodb/", Seam::DynamoDb),
    ]
    .into_iter()
    .find_map(|(prefix, seam)| file.starts_with(prefix).then_some(seam))
}

fn contains_secret_like_value(manifest: &IntentManifest) -> bool {
    let values = [
        manifest.id.as_str(),
        manifest.title.as_str(),
        manifest.owner.as_str(),
        manifest.issue.as_str(),
    ];
    values
        .into_iter()
        .chain(manifest.owned_files.iter().map(String::as_str))
        .any(|value| {
            let lower = value.to_ascii_lowercase();
            lower.contains("password=")
                || lower.contains("secret=")
                || lower.contains("token=")
                || lower.contains("private_key")
                || lower.contains("ghp_")
                || lower.contains("akia")
        })
}
