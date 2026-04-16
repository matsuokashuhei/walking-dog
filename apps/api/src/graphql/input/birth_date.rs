use async_graphql::dynamic::ValueAccessor;

use crate::graphql::mutations::BirthDate;

/// Parse the optional `BirthDateInput` object from GraphQL input into a JSON value
/// suitable for storage in the `birth_date` column.
///
/// Returns `Ok(None)` when the field is absent, `Ok(Some(json))` when present and valid,
/// or an `Err` when the field value cannot be parsed.
pub fn parse_birth_date_input(
    value: Option<ValueAccessor<'_>>,
) -> Result<Option<serde_json::Value>, async_graphql::Error> {
    value
        .map(|v| {
            let obj = v.object()?;
            let year = obj
                .get("year")
                .map(|v| v.i64().map(|n| n as i32))
                .transpose()?;
            let month = obj
                .get("month")
                .map(|v| v.i64().map(|n| n as i32))
                .transpose()?;
            let day = obj
                .get("day")
                .map(|v| v.i64().map(|n| n as i32))
                .transpose()?;
            Ok(BirthDate::to_json(year, month, day))
        })
        .transpose()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_birth_date_input_returns_none_when_field_absent() {
        let result = parse_birth_date_input(None);
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn birth_date_to_json_produces_correct_shape() {
        let json = BirthDate::to_json(Some(2020), Some(3), Some(15));
        assert_eq!(json["year"], 2020);
        assert_eq!(json["month"], 3);
        assert_eq!(json["day"], 15);
    }

    #[test]
    fn birth_date_to_json_omits_absent_fields() {
        let json = BirthDate::to_json(Some(2020), None, None);
        assert_eq!(json["year"], 2020);
        assert!(json.get("month").is_none());
        assert!(json.get("day").is_none());
    }
}
