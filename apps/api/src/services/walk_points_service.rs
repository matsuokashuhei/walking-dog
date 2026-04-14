use aws_sdk_dynamodb::{
    Client as DynamoClient,
    types::{AttributeValue, WriteRequest, PutRequest},
};
use uuid::Uuid;
use crate::error::AppError;

#[derive(Clone, Debug)]
pub struct WalkPoint {
    pub lat: f64,
    pub lng: f64,
    pub recorded_at: String,
}

pub struct WalkPointInput {
    pub lat: f64,
    pub lng: f64,
    pub recorded_at: String,
}

/// バッチ書き込み: DynamoDBは1回のバッチで最大25件まで
pub async fn add_walk_points(
    client: &DynamoClient,
    table_name: &str,
    walk_id: Uuid,
    points: Vec<WalkPointInput>,
) -> Result<bool, AppError> {
    if points.len() > 200 {
        return Err(AppError::BadRequest("batch size must be <= 200".to_string()));
    }

    if points.is_empty() {
        return Ok(true);
    }

    let pk = format!("WALK#{}", walk_id);
    let all_requests: Vec<WriteRequest> = points
        .iter()
        .map(|point| {
            let item = std::collections::HashMap::from([
                ("pk".to_string(), AttributeValue::S(pk.clone())),
                ("sk".to_string(), AttributeValue::S(format!("PT#{}", point.recorded_at))),
                ("lat".to_string(), AttributeValue::N(point.lat.to_string())),
                ("lng".to_string(), AttributeValue::N(point.lng.to_string())),
                ("recorded_at".to_string(), AttributeValue::S(point.recorded_at.clone())),
            ]);
            WriteRequest::builder()
                .put_request(PutRequest::builder().set_item(Some(item)).build().unwrap())
                .build()
        })
        .collect();

    // DynamoDBは1バッチ最大25件のため分割送信
    for chunk in all_requests.chunks(25) {
        client
            .batch_write_item()
            .request_items(table_name, chunk.to_vec())
            .send()
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
    }

    Ok(true)
}

/// WalkPointsをDynamoDBから取得してrecorded_at順にソート
pub async fn get_walk_points(
    client: &DynamoClient,
    table_name: &str,
    walk_id: Uuid,
) -> Result<Vec<WalkPoint>, AppError> {
    let pk = format!("WALK#{}", walk_id);
    let result = client
        .query()
        .table_name(table_name)
        .key_condition_expression("pk = :pk")
        .expression_attribute_values(":pk", AttributeValue::S(pk))
        .send()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let mut points: Vec<WalkPoint> = result
        .items()
        .iter()
        .filter_map(|item| {
            let lat = item.get("lat")?.as_n().ok()?.parse().ok()?;
            let lng = item.get("lng")?.as_n().ok()?.parse().ok()?;
            let recorded_at = item.get("recorded_at")?.as_s().ok()?.clone();
            Some(WalkPoint { lat, lng, recorded_at })
        })
        .collect();

    // recorded_at でソート
    points.sort_by(|a, b| a.recorded_at.cmp(&b.recorded_at));
    Ok(points)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dynamodb_batch_write_limit_is_25() {
        assert_eq!(DYNAMODB_BATCH_WRITE_LIMIT, 25);
    }
}
