use crate::error::AppError;
use aws_sdk_dynamodb::{
    types::{AttributeValue, PutRequest, WriteRequest},
    Client as DynamoClient,
};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

/// Maximum number of write requests per DynamoDB BatchWriteItem call.
/// See: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
const DYNAMODB_BATCH_WRITE_LIMIT: usize = 25;

// ─── DynamoDB schema authority ───────────────────────────────────────────────
// Every bit of knowledge about how walk points are stored in DynamoDB lives
// here. Callers should not need to know the attribute names, key prefixes, or
// types. If the schema changes, this block is the only place that changes.

const PK_ATTR: &str = "pk";
const SK_ATTR: &str = "sk";
const LAT_ATTR: &str = "lat";
const LNG_ATTR: &str = "lng";
const RECORDED_AT_ATTR: &str = "recorded_at";

/// Partition key for all points belonging to a walk.
fn walk_partition_key(walk_id: Uuid) -> String {
    format!("WALK#{}", walk_id)
}

/// Sort key for an individual point within a walk's partition.
fn walk_point_sort_key(recorded_at: &str) -> String {
    format!("PT#{}", recorded_at)
}

/// Build the DynamoDB item representation of a single walk point.
fn build_point_item(walk_id: Uuid, point: &WalkPointInput) -> HashMap<String, AttributeValue> {
    HashMap::from([
        (
            PK_ATTR.to_string(),
            AttributeValue::S(walk_partition_key(walk_id)),
        ),
        (
            SK_ATTR.to_string(),
            AttributeValue::S(walk_point_sort_key(&point.recorded_at)),
        ),
        (LAT_ATTR.to_string(), AttributeValue::N(point.lat.to_string())),
        (LNG_ATTR.to_string(), AttributeValue::N(point.lng.to_string())),
        (
            RECORDED_AT_ATTR.to_string(),
            AttributeValue::S(point.recorded_at.clone()),
        ),
    ])
}

/// Parse a DynamoDB item back into a `WalkPoint`. Returns `None` if any
/// required attribute is missing or the wrong type — the caller should
/// treat missing rows as silently dropped (legacy data tolerance).
fn parse_point_row(item: &HashMap<String, AttributeValue>) -> Option<WalkPoint> {
    let lat = item.get(LAT_ATTR)?.as_n().ok()?.parse().ok()?;
    let lng = item.get(LNG_ATTR)?.as_n().ok()?.parse().ok()?;
    let recorded_at = item.get(RECORDED_AT_ATTR)?.as_s().ok()?.clone();
    Some(WalkPoint {
        lat,
        lng,
        recorded_at,
    })
}

/// 同じ `recorded_at` を持つ point を 1 件に縮約する（最初に出現したものを保持）。
///
/// DynamoDB `BatchWriteItem` は同一バッチ内に同じ primary key を持つ
/// `WriteRequest` を許容しない（`ValidationException: "Provided list of item
/// keys contains duplicates"`）。`(walk_id, recorded_at)` が PK/SK なので、
/// `recorded_at` が一致する 2 件は同じキーとして衝突する。
fn dedup_points_by_recorded_at(points: Vec<WalkPointInput>) -> Vec<WalkPointInput> {
    let mut seen: HashSet<String> = HashSet::new();
    points
        .into_iter()
        .filter(|p| seen.insert(p.recorded_at.clone()))
        .collect()
}

// ─── Public API ──────────────────────────────────────────────────────────────

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

/// バッチ書き込み: DynamoDBは1回のバッチで最大 DYNAMODB_BATCH_WRITE_LIMIT 件まで
pub async fn add_walk_points(
    client: &DynamoClient,
    table_name: &str,
    walk_id: Uuid,
    points: Vec<WalkPointInput>,
) -> Result<bool, AppError> {
    if points.len() > 200 {
        return Err(AppError::BadRequest(
            "batch size must be <= 200".to_string(),
        ));
    }

    if points.is_empty() {
        return Ok(true);
    }

    // 同一 batch 内で `(pk, sk)` が重複すると DynamoDB が
    // `ValidationException: "Provided list of item keys contains duplicates"`
    // を返してバッチごと拒否する。送信前に recorded_at で dedup する。
    let points = dedup_points_by_recorded_at(points);

    let all_requests: Vec<WriteRequest> = points
        .iter()
        .map(|point| {
            let item = build_point_item(walk_id, point);
            WriteRequest::builder()
                .put_request(PutRequest::builder().set_item(Some(item)).build().unwrap())
                .build()
        })
        .collect();

    // DynamoDBは1バッチ最大 DYNAMODB_BATCH_WRITE_LIMIT 件のため分割送信
    for chunk in all_requests.chunks(DYNAMODB_BATCH_WRITE_LIMIT) {
        client
            .batch_write_item()
            .request_items(table_name, chunk.to_vec())
            .send()
            .await
            .map_err(|e| {
                tracing::error!(
                    error = ?e,
                    table = table_name,
                    walk_id = %walk_id,
                    batch_size = chunk.len(),
                    "DynamoDB BatchWriteItem failed"
                );
                AppError::Internal(format!(
                    "DynamoDB BatchWriteItem: {}",
                    crate::error::format_error_chain(&e)
                ))
            })?;
    }

    Ok(true)
}

