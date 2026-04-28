use crate::error::{AppError, FieldError};
use async_graphql::dynamic::{Field, FieldFuture, FieldValue, TypeRef};
use uuid::Uuid;

pub fn string_field<T, F>(name: &'static str, accessor: F) -> Field
where
    T: Send + Sync + 'static,
    F: Fn(&T) -> String + Send + Sync + Copy + 'static,
{
    Field::new(name, TypeRef::named_nn(TypeRef::STRING), move |ctx| {
        FieldFuture::new(async move {
            let value = ctx.parent_value.try_downcast_ref::<T>()?;
            Ok(Some(FieldValue::value(accessor(value))))
        })
    })
}

pub fn optional_string_field<T, F>(name: &'static str, accessor: F) -> Field
where
    T: Send + Sync + 'static,
    F: Fn(&T) -> Option<String> + Send + Sync + Copy + 'static,
{
    Field::new(name, TypeRef::named(TypeRef::STRING), move |ctx| {
        FieldFuture::new(async move {
            let value = ctx.parent_value.try_downcast_ref::<T>()?;
            Ok(accessor(value).map(FieldValue::value))
        })
    })
}

pub fn uuid_field<T, F>(name: &'static str, accessor: F) -> Field
where
    T: Send + Sync + 'static,
    F: Fn(&T) -> Uuid + Send + Sync + Copy + 'static,
{
    string_field(name, move |value: &T| accessor(value).to_string())
}

pub fn int_field<T, F>(name: &'static str, accessor: F) -> Field
where
    T: Send + Sync + 'static,
    F: Fn(&T) -> i32 + Send + Sync + Copy + 'static,
{
    Field::new(name, TypeRef::named_nn(TypeRef::INT), move |ctx| {
        FieldFuture::new(async move {
            let value = ctx.parent_value.try_downcast_ref::<T>()?;
            Ok(Some(FieldValue::value(accessor(value))))
        })
    })
}

pub fn optional_int_field<T, F>(name: &'static str, accessor: F) -> Field
where
    T: Send + Sync + 'static,
    F: Fn(&T) -> Option<i32> + Send + Sync + Copy + 'static,
{
    Field::new(name, TypeRef::named(TypeRef::INT), move |ctx| {
        FieldFuture::new(async move {
            let value = ctx.parent_value.try_downcast_ref::<T>()?;
            Ok(accessor(value).map(FieldValue::value))
        })
    })
}

pub fn float_field<T, F>(name: &'static str, accessor: F) -> Field
where
    T: Send + Sync + 'static,
    F: Fn(&T) -> f64 + Send + Sync + Copy + 'static,
{
    Field::new(name, TypeRef::named_nn(TypeRef::FLOAT), move |ctx| {
        FieldFuture::new(async move {
            let value = ctx.parent_value.try_downcast_ref::<T>()?;
            Ok(Some(FieldValue::value(accessor(value))))
        })
    })
}

pub fn optional_float_field<T, F>(name: &'static str, accessor: F) -> Field
where
    T: Send + Sync + 'static,
    F: Fn(&T) -> Option<f64> + Send + Sync + Copy + 'static,
{
    Field::new(name, TypeRef::named(TypeRef::FLOAT), move |ctx| {
        FieldFuture::new(async move {
            let value = ctx.parent_value.try_downcast_ref::<T>()?;
            Ok(accessor(value).map(FieldValue::value))
        })
    })
}

pub fn bool_field<T, F>(name: &'static str, accessor: F) -> Field
where
    T: Send + Sync + 'static,
    F: Fn(&T) -> bool + Send + Sync + Copy + 'static,
{
    Field::new(name, TypeRef::named_nn(TypeRef::BOOLEAN), move |ctx| {
        FieldFuture::new(async move {
            let value = ctx.parent_value.try_downcast_ref::<T>()?;
            Ok(Some(FieldValue::value(accessor(value))))
        })
    })
}

pub fn parse_uuid(value: &str, invalid_message: &'static str) -> async_graphql::Result<Uuid> {
    Uuid::parse_str(value)
        .map_err(|_| AppError::BadRequest(invalid_message.to_string()).into_graphql_error())
}

pub fn parse_uuid_with_field_error(
    value: &str,
    field: &'static str,
    errors: &mut Vec<FieldError>,
) -> Option<Uuid> {
    Uuid::parse_str(value).ok().or_else(|| {
        errors.push(FieldError {
            field: field.to_string(),
            message: "Invalid UUID format".to_string(),
        });
        None
    })
}

pub fn format_photo_cdn_url(photo_cdn_url: &str, key: &str) -> String {
    if key.starts_with("http") {
        key.to_string()
    } else {
        format!("{}/{}", photo_cdn_url, key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_uuid_accepts_valid_uuid() {
        let value = "11111111-2222-3333-4444-555555555555";
        assert_eq!(
            parse_uuid(value, "invalid").unwrap(),
            Uuid::parse_str(value).unwrap()
        );
    }

    #[test]
    fn parse_uuid_with_field_error_collects_validation_error() {
        let mut errors = Vec::new();
        let parsed = parse_uuid_with_field_error("not-a-uuid", "walkId", &mut errors);
        assert!(parsed.is_none());
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].field, "walkId");
    }

    #[test]
    fn format_photo_cdn_url_preserves_absolute_url() {
        assert_eq!(
            format_photo_cdn_url("https://cdn.example.com", "https://example.com/file.jpg"),
            "https://example.com/file.jpg"
        );
    }

    #[test]
    fn format_photo_cdn_url_prefixes_relative_key() {
        assert_eq!(
            format_photo_cdn_url("https://cdn.example.com", "dogs/file.jpg"),
            "https://cdn.example.com/dogs/file.jpg"
        );
    }
}
