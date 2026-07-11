use std::error::Error;
use std::fmt::{self, Display, Formatter};

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
#[allow(
    clippy::too_many_lines,
    reason = "keeping the closed twelve-rule dispatch together makes omissions auditable"
)]
pub fn analyze_source(unit: SourceUnit<'_>) -> Result<Vec<Diagnostic>, ValidationError> {
    syn::parse_file(unit.source).map_err(|error| ValidationError::Parse {
        path: unit.path.to_owned(),
        message: error.to_string(),
    })?;

    let adapter_aliases = adapter_aliases(unit.source);
    let mut diagnostics = Vec::new();
    for (index, line) in unit.source.lines().enumerate() {
        let line_number = index + 1;
        let normalized = line.replace('-', "_");

        if unit.crate_name != "api-bootstrap"
            && contains_any(&normalized, &["std::env", "env!", "option_env!"])
        {
            push(
                &mut diagnostics,
                "API-ARCH-001",
                unit,
                line_number,
                line,
                "inject typed configuration from api-bootstrap",
            );
        }

        if unit.crate_name != "adapter-postgres" && normalized.contains("sea_orm") {
            push(
                &mut diagnostics,
                "API-ARCH-002",
                unit,
                line_number,
                line,
                "move SeaORM access behind adapter-postgres",
            );
        }

        if contains_any(&normalized, &["aws_sdk_", "aws_config"])
            && !aws_location_is_allowed(unit.crate_name, &normalized)
        {
            push(
                &mut diagnostics,
                "API-ARCH-003",
                unit,
                line_number,
                line,
                "move provider SDK use to its AWS adapter or bootstrap wiring",
            );
        }

        if unit.crate_name != "adapter-graphql"
            && contains_any(
                &normalized,
                &[
                    "async_graphql",
                    "SimpleObject",
                    "InputObject",
                    "Context",
                    "Upload",
                ],
            )
        {
            push(
                &mut diagnostics,
                "API-ARCH-004",
                unit,
                line_number,
                line,
                "keep GraphQL presentation types inside adapter-graphql",
            );
        }

        if unit.production
            && contains_any(
                &normalized,
                &[".unwrap(", ".expect(", "panic!", "todo!", "unimplemented!"],
            )
        {
            push(
                &mut diagnostics,
                "API-ARCH-005",
                unit,
                line_number,
                line,
                "return a typed error instead of aborting a production target",
            );
        }

        if matches!(unit.crate_name, "domain" | "application")
            && normalized.contains("pub ")
            && normalized.contains("adapter_")
        {
            push(
                &mut diagnostics,
                "API-ARCH-006",
                unit,
                line_number,
                line,
                "expose domain or application-owned types at inner boundaries",
            );
        }

        if matches!(unit.crate_name, "domain" | "application")
            && contains_any(
                &normalized,
                &[
                    "reqwest",
                    "axum",
                    "std::fs",
                    "tokio::fs",
                    "std::env",
                    "aws_sdk_",
                    "sea_orm",
                ],
            )
        {
            push(
                &mut diagnostics,
                "API-ARCH-007",
                unit,
                line_number,
                line,
                "express external capabilities as application ports",
            );
        }

        if unit.crate_name == "adapter-graphql"
            && is_resolver_path(unit.path)
            && contains_any(
                &normalized.to_ascii_lowercase(),
                &[
                    "transaction",
                    "retry",
                    "clock",
                    "repository",
                    "storage",
                    "aws_sdk_",
                ],
            )
        {
            push(
                &mut diagnostics,
                "API-ARCH-008",
                unit,
                line_number,
                line,
                "delegate orchestration to an application use case",
            );
        }

        if unit.crate_name != "api-bootstrap"
            && ((normalized.contains("adapter_") && normalized.contains("::new("))
                || adapter_aliases
                    .iter()
                    .any(|alias| normalized.contains(&format!("{alias}::new("))))
        {
            push(
                &mut diagnostics,
                "API-ARCH-009",
                unit,
                line_number,
                line,
                "construct production adapters only in api-bootstrap",
            );
        }

        if unit.crate_name == "application" && imports_another_application_module(unit.path, line) {
            push(
                &mut diagnostics,
                "API-ARCH-010",
                unit,
                line_number,
                line,
                "share domain values or compose modules from api-bootstrap",
            );
        }

        if contains_any(
            &normalized.to_ascii_lowercase(),
            &[
                "sqlx::query",
                "statement::from_string",
                "select ",
                "insert into ",
            ],
        ) && !raw_sql_location_is_allowed(unit)
        {
            push(
                &mut diagnostics,
                "API-ARCH-011",
                unit,
                line_number,
                line,
                "keep raw SQL in classified adapter-postgres query or migration modules",
            );
        }

        let lowercase = normalized.to_ascii_lowercase();
        if contains_any(&lowercase, &["tracing::", "log::"])
            && contains_any(
                &lowercase,
                &[
                    "token",
                    "otp",
                    "one_time_password",
                    "email",
                    "coordinate",
                    "latitude",
                    "longitude",
                    "object_key",
                    "storage_key",
                ],
            )
        {
            push(
                &mut diagnostics,
                "API-ARCH-012",
                unit,
                line_number,
                line,
                "log only approved low-cardinality identifiers and redacted outcomes",
            );
        }
    }

    Ok(diagnostics)
}

fn contains_any(value: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| value.contains(needle))
}

fn adapter_aliases(source: &str) -> Vec<String> {
    source
        .lines()
        .filter(|line| line.contains("use adapter_") && line.contains(" as "))
        .filter_map(|line| {
            line.split(" as ")
                .nth(1)
                .map(|alias| alias.trim().trim_end_matches(';').to_owned())
        })
        .collect()
}

fn push(
    diagnostics: &mut Vec<Diagnostic>,
    rule_id: &'static str,
    unit: SourceUnit<'_>,
    line: usize,
    source_line: &str,
    guidance: &'static str,
) {
    diagnostics.push(Diagnostic {
        rule_id,
        path: unit.path.to_owned(),
        line,
        symbol: source_line.trim().to_owned(),
        guidance,
    });
}

fn aws_location_is_allowed(crate_name: &str, line: &str) -> bool {
    if crate_name == "api-bootstrap" {
        return true;
    }
    [
        ("aws_sdk_cognitoidentityprovider", "adapter-aws-cognito"),
        ("aws_sdk_dynamodb", "adapter-aws-dynamodb"),
        ("aws_sdk_s3", "adapter-aws-s3"),
        ("aws_sdk_sqs", "adapter-aws-sqs"),
    ]
    .iter()
    .any(|(sdk, owner)| line.contains(sdk) && crate_name == *owner)
}

fn is_resolver_path(path: &str) -> bool {
    contains_any(path, &["/resolver", "/query", "/mutation"])
}

fn imports_another_application_module(path: &str, line: &str) -> bool {
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
    MODULES.iter().any(|module| {
        Some(*module) != current
            && (line.contains(&format!("crate::{module}::"))
                || line.contains(&format!("super::{module}::")))
    })
}

fn raw_sql_location_is_allowed(unit: SourceUnit<'_>) -> bool {
    unit.crate_name == "adapter-postgres"
        && contains_any(unit.path, &["/query/", "/queries/", "/migrations/"])
}
