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

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct IntentDiffArtifact {
    version: u16,
    changed_files: Vec<String>,
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

    /// Parses an independently produced checked-in changed-file artifact.
    ///
    /// # Errors
    ///
    /// Rejects malformed schemas, unsupported versions, duplicates, and
    /// non-exact paths.
    pub fn parse_artifact(source: &str) -> Result<Self, IntentError> {
        let artifact: IntentDiffArtifact =
            toml::from_str(source).map_err(|error| IntentError::Parse(error.to_string()))?;
        if artifact.version != 1 {
            return Err(IntentError::UnsupportedVersion(artifact.version));
        }
        let changed_files = artifact
            .changed_files
            .iter()
            .cloned()
            .collect::<BTreeSet<_>>();
        if changed_files.len() != artifact.changed_files.len()
            || changed_files.iter().any(|file| {
                file.trim().is_empty()
                    || file.starts_with('/')
                    || file.contains(['*', '?', '[', ']'])
                    || file.ends_with('/')
            })
        {
            return Err(IntentError::Parse(
                "changed_files must be unique exact repository-relative paths".to_owned(),
            ));
        }
        Ok(Self { changed_files })
    }

    #[must_use]
    pub fn changed_files(&self) -> &BTreeSet<String> {
        &self.changed_files
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
        (github_handle(&manifest.owner).is_some(), "owner"),
        (
            valid_github_issue(&manifest.owner, &manifest.issue),
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
            has_credential_assignment(&lower, "password")
                || has_credential_assignment(&lower, "secret")
                || has_credential_assignment(&lower, "token")
                || has_bearer_credential(&lower)
                || has_jwt_shape(value)
                || lower.contains("-----begin private key-----")
                || lower.contains("-----begin rsa private key-----")
                || lower.contains("-----begin ec private key-----")
                || has_common_access_key(value)
        })
}

fn github_handle(owner: &str) -> Option<&str> {
    let handle = owner.strip_prefix("github:")?;
    (!handle.is_empty()
        && handle
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-'))
    .then_some(handle)
}

fn valid_github_issue(owner: &str, issue: &str) -> bool {
    let Some(handle) = github_handle(owner) else {
        return false;
    };
    let prefix = format!("https://github.com/{handle}/");
    let Some(remainder) = issue.strip_prefix(&prefix) else {
        return false;
    };
    let mut parts = remainder.split('/');
    let (Some(repository), Some("issues"), Some(number), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return false;
    };
    !repository.is_empty()
        && repository
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
        && number.parse::<u64>().is_ok_and(|value| value > 0)
}

fn has_credential_assignment(value: &str, name: &str) -> bool {
    value.match_indices(name).any(|(index, _)| {
        let before_is_boundary = index == 0 || !value.as_bytes()[index - 1].is_ascii_alphanumeric();
        let suffix = &value[index + name.len()..];
        let suffix = suffix.trim_start();
        before_is_boundary
            && suffix
                .strip_prefix(['=', ':'])
                .is_some_and(|credential| !credential.trim().is_empty())
    })
}

fn has_bearer_credential(value: &str) -> bool {
    value.find("authorization").is_some_and(|index| {
        let suffix = value[index + "authorization".len()..].trim_start();
        suffix.strip_prefix(':').is_some_and(|header| {
            header
                .trim_start()
                .strip_prefix("bearer ")
                .is_some_and(|token| !token.trim().is_empty())
        })
    })
}

fn has_jwt_shape(value: &str) -> bool {
    value.split_whitespace().any(|candidate| {
        let candidate = candidate.trim_matches(|character: char| {
            !character.is_ascii_alphanumeric() && !matches!(character, '-' | '_' | '.')
        });
        let segments = candidate.split('.').collect::<Vec<_>>();
        segments.len() == 3
            && segments.iter().all(|segment| {
                segment.len() >= 8
                    && segment
                        .bytes()
                        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
            })
    })
}

fn has_common_access_key(value: &str) -> bool {
    value
        .split(|character: char| !(character.is_ascii_alphanumeric() || character == '_'))
        .any(|candidate| {
            (candidate.starts_with("AKIA")
                && candidate.len() == 20
                && candidate
                    .bytes()
                    .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit()))
                || (candidate.starts_with("ghp_") && candidate.len() >= 20)
        })
}
