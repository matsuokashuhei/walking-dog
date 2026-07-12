use architecture_validator::exceptions::{
    ExceptionError, ExceptionSet, ObservedViolation, validate_exceptions,
};
use chrono::NaiveDate;

const FINGERPRINT: &str = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

fn exception_source(created_on: &str, expires_on: &str, file: &str) -> String {
    format!(
        r#"
version = 1

[[exception]]
id = "API-EXC-0001"
rule = "API-ARCH-008"
crate = "adapter-graphql"
file = "{file}"
symbol = "WalkQuery::legacy_projection"
fingerprint = "{FINGERPRINT}"
owner = "github:matsuokashuhei"
created_on = "{created_on}"
expires_on = "{expires_on}"
removal_issue = "https://github.com/matsuokashuhei/walking-dog/issues/999"
adr = "docs/adr/9999-temporary-exception.md"
justification = "Temporary containment while the application query is introduced."
"#
    )
}

fn observed() -> [ObservedViolation<'static>; 1] {
    [ObservedViolation {
        rule: "API-ARCH-008",
        crate_name: "adapter-graphql",
        file: "crates/adapter-graphql/src/walk/query.rs",
        symbol: "WalkQuery::legacy_projection",
        fingerprint: FINGERPRINT,
    }]
}

#[test]
fn exact_exception_within_thirty_days_is_consumed() {
    let set = ExceptionSet::parse(&exception_source(
        "2026-07-11",
        "2026-08-10",
        "crates/adapter-graphql/src/walk/query.rs",
    ))
    .expect("valid exception schema");

    validate_exceptions(
        &set,
        NaiveDate::from_ymd_opt(2026, 7, 11).expect("valid date"),
        &observed(),
    )
    .expect("exact observed exception is valid");
}

#[test]
fn glob_target_is_rejected() {
    let set = ExceptionSet::parse(&exception_source(
        "2026-07-11",
        "2026-08-10",
        "crates/adapter-graphql/src/walk/*.rs",
    ))
    .expect("valid TOML");

    assert!(matches!(
        validate_exceptions(
            &set,
            NaiveDate::from_ymd_opt(2026, 7, 11).expect("valid date"),
            &observed(),
        ),
        Err(ExceptionError::NonExactTarget { .. })
    ));
}

#[test]
fn duration_over_thirty_days_is_rejected() {
    let set = ExceptionSet::parse(&exception_source(
        "2026-07-11",
        "2026-08-11",
        "crates/adapter-graphql/src/walk/query.rs",
    ))
    .expect("valid TOML");

    assert!(matches!(
        validate_exceptions(
            &set,
            NaiveDate::from_ymd_opt(2026, 7, 11).expect("valid date"),
            &observed(),
        ),
        Err(ExceptionError::DurationExceeded { days: 31, .. })
    ));
}

#[test]
fn expired_and_unused_entries_fail_closed() {
    let expired = ExceptionSet::parse(&exception_source(
        "2026-06-01",
        "2026-07-01",
        "crates/adapter-graphql/src/walk/query.rs",
    ))
    .expect("valid TOML");
    assert!(matches!(
        validate_exceptions(
            &expired,
            NaiveDate::from_ymd_opt(2026, 7, 11).expect("valid date"),
            &observed(),
        ),
        Err(ExceptionError::Expired { .. })
    ));

    let unused = ExceptionSet::parse(&exception_source(
        "2026-07-11",
        "2026-08-10",
        "crates/adapter-graphql/src/walk/query.rs",
    ))
    .expect("valid TOML");
    assert!(matches!(
        validate_exceptions(
            &unused,
            NaiveDate::from_ymd_opt(2026, 7, 11).expect("valid date"),
            &[],
        ),
        Err(ExceptionError::Unused { .. })
    ));
}

#[test]
fn fingerprint_drift_makes_an_exact_exception_unused() {
    let set = ExceptionSet::parse(&exception_source(
        "2026-07-11",
        "2026-08-10",
        "crates/adapter-graphql/src/walk/query.rs",
    ))
    .expect("valid exception");
    let drifted_fingerprint =
        "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    let drifted = [ObservedViolation {
        fingerprint: drifted_fingerprint,
        ..observed()[0]
    }];
    assert!(matches!(
        validate_exceptions(
            &set,
            NaiveDate::from_ymd_opt(2026, 7, 11).expect("valid date"),
            &drifted,
        ),
        Err(ExceptionError::Unused { .. })
    ));
}
