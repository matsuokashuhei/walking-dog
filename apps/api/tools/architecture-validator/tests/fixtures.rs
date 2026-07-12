use architecture_validator::ast::{
    SourceUnit, ValidationError, analyze_source, analyze_source_set,
};

struct FailingFixture {
    rule: &'static str,
    crate_name: &'static str,
    path: &'static str,
    source: &'static str,
    line: usize,
}

const INITIAL_FIXTURES: [FailingFixture; 11] = [
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
        path: "crates/adapter-graphql/src/resolver.rs",
        source: "fn resolve() {\n    adapter_postgres::Repository::begin_transaction();\n}\n",
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

const STRUCTURAL_FIXTURES: [FailingFixture; 11] = [
    FailingFixture {
        rule: "API-ARCH-001",
        crate_name: "application",
        path: "crates/application/src/config.rs",
        source: "extern crate std as runtime;\nfn port() { let _ = runtime::env::var(\"PORT\"); }\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-002",
        crate_name: "domain",
        path: "crates/domain/src/model.rs",
        source: "use sea_orm::{self as database, *};\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-003",
        crate_name: "application",
        path: "crates/application/src/storage.rs",
        source: "extern crate aws_sdk_s3 as object_store;\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-004",
        crate_name: "domain",
        path: "crates/domain/src/model.rs",
        source: "use async_graphql::{self as gql, *};\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-006",
        crate_name: "application",
        path: "crates/application/src/ports.rs",
        source: "use adapter_postgres as db;\npub type LeakedRow = db::Row;\n",
        line: 2,
    },
    FailingFixture {
        rule: "API-ARCH-007",
        crate_name: "domain",
        path: "crates/domain/src/io.rs",
        source: "use std::{fs::{self as disk, *}};\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-008",
        crate_name: "adapter-graphql",
        path: "crates/adapter-graphql/src/resolver.rs",
        source: "fn resolve() { adapter_postgres::Repository::begin_transaction(); }\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-001",
        crate_name: "adapter-graphql",
        path: "crates/adapter-graphql/src/lib.rs",
        source: "use adapter_postgres as db;\nuse db::{Repository as Store};\nfn wire() { Store :: new(); }\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-010",
        crate_name: "application",
        path: "crates/application/src/owner/update.rs",
        source: "use crate::{\n    dog::{Dog as RelatedDog},\n};\n",
        line: 2,
    },
    FailingFixture {
        rule: "API-ARCH-011",
        crate_name: "application",
        path: "crates/application/src/query.rs",
        source: "fn query() { sqlx::query!(\n    r#\"SELECT *\nFROM dogs\"#\n); }\n",
        line: 1,
    },
    FailingFixture {
        rule: "API-ARCH-012",
        crate_name: "api-bootstrap",
        path: "crates/api-bootstrap/src/log.rs",
        source: "fn record(token: &str) { tracing::info!(\n    event = \"signed_in\",\n    access_token = token,\n); }\n",
        line: 3,
    },
];

#[test]
fn structural_syntax_cannot_hide_any_architecture_rule() {
    for fixture in STRUCTURAL_FIXTURES {
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
            "missing structural diagnostic {} at {}:{}; got {diagnostics:?}",
            fixture.rule,
            fixture.path,
            fixture.line
        );
    }
}

#[test]
fn public_impl_members_and_trait_impl_members_are_public_boundaries() {
    let fixtures = [
        SourceUnit {
            crate_name: "application",
            path: "crates/application/src/ports.rs",
            source: "struct Service;\nimpl Service {\n    pub fn row(&self) -> adapter_postgres::Row { loop {} }\n    pub const ROW: adapter_postgres::Row = loop {};\n}\n",
            production: false,
        },
        SourceUnit {
            crate_name: "application",
            path: "crates/application/src/ports.rs",
            source: "pub trait Port { fn save(&self, row: adapter_postgres::Row); }\nstruct Service;\nimpl Port for Service {\n    fn save(&self, row: adapter_postgres::Row) {}\n}\n",
            production: false,
        },
    ];

    for fixture in fixtures {
        assert!(
            analyze_source(fixture)
                .expect("fixture must parse")
                .iter()
                .any(|diagnostic| diagnostic.rule_id == "API-ARCH-006"),
            "public impl boundary was not enforced"
        );
    }
}

#[test]
fn fully_qualified_cross_application_paths_are_rejected() {
    let diagnostics = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/owner/update.rs",
        source: "fn related() -> crate::dog::Dog { loop {} }\n",
        production: false,
    })
    .expect("fixture must parse");

    assert!(
        diagnostics
            .iter()
            .any(|diagnostic| { diagnostic.rule_id == "API-ARCH-010" && diagnostic.line == 1 })
    );
}