/// WalkPointsをDynamoDBから取得してrecorded_at順にソート
pub async fn get_walk_points(
    client: &DynamoClient,
    table_name: &str,
    walk_id: Uuid,
) -> Result<Vec<WalkPoint>, AppError> {
    // Static expression literal. Must stay in sync with `PK_ATTR`.
    let result = client
        .query()
        .table_name(table_name)
        .key_condition_expression("pk = :pk")
        .expression_attribute_values(":pk", AttributeValue::S(walk_partition_key(walk_id)))
        .send()
        .await
        .map_err(|e| {
            tracing::error!(
                error = ?e,
                table = table_name,
                walk_id = %walk_id,
                "DynamoDB Query failed"
            );
            AppError::Internal(format!(
                "DynamoDB Query: {}",
                crate::error::format_error_chain(&e)
            ))
        })?;

    let mut points: Vec<WalkPoint> = result.items().iter().filter_map(parse_point_row).collect();

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

    #[test]
    fn walk_partition_key_has_stable_format() {
        // Existing rows in the `walk_points` table use this exact prefix;
        // changing it is a breaking migration.
        let walk_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").unwrap();
        assert_eq!(
            walk_partition_key(walk_id),
            "WALK#11111111-2222-3333-4444-555555555555"
        );
    }

    #[test]
    fn walk_point_sort_key_has_stable_format() {
        assert_eq!(
            walk_point_sort_key("2026-04-24T10:00:00Z"),
            "PT#2026-04-24T10:00:00Z"
        );
    }

    #[test]
    fn build_point_item_produces_all_required_attributes() {
        let walk_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").unwrap();
        let input = WalkPointInput {
            lat: 35.6812,
            lng: 139.7671,
            recorded_at: "2026-04-24T10:00:00Z".to_string(),
        };
        let item = build_point_item(walk_id, &input);

        assert_eq!(
            item.get(PK_ATTR).and_then(|v| v.as_s().ok()),
            Some(&walk_partition_key(walk_id))
        );
        assert_eq!(
            item.get(SK_ATTR).and_then(|v| v.as_s().ok()),
            Some(&walk_point_sort_key("2026-04-24T10:00:00Z"))
        );
        assert!(item.contains_key(LAT_ATTR));
        assert!(item.contains_key(LNG_ATTR));
        assert!(item.contains_key(RECORDED_AT_ATTR));
    }

    #[test]
    fn parse_point_row_roundtrips_build_point_item() {
        let walk_id = Uuid::parse_str("11111111-2222-3333-4444-555555555555").unwrap();
        let input = WalkPointInput {
            lat: 35.6812,
            lng: 139.7671,
            recorded_at: "2026-04-24T10:00:00Z".to_string(),
        };
        let item = build_point_item(walk_id, &input);
        let parsed = parse_point_row(&item).expect("built item must parse");

        assert!((parsed.lat - 35.6812).abs() < 1e-9);
        assert!((parsed.lng - 139.7671).abs() < 1e-9);
        assert_eq!(parsed.recorded_at, "2026-04-24T10:00:00Z");
    }

    #[test]
    fn parse_point_row_returns_none_when_attribute_missing() {
        let mut item = HashMap::new();
        item.insert(LAT_ATTR.to_string(), AttributeValue::N("35.0".to_string()));
        // lng and recorded_at are missing
        assert!(parse_point_row(&item).is_none());
    }

    fn make_point(recorded_at: &str, lat: f64) -> WalkPointInput {
        WalkPointInput {
            lat,
            lng: 139.0,
            recorded_at: recorded_at.to_string(),
        }
    }

    #[test]
    fn dedup_points_by_recorded_at_keeps_first_occurrence_of_duplicate() {
        // DynamoDB BatchWriteItem の `(pk, sk)` 重複は ValidationException を引き起こす。
        // 同じ recorded_at の point が 2 つ以上含まれていたら、先に来たものを保持する。
        let points = vec![
            make_point("2026-04-26T02:45:35.951Z", 35.6),
            make_point("2026-04-26T02:45:35.951Z", 35.7),
            make_point("2026-04-26T02:45:40.000Z", 35.8),
        ];

        let deduped = dedup_points_by_recorded_at(points);

        assert_eq!(deduped.len(), 2);
        assert!((deduped[0].lat - 35.6).abs() < 1e-9);
        assert_eq!(deduped[0].recorded_at, "2026-04-26T02:45:35.951Z");
        assert_eq!(deduped[1].recorded_at, "2026-04-26T02:45:40.000Z");
    }

    #[test]
    fn dedup_points_by_recorded_at_preserves_order_when_no_duplicates() {
        let points = vec![
            make_point("2026-04-26T02:45:35.000Z", 1.0),
            make_point("2026-04-26T02:45:36.000Z", 2.0),
            make_point("2026-04-26T02:45:37.000Z", 3.0),
        ];

        let deduped = dedup_points_by_recorded_at(points);

        assert_eq!(deduped.len(), 3);
        assert_eq!(deduped[0].recorded_at, "2026-04-26T02:45:35.000Z");
        assert_eq!(deduped[1].recorded_at, "2026-04-26T02:45:36.000Z");
        assert_eq!(deduped[2].recorded_at, "2026-04-26T02:45:37.000Z");
    }

    #[test]
    fn dedup_points_by_recorded_at_returns_empty_for_empty_input() {
        let deduped = dedup_points_by_recorded_at(Vec::new());
        assert!(deduped.is_empty());
    }
}
