use anyhow::{Result, anyhow};
use aws_sdk_dynamodb::{
    operation::{batch_write_item::BatchWriteItemError, put_item::PutItemError, query::QueryError},
    types::{AttributeValue, PutRequest, WriteRequest},
};
use std::collections::HashMap;
use tokio::time::{Duration, sleep};
use tracing::{error, warn};
use uuid::Uuid;

const DYNAMO_BATCH_WRITE_MAX: usize = 25;
const BATCH_WRITE_MAX_RETRIES: u32 = 3;

pub struct Model {
    pub walk_id: Uuid,
    pub tracked_at: chrono::DateTime<chrono::Utc>,
    pub latitude: f64,
    pub longitude: f64,
}

impl Model {
    pub fn new(
        walk_id: Uuid,
        tracked_at: chrono::DateTime<chrono::Utc>,
        latitude: f64,
        longitude: f64,
    ) -> Self {
        Self {
            walk_id,
            tracked_at,
            latitude,
            longitude,
        }
    }

    pub async fn put(&self, client: &aws_sdk_dynamodb::Client) -> Result<()> {
        let table_name = std::env::var("AWS_DYNAMODB_TABLE_TRACK_POINT").unwrap();
        client
            .put_item()
            .table_name(table_name)
            .item("walk_id", AttributeValue::S(self.walk_id.to_string()))
            .item(
                "tracked_at",
                AttributeValue::N(self.tracked_at.timestamp_micros().to_string()),
            )
            .item("latitude", AttributeValue::N(self.latitude.to_string()))
            .item("longitude", AttributeValue::N(self.longitude.to_string()))
            .send()
            .await
            .map_err(|e| TrackPointError::PutItemError(e.into_service_error()))?;
        Ok(())
    }

    pub async fn batch_put_write(
        client: &aws_sdk_dynamodb::Client,
        models: &[Model],
    ) -> Result<()> {
        if models.is_empty() {
            return Ok(());
        }

        let table_name = std::env::var("AWS_DYNAMODB_TABLE_TRACK_POINT").unwrap();

        for chunk in models.chunks(DYNAMO_BATCH_WRITE_MAX) {
            let write_requests: Vec<WriteRequest> = chunk
                .iter()
                .map(|model| {
                    WriteRequest::builder()
                        .put_request(
                            PutRequest::builder()
                                .item("walk_id", AttributeValue::S(model.walk_id.to_string()))
                                .item(
                                    "tracked_at",
                                    AttributeValue::N(
                                        model.tracked_at.timestamp_micros().to_string(),
                                    ),
                                )
                                .item("latitude", AttributeValue::N(model.latitude.to_string()))
                                .item("longitude", AttributeValue::N(model.longitude.to_string()))
                                .build()
                                .expect("PutRequest build should not fail"),
                        )
                        .build()
                })
                .collect();

            let mut unprocessed = Some(write_requests);

            for attempt in 0..=BATCH_WRITE_MAX_RETRIES {
                let requests = match unprocessed.take() {
                    Some(r) if !r.is_empty() => r,
                    _ => break,
                };

                let output = client
                    .batch_write_item()
                    .request_items(&table_name, requests)
                    .send()
                    .await
                    .map_err(|e| TrackPointError::BatchWriteItemError(e.into_service_error()))?;

                let remaining = output
                    .unprocessed_items()
                    .and_then(|items| items.get(&table_name))
                    .cloned()
                    .unwrap_or_default();

                if remaining.is_empty() {
                    break;
                }

                if attempt == BATCH_WRITE_MAX_RETRIES {
                    error!(
                        remaining_count = remaining.len(),
                        "batch_put_write: unprocessed items remain after max retries"
                    );
                    return Err(anyhow!(
                        "batch_put_write failed: {} items unprocessed after {} retries",
                        remaining.len(),
                        BATCH_WRITE_MAX_RETRIES
                    ));
                }

                warn!(
                    attempt,
                    remaining_count = remaining.len(),
                    "batch_put_write: retrying unprocessed items"
                );
                let backoff = Duration::from_millis(100 * 2u64.pow(attempt));
                sleep(backoff).await;
                unprocessed = Some(remaining);
            }
        }

        Ok(())
    }