#[test]
fn graphql_names_and_sql_words_require_forbidden_provenance_or_execution() {
    let clean = analyze_source(SourceUnit {
        crate_name: "domain",
        path: "crates/domain/src/message.rs",
        source: "struct Context; struct Upload; struct InputObject;\nfn context() -> Context { Context }\nfn message() -> &'static str { \"SELECT account context\" }\n",
        production: true,
    })
    .expect("fixture must parse");
    assert!(
        clean.is_empty(),
        "unrelated names/messages must be clean: {clean:?}"
    );

    for (source, line) in [
        (
            "fn q() { sqlx::query!(\"UPDATE dogs SET name = 'Pochi'\"); }",
            1,
        ),
        ("fn q() { sqlx::query!(\"DELETE FROM dogs\"); }", 1),
        (
            "fn q() { sqlx::query!(\"CREATE TABLE hidden(id INT)\"); }",
            1,
        ),
    ] {
        let diagnostics = analyze_source(SourceUnit {
            crate_name: "application",
            path: "crates/application/src/query.rs",
            source,
            production: true,
        })
        .expect("fixture must parse");
        assert!(
            diagnostics.iter().any(|diagnostic| {
                diagnostic.rule_id == "API-ARCH-011" && diagnostic.line == line
            })
        );
    }
}

#[test]
fn raw_sql_execution_apis_are_rejected_without_scanning_messages() {
    let cases = [
        "fn q() { sqlx::raw_sql(\"DELETE FROM dogs\").execute(&pool); }",
        "fn q() { sqlx::Executor::execute(&mut connection, \"UPDATE dogs SET name='P'\"); }",
        "fn q() { sea_orm::ConnectionTrait::execute_unprepared(&connection, \"DROP TABLE dogs\"); }",
    ];
    for source in cases {
        let diagnostics = analyze_source(SourceUnit {
            crate_name: "application",
            path: "crates/application/src/query.rs",
            source,
            production: true,
        })
        .expect("fixture must parse");
        assert!(
            diagnostics
                .iter()
                .any(|diagnostic| diagnostic.rule_id == "API-ARCH-011"),
            "raw execution API escaped: {source}"
        );
    }
}

#[test]
fn canonical_syntax_rejects_include_hiding_without_flagging_plain_local_code() {
    let included = analyze_source(SourceUnit {
        crate_name: "domain",
        path: "crates/domain/src/lib.rs",
        source: "include!(\"generated.rs\");",
        production: true,
    })
    .expect("fixture parses");
    assert!(
        included
            .iter()
            .any(|diagnostic| diagnostic.rule_id == "API-ARCH-001")
    );

    let local = analyze_source(SourceUnit {
        crate_name: "domain",
        path: "crates/domain/src/lib.rs",
        source: "pub struct WalkMinutes(pub u16);",
        production: true,
    })
    .expect("fixture parses");
    assert!(local.is_empty());
}

#[test]
fn canonical_syntax_rejects_hiding_forms_at_their_source_location() {
    let cases = [
        ("use std::env as environment;", "API-ARCH-001", 1, 1),
        ("use std::env::*;", "API-ARCH-001", 1, 1),
        ("pub use std::env::var;", "API-ARCH-001", 1, 5),
        ("extern crate std as runtime;", "API-ARCH-001", 1, 14),
        ("type Hidden = adapter_postgres::Row;", "API-ARCH-006", 1, 6),
        ("include!(\"generated.rs\");", "API-ARCH-001", 1, 1),
        ("#[cfg(any())]\nuse std::env;", "API-ARCH-001", 1, 1),
        (
            "#[cfg_attr(any(), cfg(any()))]\nuse std::env;",
            "API-ARCH-001",
            1,
            1,
        ),
        (
            "#[cfg_attr(any(), cfg(any()))]\nmod hidden {}",
            "API-ARCH-001",
            1,
            1,
        ),
        (
            "#[cfg_attr(any(), cfg(any()))]\nfn hidden() {}",
            "API-ARCH-001",
            1,
            1,
        ),
    ];
    for (source, rule, line, column) in cases {
        let diagnostics = analyze_source(SourceUnit {
            crate_name: "application",
            path: "crates/application/src/lib.rs",
            source,
            production: true,
        })
        .expect("fixture parses");
        assert!(
            diagnostics
                .iter()
                .any(|diagnostic| diagnostic.rule_id == rule
                    && diagnostic.path == "crates/application/src/lib.rs"
                    && diagnostic.line == line
                    && diagnostic.column == column),
            "{source}: {diagnostics:?}"
        );
    }
    let clean = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/lib.rs",
        source: "// use std::env as environment\npub struct Local; fn f() { let env = \"include! type Alias\"; let _ = env; }",
        production: true,
    })
    .expect("fixture parses");
    assert!(clean.is_empty());
}

