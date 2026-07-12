use std::collections::BTreeSet;
use std::error::Error;
use std::fmt::{self, Display, Formatter};
use std::path::Path;

use chrono::NaiveDate;
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ExceptionSet {
    version: u16,
    #[serde(default)]
    exception: Vec<ExceptionEntry>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
#[serde(deny_unknown_fields)]
struct ExceptionEntry {
    id: String,
    rule: String,
    #[serde(rename = "crate")]
    crate_name: String,
    file: String,
    symbol: String,
    fingerprint: String,
    owner: String,
    created_on: String,
    expires_on: String,
    removal_issue: String,
    adr: String,
    justification: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ObservedViolation<'a> {
    pub rule: &'a str,
    pub crate_name: &'a str,
    pub file: &'a str,
    pub symbol: &'a str,
    pub fingerprint: &'a str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ExceptionError {
    Parse(String),
    UnsupportedVersion(u16),
    DuplicateId { id: String },
    DuplicateAdr { adr: String },
    InvalidField { id: String, field: &'static str },
    NonExactTarget { id: String },
    DurationExceeded { id: String, days: i64 },
    Expired { id: String },
    Unused { id: String },
}

impl Display for ExceptionError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        write!(formatter, "invalid architecture exception: {self:?}")
    }
}

impl Error for ExceptionError {}

impl ExceptionSet {
    /// Parses the closed exception schema.
    ///
    /// # Errors
    ///
    /// Returns a typed error for malformed TOML or an unsupported schema version.
    pub fn parse(source: &str) -> Result<Self, ExceptionError> {
        let set: Self =
            toml::from_str(source).map_err(|error| ExceptionError::Parse(error.to_string()))?;
        if set.version != 1 {
            return Err(ExceptionError::UnsupportedVersion(set.version));
        }
        Ok(set)
    }

    #[must_use]
    pub fn permits(&self, violation: &ObservedViolation<'_>) -> bool {
        self.exception.iter().any(|entry| {
            violation.rule == entry.rule
                && violation.crate_name == entry.crate_name
                && violation.file == entry.file
                && violation.symbol == entry.symbol
                && violation.fingerprint == entry.fingerprint
        })
    }
}

/// Validates exception bounds and proves every entry suppresses exactly one observed violation.
///
/// # Errors
///
/// Returns the first invalid, expired, duplicated, broadened, or unused exception.
pub fn validate_exceptions(
    set: &ExceptionSet,
    today: NaiveDate,
    observed: &[ObservedViolation<'_>],
) -> Result<(), ExceptionError> {
    let mut ids = BTreeSet::new();
    let mut adrs = BTreeSet::new();
    for entry in &set.exception {
        if !ids.insert(entry.id.as_str()) {
            return Err(ExceptionError::DuplicateId {
                id: entry.id.clone(),
            });
        }
        if !adrs.insert(entry.adr.as_str()) {
            return Err(ExceptionError::DuplicateAdr {
                adr: entry.adr.clone(),
            });
        }
        validate_closed_fields(entry)?;
        let created = parse_date(entry, "created_on", &entry.created_on)?;
        let expires = parse_date(entry, "expires_on", &entry.expires_on)?;
        let days = expires.signed_duration_since(created).num_days();
        if !(0..=30).contains(&days) {
            return Err(ExceptionError::DurationExceeded {
                id: entry.id.clone(),
                days,
            });
        }
        if today >= expires {
            return Err(ExceptionError::Expired {
                id: entry.id.clone(),
            });
        }
        let consumed = observed.iter().any(|violation| {
            violation.rule == entry.rule
                && violation.crate_name == entry.crate_name
                && violation.file == entry.file
                && violation.symbol == entry.symbol
                && violation.fingerprint == entry.fingerprint
        });
        if !consumed {
            return Err(ExceptionError::Unused {
                id: entry.id.clone(),
            });
        }
    }
    Ok(())
}

fn validate_closed_fields(entry: &ExceptionEntry) -> Result<(), ExceptionError> {
    let rule_number = entry
        .rule
        .strip_prefix("API-ARCH-")
        .and_then(|value| value.parse::<u8>().ok());
    let fingerprint = entry.fingerprint.strip_prefix("sha256:");
    let valid_fingerprint = fingerprint.is_some_and(|value| {
        value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
    });
    let fields = [
        (
            entry.id.starts_with("API-EXC-") && entry.id.len() == 12,
            "id",
        ),
        (matches!(rule_number, Some(1..=12)), "rule"),
        (
            entry.owner.starts_with("github:") && entry.owner.len() > 7,
            "owner",
        ),
        (
            entry.removal_issue.starts_with("https://github.com/")
                && entry.removal_issue.contains("/issues/"),
            "removal_issue",
        ),
        (
            entry.adr.starts_with("docs/adr/")
                && Path::new(&entry.adr)
                    .extension()
                    .is_some_and(|extension| extension == "md"),
            "adr",
        ),
        (!entry.justification.trim().is_empty(), "justification"),
        (!entry.symbol.trim().is_empty(), "symbol"),
        (valid_fingerprint, "fingerprint"),
    ];
    if let Some((_, field)) = fields.into_iter().find(|(valid, _)| !valid) {
        return Err(ExceptionError::InvalidField {
            id: entry.id.clone(),
            field,
        });
    }
    if entry.file.contains(['*', '?', '[', ']']) || entry.file.ends_with('/') {
        return Err(ExceptionError::NonExactTarget {
            id: entry.id.clone(),
        });
    }
    Ok(())
}

fn parse_date(
    entry: &ExceptionEntry,
    field: &'static str,
    value: &str,
) -> Result<NaiveDate, ExceptionError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| ExceptionError::InvalidField {
        id: entry.id.clone(),
        field,
    })
}