    pub async fn find_by_walk_id_and_tracked_at(
        client: &aws_sdk_dynamodb::Client,
        walk_id: Uuid,
        tracked_at: chrono::DateTime<chrono::Utc>,
    ) -> Result<Option<Model>> {
        let table_name = std::env::var("AWS_DYNAMODB_TABLE_TRACK_POINT").unwrap();
        let output = client
            .query()
            .table_name(table_name)
            .key_condition_expression("walk_id = :walk_id AND tracked_at = :tracked_at")
            .expression_attribute_values(":walk_id", AttributeValue::S(walk_id.to_string()))
            .expression_attribute_values(
                ":tracked_at",
                AttributeValue::N(tracked_at.timestamp_micros().to_string()),
            )
            .send()
            .await
            .map_err(|e| TrackPointError::QueryError(e.into_service_error()))?;
        let items = output.items();
        let Some(item) = items.first() else {
            warn!(
                "No track point found for walk_id {} at tracked_at {}",
                walk_id, tracked_at
            );
            return Ok(None);
        };
        Ok(Some(Model::try_from(item)?))
    }

    pub async fn find_all_by_walk_id(
        client: &aws_sdk_dynamodb::Client,
        walk_id: Uuid,
    ) -> Result<Vec<Model>> {
        let table_name = std::env::var("AWS_DYNAMODB_TABLE_TRACK_POINT").unwrap();
        let output = client
            .query()
            .table_name(table_name)
            .key_condition_expression("walk_id = :walk_id")
            .expression_attribute_values(":walk_id", AttributeValue::S(walk_id.to_string()))
            .send()
            .await
            .map_err(|e| TrackPointError::QueryError(e.into_service_error()))?;

        let items = output
            .items()
            .iter()
            .map(Model::try_from)
            .collect::<Result<Vec<_>>>()?;

        Ok(items)
    }
}

impl TryFrom<&HashMap<String, AttributeValue>> for Model {
    type Error = anyhow::Error;

    fn try_from(attributes: &HashMap<String, AttributeValue>) -> Result<Self> {
        let walk_id = attributes
            .get("walk_id")
            .and_then(|v| {
                if let AttributeValue::S(s) = v {
                    Uuid::parse_str(s).ok()
                } else {
                    error!("Expected walk_id to be a string, got {:?}", v);
                    None
                }
            })
            .ok_or_else(|| anyhow!("Invalid or missing walk_id"))?;

        let tracked_at = attributes
            .get("tracked_at")
            .and_then(|v| {
                if let AttributeValue::N(n) = v {
                    n.parse::<i64>().ok()
                } else {
                    error!("Expected tracked_at to be a number, got {:?}", v);
                    None
                }
            })
            .and_then(chrono::DateTime::from_timestamp_micros)
            .ok_or_else(|| anyhow!("Invalid or missing tracked_at"))?;

        let latitude = attributes
            .get("latitude")
            .and_then(|v| {
                if let AttributeValue::N(n) = v {
                    n.parse::<f64>().ok()
                } else {
                    error!("Expected latitude to be a number, got {:?}", v);
                    None
                }
            })
            .ok_or_else(|| anyhow!("Invalid or missing latitude"))?;

        let longitude = attributes
            .get("longitude")
            .and_then(|v| {
                if let AttributeValue::N(n) = v {
                    n.parse::<f64>().ok()
                } else {
                    error!("Expected longitude to be a number, got {:?}", v);
                    None
                }
            })
            .ok_or_else(|| anyhow!("Invalid or missing longitude"))?;

        Ok(Model {
            walk_id,
            tracked_at,
            latitude,
            longitude,
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TrackPointError {
    #[error("Put item error")]
    PutItemError(#[source] PutItemError),
    #[error("Batch write item error")]
    BatchWriteItemError(#[source] BatchWriteItemError),
    #[error("Query error")]
    QueryError(#[source] QueryError),
}

#[cfg(test)]
mod tests {
    use std::error::Error as _;

    use aws_sdk_dynamodb::operation::query::QueryError;

    use super::*;
    use crate::util::error::format_error_chain;

    #[test]
    fn track_point_error_preserves_dynamodb_query_source_chain() {
        #[derive(Debug)]
        struct ThrottlingException;

        impl std::fmt::Display for ThrottlingException {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "ThrottlingException")
            }
        }

        impl std::error::Error for ThrottlingException {}

        #[derive(Debug)]
        struct QueryFailure(ThrottlingException);

        impl std::fmt::Display for QueryFailure {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "DynamoDB Query failed")
            }
        }

        impl std::error::Error for QueryFailure {
            fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
                Some(&self.0)
            }
        }

        let error =
            TrackPointError::QueryError(QueryError::unhandled(QueryFailure(ThrottlingException)));
        assert!(error.source().is_some());

        let chain = format_error_chain(&error);
        assert!(chain.contains("Query error"), "{chain}");
        assert!(chain.contains("DynamoDB Query failed"), "{chain}");
        assert!(chain.contains("ThrottlingException"), "{chain}");
    }
}