#[test]
fn resolver_boundary_is_declared_and_uses_only_explicit_call_targets() {
    let declared = analyze_source(SourceUnit {
        crate_name: "adapter-graphql",
        path: "crates/adapter-graphql/src/resolver.rs",
        source: "fn resolve() { adapter_postgres::Repository::begin_transaction(); }",
        production: true,
    })
    .expect("fixture parses");
    assert!(declared.iter().any(|diagnostic| {
        diagnostic.rule_id == "API-ARCH-008"
            && diagnostic.path == "crates/adapter-graphql/src/resolver.rs"
            && diagnostic.line == 1
    }));

    for (path, source) in [
        (
            "crates/adapter-graphql/src/resolver_helpers.rs",
            "fn resolve() { adapter_postgres::Repository::begin_transaction(); }",
        ),
        (
            "crates/adapter-graphql/src/resolver.rs",
            "fn resolve(repository: Store) { repository.begin_transaction(); }",
        ),
    ] {
        let diagnostics = analyze_source(SourceUnit {
            crate_name: "adapter-graphql",
            path,
            source,
            production: true,
        })
        .expect("fixture parses");
        assert!(
            diagnostics
                .iter()
                .all(|diagnostic| diagnostic.rule_id != "API-ARCH-008"),
            "declared syntax, not partial paths or names, controls API-ARCH-008: {diagnostics:?}"
        );
    }
}

#[test]
fn repeated_super_paths_cannot_cross_application_roots() {
    let diagnostics = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/owner/nested/update.rs",
        source: "fn related() -> super::super::super::dog::Dog { loop {} }\n",
        production: false,
    })
    .expect("fixture must parse");
    assert!(
        diagnostics
            .iter()
            .any(|diagnostic| { diagnostic.rule_id == "API-ARCH-010" && diagnostic.line == 1 })
    );
}

#[test]
fn super_resolution_uses_real_module_depth_and_rejects_over_traversal() {
    let same_root = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/owner/nested/update.rs",
        source: "fn helper() -> super::super::model::Owner { loop {} }\n",
        production: false,
    })
    .expect("fixture must parse");
    assert!(
        same_root
            .iter()
            .all(|diagnostic| diagnostic.rule_id != "API-ARCH-010")
    );

    let over = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/owner/update.rs",
        source: "fn broken() -> super::super::super::dog::Dog { loop {} }\n",
        production: false,
    })
    .expect("fixture must parse");
    assert!(
        over.iter()
            .any(|diagnostic| diagnostic.rule_id == "API-ARCH-010")
    );
}

#[test]
fn execute_requires_database_provenance_or_adapter_postgres_policy() {
    let clean = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/workflow.rs",
        source: "fn run() { workflow.execute(\"SELECT account context\"); }\n",
        production: true,
    })
    .expect("fixture must parse");
    assert!(
        clean
            .iter()
            .all(|diagnostic| diagnostic.rule_id != "API-ARCH-011")
    );

    for source in [
        "fn q(sql: &str) { connection.execute(sql); }",
        "fn q() { connection.execute(format!(\"DELETE FROM {}\", \"dogs\")); }",
        "fn q(sql: &str) { connection.execute_unprepared(sql); }",
    ] {
        let diagnostics = analyze_source(SourceUnit {
            crate_name: "adapter-postgres",
            path: "crates/adapter-postgres/src/repository.rs",
            source,
            production: true,
        })
        .expect("fixture must parse");
        assert!(
            diagnostics
                .iter()
                .any(|diagnostic| diagnostic.rule_id == "API-ARCH-011")
        );
    }
}

#[test]
fn trait_visibility_uses_qualified_lexical_identity() {
    let diagnostics = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/ports.rs",
        source: "pub trait Port { fn row(&self) -> adapter_postgres::Row; }\nmod hidden {\n    trait Port { fn row(&self) -> adapter_postgres::Row; }\n    struct Service;\n    impl Port for Service { fn row(&self) -> adapter_postgres::Row { loop {} } }\n}\nmod exposed {\n    pub trait Port { fn row(&self) -> adapter_postgres::Row; }\n    pub struct Service;\n    impl self::Port for Service { fn row(&self) -> adapter_postgres::Row { loop {} } }\n}\n",
        production: false,
    })
    .expect("fixture must parse");
    assert!(
        diagnostics
            .iter()
            .all(|diagnostic| { diagnostic.rule_id != "API-ARCH-006" || diagnostic.line != 5 })
    );
    assert!(
        diagnostics
            .iter()
            .any(|diagnostic| { diagnostic.rule_id == "API-ARCH-006" && diagnostic.line == 10 })
    );
}

