use std::{collections::HashMap, env};

use async_graphql::Error;
use async_graphql::dynamic::{
    Field, FieldFuture, FieldValue, InputObject, InputValue, Object, TypeRef,
};
use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::Uuid;
use seaography::{CustomInputType, CustomOutputType, PageInfo, PaginationInfo, async_graphql};

const DEFAULT_TRACK_POINTS_TABLE: &str = "track_points";
pub const MAX_BATCH_WRITE_POINTS: usize = 25;
pub const DEFAULT_QUERY_LIMIT: i32 = 1000;
pub const MAX_QUERY_LIMIT: i32 = 5000;

pub const TRACK_POINTS_FILTER_INPUT: &str = "TrackPointsFilterInput";
pub const TRACK_POINTS_HAVING_INPUT: &str = "TrackPointsHavingInput";
pub const TRACK_POINTS_ORDER_INPUT: &str = "TrackPointsOrderInput";
pub const TRACK_POINTS_EDGE: &str = "TrackPointsEdge";
pub const TRACK_POINTS_CONNECTION: &str = "TrackPointsConnection";

#[derive(Clone, Debug, CustomOutputType)]
pub struct TrackPointBasic {
    pub walk_id: String,
    pub recorded_at: String,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Clone, Debug)]
pub struct TrackPointsEdge {
    pub cursor: String,
    pub node: TrackPointBasic,
}

#[derive(Clone, Debug)]
pub struct TrackPointsConnection {
    pub page_info: PageInfo,
    pub pagination_info: Option<PaginationInfo>,
    pub edges: Vec<TrackPointsEdge>,
}

pub fn track_points_input_objects() -> Vec<InputObject> {
    vec![
        track_points_filter_input(TRACK_POINTS_FILTER_INPUT),
        track_points_filter_input(TRACK_POINTS_HAVING_INPUT),
        InputObject::new(TRACK_POINTS_ORDER_INPUT)
            .field(InputValue::new("walkId", TypeRef::named("OrderByEnum")))
            .field(InputValue::new("recordedAt", TypeRef::named("OrderByEnum")))
            .field(InputValue::new("latitude", TypeRef::named("OrderByEnum")))
            .field(InputValue::new("longitude", TypeRef::named("OrderByEnum"))),
    ]
}

pub fn track_points_output_objects() -> Vec<Object> {
    vec![
        Object::new(TRACK_POINTS_EDGE)
            .field(Field::new(
                "cursor",
                TypeRef::named_nn(TypeRef::STRING),
                |ctx| {
                    FieldFuture::new(async move {
                        let edge = ctx.parent_value.try_downcast_ref::<TrackPointsEdge>()?;
                        Ok(Some(async_graphql::Value::from(edge.cursor.as_str())))
                    })
                },
            ))
            .field(Field::new(
                "node",
                TypeRef::named_nn("TrackPointBasic"),
                |ctx| {
                    FieldFuture::new(async move {
                        let edge = ctx.parent_value.try_downcast_ref::<TrackPointsEdge>()?;
                        Ok(Some(FieldValue::borrowed_any(&edge.node)))
                    })
                },
            )),
        Object::new(TRACK_POINTS_CONNECTION)
            .field(Field::new(
                "pageInfo",
                TypeRef::named_nn("PageInfo"),
                |ctx| {
                    FieldFuture::new(async move {
                        let connection = ctx
                            .parent_value
                            .try_downcast_ref::<TrackPointsConnection>()?;
                        Ok(Some(FieldValue::borrowed_any(&connection.page_info)))
                    })
                },
            ))
            .field(Field::new(
                "paginationInfo",
                TypeRef::named("PaginationInfo"),
                |ctx| {
                    FieldFuture::new(async move {
                        let connection = ctx
                            .parent_value
                            .try_downcast_ref::<TrackPointsConnection>()?;
                        Ok(connection
                            .pagination_info
                            .as_ref()
                            .map(|pagination_info| FieldValue::borrowed_any(pagination_info)))
                    })
                },
            ))
            .field(Field::new(
                "nodes",
                TypeRef::named_nn_list_nn("TrackPointBasic"),
                |ctx| {
                    FieldFuture::new(async move {
                        let connection = ctx
                            .parent_value
                            .try_downcast_ref::<TrackPointsConnection>()?;
                        Ok(Some(FieldValue::list(
                            connection
                                .edges
                                .iter()
                                .map(|edge| FieldValue::borrowed_any(&edge.node)),
                        )))
                    })
                },
            ))
            .field(Field::new(
                "edges",
                TypeRef::named_nn_list_nn(TRACK_POINTS_EDGE),
                |ctx| {
                    FieldFuture::new(async move {
                        let connection = ctx
                            .parent_value
                            .try_downcast_ref::<TrackPointsConnection>()?;
                        Ok(Some(FieldValue::list(
                            connection
                                .edges
                                .iter()
                                .map(|edge| FieldValue::borrowed_any(edge)),
                        )))
                    })
                },
            )),
    ]
}

fn track_points_filter_input(type_name: &str) -> InputObject {
    InputObject::new(type_name)
        .field(InputValue::new("walkId", TypeRef::named("TextFilterInput")))
        .field(InputValue::new(
            "recordedAt",
            TypeRef::named("TextFilterInput"),
        ))
        .field(InputValue::new(
            "latitude",
            TypeRef::named("FloatFilterInput"),
        ))
        .field(InputValue::new(
            "longitude",
            TypeRef::named("FloatFilterInput"),
        ))
        .field(InputValue::new("and", TypeRef::named_nn_list(type_name)))
        .field(InputValue::new("or", TypeRef::named_nn_list(type_name)))
        .field(InputValue::new("not", TypeRef::named(type_name)))
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
