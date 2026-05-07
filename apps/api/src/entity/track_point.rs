use anyhow::{Result, anyhow};
use aws_sdk_dynamodb::{operation::put_item::PutItemOutput, types::AttributeValue};
use std::collections::HashMap;
use tracing::{error, warn};
use uuid::Uuid;

use crate::entity;

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

    pub async fn put(&self, client: &aws_sdk_dynamodb::Client) -> Result<Model> {
        let _ = client
            .put_item()
            .table_name("track_point")
            .item("walk_id", AttributeValue::S(self.walk_id.to_string()))
            .item(
                "tracked_at",
                AttributeValue::N(self.tracked_at.timestamp_micros().to_string()),
            )
            .item("latitude", AttributeValue::N(self.latitude.to_string()))
            .item("longitude", AttributeValue::N(self.longitude.to_string()))
            .send()
            .await
            .map_err(|e| {
                error!("Failed to find walk: {:?}", e);
                anyhow!(e)
            })?;
        let output = entity::track_point::Model::find_by_walk_id_and_tracked_at(
            client,
            self.walk_id,
            self.tracked_at,
        )
        .await?;
        output.ok_or_else(|| {
            error!(
                "Failed to find track point after insert for walk_id {} at tracked_at {}",
                self.walk_id, self.tracked_at
            );
            anyhow!("Failed to find inserted track point")
        })
    }

    pub async fn find_by_walk_id_and_tracked_at(
        client: &aws_sdk_dynamodb::Client,
        walk_id: Uuid,
        tracked_at: chrono::DateTime<chrono::Utc>,
    ) -> Result<Option<Model>> {
        client
            .query()
            .table_name("track_point")
            .key_condition_expression("walk_id = :walk_id AND tracked_at = :tracked_at")
            .expression_attribute_values(":walk_id", AttributeValue::S(walk_id.to_string()))
            .expression_attribute_values(
                ":tracked_at",
                AttributeValue::N(tracked_at.timestamp_micros().to_string()),
            )
            .send()
            .await
            .map_err(|e| {
                error!("Failed to query track point: {:?}", e);
                anyhow!(e)
            })
            .and_then(|output| {
                let items = output.items();
                let Some(item) = items.first() else {
                    warn!(
                        "No track point found for walk_id {} at tracked_at {}",
                        walk_id, tracked_at
                    );
                    return Ok(None);
                };
                Ok(Some(Model::try_from(item)?))
            })
    }

    pub async fn find_all_by_walk_id(
        client: &aws_sdk_dynamodb::Client,
        walk_id: Uuid,
    ) -> Result<Vec<Model>> {
        let output = client
            .query()
            .table_name("track_point")
            .key_condition_expression("walk_id = :walk_id")
            .expression_attribute_values(":walk_id", AttributeValue::S(walk_id.to_string()))
            .send()
            .await
            .map_err(|e| {
                error!("Failed to query track points: {:?}", e);
                anyhow!(e)
            })?;

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

impl TryFrom<PutItemOutput> for Model {
    type Error = anyhow::Error;

    fn try_from(output: PutItemOutput) -> Result<Self> {
        let attributes = output
            .attributes
            .ok_or_else(|| anyhow!("PutItemOutput missing attributes"))?;
        Model::try_from(&attributes)
    }
}