#[test]
fn private_trait_impl_is_not_a_public_boundary_but_public_trait_impl_is() {
    let private = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/ports.rs",
        source: "trait PrivatePort { fn row(&self) -> adapter_postgres::Row; }\nstruct Service;\nimpl PrivatePort for Service { fn row(&self) -> adapter_postgres::Row { loop {} } }\n",
        production: false,
    })
    .expect("fixture must parse");
    assert!(
        private
            .iter()
            .all(|diagnostic| diagnostic.rule_id != "API-ARCH-006"),
        "private trait implementation is not an exported boundary: {private:?}"
    );

    let public = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/ports.rs",
        source: "pub trait PublicPort { fn row(&self) -> adapter_postgres::Row; }\npub struct Service;\nimpl PublicPort for Service { fn row(&self) -> adapter_postgres::Row { loop {} } }\n",
        production: false,
    })
    .expect("fixture must parse");
    assert!(
        public
            .iter()
            .any(|diagnostic| diagnostic.rule_id == "API-ARCH-006" && diagnostic.line == 3)
    );
}

#[test]
fn cross_file_trait_visibility_is_fail_closed_without_resolution() {
    let diagnostics = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/owner/service.rs",
        source: "struct Service;\nimpl crate::ports::Port for Service { fn row(&self) -> adapter_postgres::Row { loop {} } }\n",
        production: false,
    })
    .expect("fixture must parse");
    assert!(
        diagnostics
            .iter()
            .any(|diagnostic| diagnostic.rule_id == "API-ARCH-006")
    );
}

#[test]
fn mixed_filesystem_and_inline_modules_resolve_super_paths() {
    let diagnostics = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/owner/nested/update.rs",
        source: "mod deeper { fn related() -> super::super::super::super::dog::Dog { loop {} } }\n",
        production: false,
    })
    .expect("fixture must parse");
    assert!(
        diagnostics
            .iter()
            .any(|diagnostic| diagnostic.rule_id == "API-ARCH-010")
    );
}

#[test]
fn sea_orm_raw_statement_constructors_are_closed() {
    for constructor in ["from_string", "from_sql_and_values"] {
        let source = format!(
            "fn q() {{ sea_orm::Statement::{constructor}((), \"DELETE FROM dogs\", []); }}"
        );
        let diagnostics = analyze_source(SourceUnit {
            crate_name: "application",
            path: "crates/application/src/query.rs",
            source: &source,
            production: true,
        })
        .expect("fixture must parse");
        assert!(
            diagnostics
                .iter()
                .any(|diagnostic| diagnostic.rule_id == "API-ARCH-011")
        );
    }
}

#[test]
fn test_target_trait_collision_cannot_bypass_fail_closed_boundary() {
    let units = [
        SourceUnit {
            crate_name: "application",
            path: "crates/application/src/ports.rs",
            source: "trait Port { fn row(&self) -> adapter_postgres::Row; }",
            production: true,
        },
        SourceUnit {
            crate_name: "application",
            path: "crates/application/tests/ports.rs",
            source: "mod ports { pub trait Port { fn row(&self) -> adapter_postgres::Row; } }",
            production: false,
        },
        SourceUnit {
            crate_name: "application",
            path: "crates/application/src/owner/service.rs",
            source: "struct Service; impl crate::ports::Port for Service { fn row(&self) -> adapter_postgres::Row { loop {} } }",
            production: true,
        },
    ];
    let diagnostics = analyze_source_set(&units).expect("fixtures must parse");
    assert!(diagnostics.iter().any(|diagnostic| {
        diagnostic.rule_id == "API-ARCH-006"
            && diagnostic.path == "crates/application/src/owner/service.rs"
    }));
}

#[test]
fn inline_super_paths_use_the_analyzers_current_module() {
    let clean = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/owner.rs",
        source: "mod nested { fn dog() -> super::dog::Dog { loop {} } }",
        production: true,
    })
    .expect("fixture must parse");
    assert!(
        clean
            .iter()
            .all(|diagnostic| diagnostic.rule_id != "API-ARCH-010")
    );

    let cross = analyze_source(SourceUnit {
        crate_name: "application",
        path: "crates/application/src/owner.rs",
        source: "mod nested { fn dog() -> super::super::dog::Dog { loop {} } }",
        production: true,
    })
    .expect("fixture must parse");
    assert!(
        cross
            .iter()
            .any(|diagnostic| diagnostic.rule_id == "API-ARCH-010")
    );
}
