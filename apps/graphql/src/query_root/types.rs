use std::{collections::HashMap, env};

use async_graphql::Error;
use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::Uuid;
use seaography::{CustomInputType, CustomOutputType, async_graphql};

const DEFAULT_TRACK_POINTS_TABLE: &str = "track_points";
pub const MAX_BATCH_WRITE_POINTS: usize = 25;
pub const DEFAULT_QUERY_LIMIT: i32 = 1000;
pub const MAX_QUERY_LIMIT: i32 = 5000;

#[derive(Clone, CustomOutputType)]
pub struct TrackPointBasic {
    pub walk_id: String,
    pub recorded_at: String,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Clone, CustomInputType)]
pub struct TrackPointCreateInput {
    pub walk_id: String,
    pub recorded_at: String,
    pub latitude: f64,
    pub longitude: f64,
}

impl TrackPointCreateInput {
    pub fn validate(self) -> async_graphql::Result<ValidatedTrackPoint> {
        validate_walk_id(&self.walk_id)?;
        validate_coordinate("latitude", self.latitude, -90.0, 90.0)?;
        validate_coordinate("longitude", self.longitude, -180.0, 180.0)?;

        let recorded_at = parse_recorded_at(&self.recorded_at)?;
        Ok(ValidatedTrackPoint {
            output: TrackPointBasic {
                walk_id: self.walk_id,
                recorded_at: format_recorded_at(recorded_at),
                latitude: self.latitude,
                longitude: self.longitude,
            },
            recorded_at_epoch_millis: recorded_at.timestamp_millis(),
        })
    }
}

pub struct ValidatedTrackPoint {
    pub output: TrackPointBasic,
    pub recorded_at_epoch_millis: i64,
}

pub fn track_points_table_name() -> String {
    env::var("TRACK_POINTS_TABLE").unwrap_or_else(|_| DEFAULT_TRACK_POINTS_TABLE.to_string())
}

impl ValidatedTrackPoint {
    pub fn into_item(self) -> HashMap<String, AttributeValue> {
        HashMap::from([
            (
                "walk_id".to_string(),
                AttributeValue::S(self.output.walk_id),
            ),
            (
                "recorded_at".to_string(),
                AttributeValue::N(self.recorded_at_epoch_millis.to_string()),
            ),
            (
                "latitude".to_string(),
                AttributeValue::N(self.output.latitude.to_string()),
            ),
            (
                "longitude".to_string(),
                AttributeValue::N(self.output.longitude.to_string()),
            ),
        ])
    }
}

pub fn track_point_from_item(
    item: HashMap<String, AttributeValue>,
) -> async_graphql::Result<TrackPointBasic> {
    let walk_id = required_string(&item, "walk_id")?.to_string();
    let recorded_at_epoch_millis = required_number(&item, "recorded_at")?
        .parse::<i64>()
        .map_err(|e| Error::new(format!("invalid recorded_at value in DynamoDB item: {e}")))?;
    let latitude = required_number(&item, "latitude")?
        .parse::<f64>()
        .map_err(|e| Error::new(format!("invalid latitude value in DynamoDB item: {e}")))?;
    let longitude = required_number(&item, "longitude")?
        .parse::<f64>()
        .map_err(|e| Error::new(format!("invalid longitude value in DynamoDB item: {e}")))?;
    let recorded_at = DateTime::<Utc>::from_timestamp_millis(recorded_at_epoch_millis)
        .ok_or_else(|| Error::new("invalid recorded_at epoch milliseconds in DynamoDB item"))?;

    Ok(TrackPointBasic {
        walk_id,
        recorded_at: format_recorded_at(recorded_at),
        latitude,
        longitude,
    })
}

pub fn validate_walk_id(walk_id: &str) -> async_graphql::Result<()> {
    Uuid::parse_str(walk_id)
        .map(|_| ())
        .map_err(|e| Error::new(format!("walk_id must be a valid UUID: {e}")))
}

pub fn normalize_query_limit(limit: Option<i32>) -> async_graphql::Result<i32> {
    let limit = limit.unwrap_or(DEFAULT_QUERY_LIMIT);
    if !(1..=MAX_QUERY_LIMIT).contains(&limit) {
        return Err(Error::new(format!(
            "limit must be between 1 and {MAX_QUERY_LIMIT}"
        )));
    }
    Ok(limit)
}

fn parse_recorded_at(value: &str) -> async_graphql::Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|e| Error::new(format!("recorded_at must be RFC3339 datetime: {e}")))
}

fn format_recorded_at(value: DateTime<Utc>) -> String {
    value.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn validate_coordinate(name: &str, value: f64, min: f64, max: f64) -> async_graphql::Result<()> {
    if !value.is_finite() || value < min || value > max {
        return Err(Error::new(format!(
            "{name} must be between {min} and {max}"
        )));
    }
    Ok(())
}

fn required_string<'a>(
    item: &'a HashMap<String, AttributeValue>,
    key: &str,
) -> async_graphql::Result<&'a str> {
    match item.get(key) {
        Some(AttributeValue::S(value)) => Ok(value),
        Some(_) => Err(Error::new(format!(
            "{key} must be a string in DynamoDB item"
        ))),
        None => Err(Error::new(format!("missing {key} in DynamoDB item"))),
    }
}

fn required_number<'a>(
    item: &'a HashMap<String, AttributeValue>,
    key: &str,
) -> async_graphql::Result<&'a str> {
    match item.get(key) {
        Some(AttributeValue::N(value)) => Ok(value),
        Some(_) => Err(Error::new(format!(
            "{key} must be a number in DynamoDB item"
        ))),
        None => Err(Error::new(format!("missing {key} in DynamoDB item"))),
    }
}
