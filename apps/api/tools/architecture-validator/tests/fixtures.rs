use architecture_validator::ast::{SourceUnit, ValidationError, analyze_source};

struct FailingFixture {
    rule: &'static str,
    crate_name: &'static str,
    path: &'static str,
    source: &'static str,
    line: usize,
}

const INITIAL_FIXTURES: [FailingFixture; 12] = [
    FailingFixture {
        rule: "API-ARCH-001",
        crate_name: "application",
        path: "crates/application/src/lib.rs",
        source: "fn value() {\n    let _ = std::env::var(\"PORT\");\n}\n",
        line: 2,
    },
    FailingFixture {
        rule: "API-ARCH-002",
        crate_name: "domain",
        path: "crates/domain/src/lib.rs",
        source: "use sea_orm::EntityTrait;\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-003",
        crate_name: "application",
        path: "crates/application/src/lib.rs",
        source: "use aws_sdk_s3::Client;\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-004",
        crate_name: "domain",
        path: "crates/domain/src/lib.rs",
        source: "use async_graphql::Context;\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-005",
        crate_name: "application",
        path: "crates/application/src/lib.rs",
        source: "fn value(v: Option<u8>) {\n    let _ = v.unwrap();\n}\n",
        line: 2,
    },
    FailingFixture {
        rule: "API-ARCH-006",
        crate_name: "application",
        path: "crates/application/src/lib.rs",
        source: "pub fn leak(value: adapter_postgres::Row) {}\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-007",
        crate_name: "domain",
        path: "crates/domain/src/lib.rs",
        source: "use reqwest::Client;\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-008",
        crate_name: "adapter-graphql",
        path: "crates/adapter-graphql/src/walk/resolver.rs",
        source: "fn resolve() {\n    repository.begin_transaction();\n}\n",
        line: 2,
    },
    FailingFixture {
        rule: "API-ARCH-009",
        crate_name: "adapter-graphql",
        path: "crates/adapter-graphql/src/lib.rs",
        source: "fn wire() {\n    adapter_postgres::Repository::new();\n}\n",
        line: 2,
    },
    FailingFixture {
        rule: "API-ARCH-010",
        crate_name: "application",
        path: "crates/application/src/owner/update.rs",
        source: "use crate::dog::Dog;\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-011",
        crate_name: "application",
        path: "crates/application/src/lib.rs",
        source: "fn query() {\n    sqlx::query(\"SELECT * FROM dogs\");\n}\n",
        line: 2,
    },
    FailingFixture {
        rule: "API-ARCH-012",
        crate_name: "api-bootstrap",
        path: "crates/api-bootstrap/src/lib.rs",
        source: "fn log() {\n    tracing::info!(access_token = token);\n}\n",
        line: 2,
    },
];

#[test]
fn every_initial_rule_reports_its_id_and_location() {
    for fixture in INITIAL_FIXTURES {
        let diagnostics = analyze_source(SourceUnit {
            crate_name: fixture.crate_name,
            path: fixture.path,
            source: fixture.source,
            production: true,
        })
        .unwrap_or_else(|error| panic!("fixture must parse: {error}"));
        let diagnostic = diagnostics
            .iter()
            .find(|diagnostic| diagnostic.rule_id == fixture.rule)
            .unwrap_or_else(|| panic!("missing {} for {}", fixture.rule, fixture.path));
        assert_eq!(diagnostic.line, fixture.line, "{}", fixture.rule);
        assert_eq!(diagnostic.path, fixture.path, "{}", fixture.rule);
        assert!(!diagnostic.symbol.is_empty(), "{}", fixture.rule);
        assert!(!diagnostic.guidance.is_empty(), "{}", fixture.rule);
    }
}

#[test]
fn allowed_locations_remain_clean() {
    let fixtures = [
        SourceUnit {
            crate_name: "api-bootstrap",
            path: "crates/api-bootstrap/src/config.rs",
            source: "fn value() { let _ = std::env::var(\"PORT\"); }",
            production: true,
        },
        SourceUnit {
            crate_name: "adapter-postgres",
            path: "crates/adapter-postgres/src/query/dog.rs",
            source: "use sea_orm::EntityTrait; fn query() { sqlx::query(\"SELECT 1\"); }",
            production: true,
        },
        SourceUnit {
            crate_name: "adapter-graphql",
            path: "crates/adapter-graphql/src/lib.rs",
            source: "use async_graphql::Context;",
            production: true,
        },
    ];

    for fixture in fixtures {
        assert!(
            analyze_source(fixture)
                .unwrap_or_else(|error| panic!("fixture must parse: {error}"))
                .is_empty()
        );
    }
}

#[test]
fn parser_failure_is_fail_closed() {
    let result = analyze_source(SourceUnit {
        crate_name: "domain",
        path: "crates/domain/src/broken.rs",
        source: "pub fn broken( {",
        production: true,
    });

    assert!(matches!(result, Err(ValidationError::Parse { .. })));
}

#[test]
fn aliases_and_public_reexports_cannot_hide_violations() {
    let fixtures = [
        FailingFixture {
            rule: "API-ARCH-001",
            crate_name: "application",
            path: "crates/application/src/unreachable.rs",
            source: "use std::env as process_environment;\n",
            line: 1,
        },
        FailingFixture {
            rule: "API-ARCH-003",
            crate_name: "application",
            path: "crates/application/src/unreachable.rs",
            source: "use aws_sdk_s3::Client as ObjectStoreClient;\n",
            line: 1,
        },
        FailingFixture {
            rule: "API-ARCH-004",
            crate_name: "domain",
            path: "crates/domain/src/unreachable.rs",
            source: "pub use async_graphql::Context as RequestContext;\n",
            line: 1,
        },
        FailingFixture {
            rule: "API-ARCH-006",
            crate_name: "application",
            path: "crates/application/src/unreachable.rs",
            source: "pub use adapter_postgres::Row as OwnerRow;\n",
            line: 1,
        },
        FailingFixture {
            rule: "API-ARCH-008",
            crate_name: "adapter-graphql",
            path: "crates/adapter-graphql/src/owner/query.rs",
            source: "use adapter_postgres::Repository as OwnerStore;\n",
            line: 1,
        },
        FailingFixture {
            rule: "API-ARCH-009",
            crate_name: "adapter-graphql",
            path: "crates/adapter-graphql/src/unreachable.rs",
            source: "use adapter_postgres::Repository as Store;\nfn wire() { Store::new(); }\n",
            line: 2,
        },
        FailingFixture {
            rule: "API-ARCH-010",
            crate_name: "application",
            path: "crates/application/src/owner/unreachable.rs",
            source: "pub use crate::dog::Dog as RelatedDog;\n",
            line: 1,
        },
    ];

    for fixture in fixtures {
        let diagnostics = analyze_source(SourceUnit {
            crate_name: fixture.crate_name,
            path: fixture.path,
            source: fixture.source,
            production: true,
        })
        .unwrap_or_else(|error| panic!("fixture must parse: {error}"));
        assert!(
            diagnostics.iter().any(|diagnostic| {
                diagnostic.rule_id == fixture.rule && diagnostic.line == fixture.line
            }),
            "missing alias/re-export diagnostic {} for {}",
            fixture.rule,
            fixture.path
        );
    }
}
