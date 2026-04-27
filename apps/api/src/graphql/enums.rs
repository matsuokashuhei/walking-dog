use async_graphql::dynamic::{Enum, EnumItem};

pub fn walk_status_enum() -> Enum {
    Enum::new("WalkStatus")
        .item(EnumItem::new("ACTIVE"))
        .item(EnumItem::new("FINISHED"))
}

pub fn walk_event_type_enum() -> Enum {
    Enum::new("WalkEventType")
        .item(EnumItem::new("PEE"))
        .item(EnumItem::new("POO"))
        .item(EnumItem::new("PHOTO"))
}

pub fn period_enum() -> Enum {
    Enum::new("Period")
        .item(EnumItem::new("WEEK"))
        .item(EnumItem::new("MONTH"))
        .item(EnumItem::new("YEAR"))
        .item(EnumItem::new("ALL"))
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    fn assert_graphql_enum_matches<T, F>(graphql_variants: &[&str], parse: F)
    where
        F: Fn(&str) -> Result<T, String>,
    {
        for g in graphql_variants {
            parse(g).unwrap_or_else(|e| {
                panic!(
                    "GraphQL enum variant `{}` does not map back to a domain variant: {}",
                    g, e
                )
            });
        }
    }

    #[test]
    fn walk_status_graphql_enum_round_trips_through_domain() {
        use crate::entities::walks::WalkStatus;
        assert_graphql_enum_matches(&["ACTIVE", "FINISHED"], |g| {
            WalkStatus::from_str(&g.to_ascii_lowercase())
        });
    }

    #[test]
    fn walk_event_type_graphql_enum_round_trips_through_domain() {
        use crate::services::walk_event_service::WalkEventType;
        assert_graphql_enum_matches(&["PEE", "POO", "PHOTO"], |g| {
            WalkEventType::from_str(&g.to_ascii_lowercase()).map_err(|e| format!("{:?}", e))
        });
    }

    #[test]
    fn period_graphql_enum_round_trips_through_domain() {
        use crate::services::walk_service::Period;
        assert_graphql_enum_matches(&["WEEK", "MONTH", "YEAR", "ALL"], Period::from_str);
    }
}
