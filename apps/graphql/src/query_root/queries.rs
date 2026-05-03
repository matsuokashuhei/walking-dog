use std::cmp::Ordering;

use aws_sdk_dynamodb::types::AttributeValue;
use seaography::{
    BuilderContext, CustomFields, CustomInputType, PaginationInfo, PaginationInput, async_graphql,
    async_graphql::dynamic::{Field, FieldFuture, FieldValue, InputValue, TypeRef, ValueAccessor},
};

use super::types::{
    DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT, TRACK_POINTS_CONNECTION, TRACK_POINTS_FILTER_INPUT,
    TRACK_POINTS_HAVING_INPUT, TRACK_POINTS_ORDER_INPUT, TrackPointBasic, TrackPointsConnection,
    TrackPointsEdge, track_point_from_item, track_points_table_name,
};

#[derive(Clone, Default)]
struct TrackPointsFilter {
    walk_id: Option<TextFilter>,
    recorded_at: Option<TextFilter>,
    latitude: Option<FloatFilter>,
    longitude: Option<FloatFilter>,
    and: Vec<TrackPointsFilter>,
    or: Vec<TrackPointsFilter>,
    not: Option<Box<TrackPointsFilter>>,
}

#[derive(Clone, Default)]
struct TextFilter {
    eq: Option<String>,
    ne: Option<String>,
    gt: Option<String>,
    gte: Option<String>,
    lt: Option<String>,
    lte: Option<String>,
    is_in: Option<Vec<String>>,
    is_not_in: Option<Vec<String>>,
    is_null: Option<bool>,
    between: Option<(String, String)>,
    not_between: Option<(String, String)>,
}

#[derive(Clone, Default)]
struct FloatFilter {
    eq: Option<f64>,
    ne: Option<f64>,
    gt: Option<f64>,
    gte: Option<f64>,
    lt: Option<f64>,
    lte: Option<f64>,
    is_in: Option<Vec<f64>>,
    is_not_in: Option<Vec<f64>>,
    is_null: Option<bool>,
    between: Option<(f64, f64)>,
    not_between: Option<(f64, f64)>,
}

#[derive(Clone)]
enum TrackPointsOrderField {
    WalkId,
    RecordedAt,
    Latitude,
    Longitude,
}

#[derive(Clone, PartialEq, Eq)]
enum SortDirection {
    Asc,
    Desc,
}

#[derive(Clone)]
struct TrackPointsOrder {
    field: TrackPointsOrderField,
    direction: SortDirection,
}

pub struct Operations;

impl Operations {
    async fn track_points(
        ctx: &async_graphql::Context<'_>,
        filters: Option<TrackPointsFilter>,
        having: Option<TrackPointsFilter>,
        order_by: Vec<TrackPointsOrder>,
        pagination: PaginationInput,
    ) -> async_graphql::Result<TrackPointsConnection> {
        let client = ctx.data::<aws_sdk_dynamodb::Client>()?;
        let table_name = track_points_table_name();
        let fetch_limit = MAX_QUERY_LIMIT;

        let output = if let Some(walk_id) = filters.as_ref().and_then(extract_walk_id_eq) {
            client
                .query()
                .table_name(table_name)
                .key_condition_expression("walk_id = :walk_id")
                .expression_attribute_values(":walk_id", AttributeValue::S(walk_id))
                .scan_index_forward(true)
                .limit(fetch_limit)
                .send()
                .await
                .map_err(|e| {
                    async_graphql::Error::new(format!("failed to query track_points: {e}"))
                })?
                .items
        } else {
            client
                .scan()
                .table_name(table_name)
                .limit(fetch_limit)
                .send()
                .await
                .map_err(|e| {
                    async_graphql::Error::new(format!("failed to scan track_points: {e}"))
                })?
                .items
        };

        let mut nodes = output
            .unwrap_or_default()
            .into_iter()
            .map(track_point_from_item)
            .collect::<async_graphql::Result<Vec<_>>>()?;

        if let Some(filter) = filters.as_ref() {
            nodes.retain(|node| filter.matches(node));
        }
        if let Some(filter) = having.as_ref() {
            nodes.retain(|node| filter.matches(node));
        }

        apply_order(&mut nodes, &order_by);

        let total = nodes.len();
        let pagination_window = pagination_window(&pagination, total)?;
        let page_nodes = nodes
            .into_iter()
            .enumerate()
            .skip(pagination_window.offset)
            .take(pagination_window.limit)
            .map(|(index, node)| TrackPointsEdge {
                cursor: index.to_string(),
                node,
            })
            .collect::<Vec<_>>();

        let start_cursor = page_nodes.first().map(|edge| edge.cursor.clone());
        let end_cursor = page_nodes.last().map(|edge| edge.cursor.clone());
        let page_info = seaography::PageInfo {
            has_previous_page: pagination_window.offset > 0,
            has_next_page: pagination_window.offset + page_nodes.len() < total,
            start_cursor,
            end_cursor,
        };

        Ok(TrackPointsConnection {
            page_info,
            pagination_info: pagination_window.pagination_info(total),
            edges: page_nodes,
        })
    }
}

impl CustomFields for Operations {
    fn to_fields(context: &'static BuilderContext) -> Vec<Field> {
        vec![
            Field::new(
                "trackPoints",
                TypeRef::named_nn(TRACK_POINTS_CONNECTION),
                move |ctx| {
                    FieldFuture::new(async move {
                        let filters = parse_filter_arg(ctx.args.get("filters"))?;
                        let having = parse_filter_arg(ctx.args.get("having"))?;
                        let order_by = parse_order_arg(ctx.args.get("orderBy"))?;
                        let pagination =
                            PaginationInput::parse_value(context, ctx.args.get("pagination"))
                                .map_err(|e| {
                                    async_graphql::Error::new(format!(
                                        "Error decoding trackPoints argument pagination: {e}"
                                    ))
                                })?;

                        let output =
                            Self::track_points(ctx.ctx, filters, having, order_by, pagination)
                                .await?;
                        Ok(Some(FieldValue::owned_any(output)))
                    })
                },
            )
            .argument(InputValue::new(
                "filters",
                TypeRef::named(TRACK_POINTS_FILTER_INPUT),
            ))
            .argument(InputValue::new(
                "having",
                TypeRef::named(TRACK_POINTS_HAVING_INPUT),
            ))
            .argument(InputValue::new(
                "orderBy",
                TypeRef::named(TRACK_POINTS_ORDER_INPUT),
            ))
            .argument(InputValue::new(
                "pagination",
                TypeRef::named("PaginationInput"),
            )),
        ]
    }
}

impl TrackPointsFilter {
    fn matches(&self, node: &TrackPointBasic) -> bool {
        if self
            .walk_id
            .as_ref()
            .is_some_and(|filter| !filter.matches(Some(&node.walk_id)))
            || self
                .recorded_at
                .as_ref()
                .is_some_and(|filter| !filter.matches(Some(&node.recorded_at)))
            || self
                .latitude
                .as_ref()
                .is_some_and(|filter| !filter.matches(Some(node.latitude)))
            || self
                .longitude
                .as_ref()
                .is_some_and(|filter| !filter.matches(Some(node.longitude)))
        {
            return false;
        }

        self.and.iter().all(|filter| filter.matches(node))
            && (self.or.is_empty() || self.or.iter().any(|filter| filter.matches(node)))
            && self.not.as_ref().is_none_or(|filter| !filter.matches(node))
    }
}

impl TextFilter {
    fn matches(&self, value: Option<&str>) -> bool {
        if self
            .is_null
            .is_some_and(|is_null| is_null != value.is_none())
        {
            return false;
        }
        let Some(value) = value else {
            return true;
        };
        self.eq.as_ref().is_none_or(|expected| value == expected)
            && self.ne.as_ref().is_none_or(|expected| value != expected)
            && self
                .gt
                .as_ref()
                .is_none_or(|expected| value > expected.as_str())
            && self
                .gte
                .as_ref()
                .is_none_or(|expected| value >= expected.as_str())
            && self
                .lt
                .as_ref()
                .is_none_or(|expected| value < expected.as_str())
            && self
                .lte
                .as_ref()
                .is_none_or(|expected| value <= expected.as_str())
            && self
                .is_in
                .as_ref()
                .is_none_or(|expected| expected.iter().any(|item| item == value))
            && self
                .is_not_in
                .as_ref()
                .is_none_or(|expected| expected.iter().all(|item| item != value))
            && self
                .between
                .as_ref()
                .is_none_or(|(start, end)| value >= start.as_str() && value <= end.as_str())
            && self
                .not_between
                .as_ref()
                .is_none_or(|(start, end)| value < start.as_str() || value > end.as_str())
    }
}

impl FloatFilter {
    fn matches(&self, value: Option<f64>) -> bool {
        if self
            .is_null
            .is_some_and(|is_null| is_null != value.is_none())
        {
            return false;
        }
        let Some(value) = value else {
            return true;
        };
        self.eq.is_none_or(|expected| value == expected)
            && self.ne.is_none_or(|expected| value != expected)
            && self.gt.is_none_or(|expected| value > expected)
            && self.gte.is_none_or(|expected| value >= expected)
            && self.lt.is_none_or(|expected| value < expected)
            && self.lte.is_none_or(|expected| value <= expected)
            && self
                .is_in
                .as_ref()
                .is_none_or(|expected| expected.contains(&value))
            && self
                .is_not_in
                .as_ref()
                .is_none_or(|expected| !expected.contains(&value))
            && self
                .between
                .is_none_or(|(start, end)| value >= start && value <= end)
            && self
                .not_between
                .is_none_or(|(start, end)| value < start || value > end)
    }
}

struct PaginationWindow {
    offset: usize,
    limit: usize,
    page: Option<u64>,
}

impl PaginationWindow {
    fn pagination_info(&self, total: usize) -> Option<PaginationInfo> {
        self.page.map(|page| PaginationInfo {
            pages: if self.limit == 0 {
                0
            } else {
                total.div_ceil(self.limit) as u64
            },
            current: page,
            offset: self.offset as u64,
            total: total as u64,
        })
    }
}

fn parse_filter_arg(
    value: Option<ValueAccessor<'_>>,
) -> async_graphql::Result<Option<TrackPointsFilter>> {
    value
        .filter(|value| !value.is_null())
        .map(parse_filter)
        .transpose()
}

fn parse_filter(value: ValueAccessor<'_>) -> async_graphql::Result<TrackPointsFilter> {
    let object = value.object()?;
    Ok(TrackPointsFilter {
        walk_id: object.get("walkId").map(parse_text_filter).transpose()?,
        recorded_at: object
            .get("recordedAt")
            .map(parse_text_filter)
            .transpose()?,
        latitude: object.get("latitude").map(parse_float_filter).transpose()?,
        longitude: object
            .get("longitude")
            .map(parse_float_filter)
            .transpose()?,
        and: object
            .get("and")
            .map(parse_filter_list)
            .transpose()?
            .unwrap_or_default(),
        or: object
            .get("or")
            .map(parse_filter_list)
            .transpose()?
            .unwrap_or_default(),
        not: object
            .get("not")
            .filter(|value| !value.is_null())
            .map(parse_filter)
            .transpose()?
            .map(Box::new),
    })
}

fn parse_filter_list(value: ValueAccessor<'_>) -> async_graphql::Result<Vec<TrackPointsFilter>> {
    value.list()?.iter().map(parse_filter).collect()
}

fn parse_text_filter(value: ValueAccessor<'_>) -> async_graphql::Result<TextFilter> {
    let object = value.object()?;
    Ok(TextFilter {
        eq: object
            .get("eq")
            .map(|value| value.string().map(str::to_string))
            .transpose()?,
        ne: object
            .get("ne")
            .map(|value| value.string().map(str::to_string))
            .transpose()?,
        gt: object
            .get("gt")
            .map(|value| value.string().map(str::to_string))
            .transpose()?,
        gte: object
            .get("gte")
            .map(|value| value.string().map(str::to_string))
            .transpose()?,
        lt: object
            .get("lt")
            .map(|value| value.string().map(str::to_string))
            .transpose()?,
        lte: object
            .get("lte")
            .map(|value| value.string().map(str::to_string))
            .transpose()?,
        is_in: object.get("is_in").map(parse_string_list).transpose()?,
        is_not_in: object.get("is_not_in").map(parse_string_list).transpose()?,
        is_null: object
            .get("is_null")
            .map(|value| value.boolean())
            .transpose()?,
        between: object.get("between").map(parse_string_pair).transpose()?,
        not_between: object
            .get("not_between")
            .map(parse_string_pair)
            .transpose()?,
    })
}

fn parse_float_filter(value: ValueAccessor<'_>) -> async_graphql::Result<FloatFilter> {
    let object = value.object()?;
    Ok(FloatFilter {
        eq: object.get("eq").map(|value| value.f64()).transpose()?,
        ne: object.get("ne").map(|value| value.f64()).transpose()?,
        gt: object.get("gt").map(|value| value.f64()).transpose()?,
        gte: object.get("gte").map(|value| value.f64()).transpose()?,
        lt: object.get("lt").map(|value| value.f64()).transpose()?,
        lte: object.get("lte").map(|value| value.f64()).transpose()?,
        is_in: object.get("is_in").map(parse_float_list).transpose()?,
        is_not_in: object.get("is_not_in").map(parse_float_list).transpose()?,
        is_null: object
            .get("is_null")
            .map(|value| value.boolean())
            .transpose()?,
        between: object.get("between").map(parse_float_pair).transpose()?,
        not_between: object
            .get("not_between")
            .map(parse_float_pair)
            .transpose()?,
    })
}

fn parse_string_list(value: ValueAccessor<'_>) -> async_graphql::Result<Vec<String>> {
    value
        .list()?
        .iter()
        .map(|value| value.string().map(str::to_string))
        .collect()
}

fn parse_float_list(value: ValueAccessor<'_>) -> async_graphql::Result<Vec<f64>> {
    value.list()?.iter().map(|value| value.f64()).collect()
}

fn parse_string_pair(value: ValueAccessor<'_>) -> async_graphql::Result<(String, String)> {
    let values = parse_string_list(value)?;
    match values.as_slice() {
        [start, end] => Ok((start.clone(), end.clone())),
        _ => Err(async_graphql::Error::new(
            "expected exactly two string values",
        )),
    }
}

fn parse_float_pair(value: ValueAccessor<'_>) -> async_graphql::Result<(f64, f64)> {
    let values = parse_float_list(value)?;
    match values.as_slice() {
        [start, end] => Ok((*start, *end)),
        _ => Err(async_graphql::Error::new(
            "expected exactly two float values",
        )),
    }
}

fn parse_order_arg(
    value: Option<ValueAccessor<'_>>,
) -> async_graphql::Result<Vec<TrackPointsOrder>> {
    let Some(value) = value.filter(|value| !value.is_null()) else {
        return Ok(vec![TrackPointsOrder {
            field: TrackPointsOrderField::RecordedAt,
            direction: SortDirection::Asc,
        }]);
    };
    value
        .object()?
        .iter()
        .filter_map(|(name, value)| match value.is_null() {
            true => None,
            false => Some(parse_order_field(name.as_str(), value)),
        })
        .collect()
}

fn parse_order_field(
    name: &str,
    value: ValueAccessor<'_>,
) -> async_graphql::Result<TrackPointsOrder> {
    let field = match name {
        "walkId" => TrackPointsOrderField::WalkId,
        "recordedAt" => TrackPointsOrderField::RecordedAt,
        "latitude" => TrackPointsOrderField::Latitude,
        "longitude" => TrackPointsOrderField::Longitude,
        _ => {
            return Err(async_graphql::Error::new(format!(
                "unsupported order field {name}"
            )));
        }
    };
    let direction = match value.enum_name()? {
        "ASC" => SortDirection::Asc,
        "DESC" => SortDirection::Desc,
        other => {
            return Err(async_graphql::Error::new(format!(
                "unsupported order direction {other}"
            )));
        }
    };
    Ok(TrackPointsOrder { field, direction })
}

fn apply_order(nodes: &mut [TrackPointBasic], order_by: &[TrackPointsOrder]) {
    nodes.sort_by(|left, right| {
        for order in order_by {
            let ordering = compare_track_points(left, right, &order.field);
            if ordering != Ordering::Equal {
                return if order.direction == SortDirection::Asc {
                    ordering
                } else {
                    ordering.reverse()
                };
            }
        }
        Ordering::Equal
    });
}

fn compare_track_points(
    left: &TrackPointBasic,
    right: &TrackPointBasic,
    field: &TrackPointsOrderField,
) -> Ordering {
    match field {
        TrackPointsOrderField::WalkId => left.walk_id.cmp(&right.walk_id),
        TrackPointsOrderField::RecordedAt => left.recorded_at.cmp(&right.recorded_at),
        TrackPointsOrderField::Latitude => left.latitude.total_cmp(&right.latitude),
        TrackPointsOrderField::Longitude => left.longitude.total_cmp(&right.longitude),
    }
}

fn pagination_window(
    pagination: &PaginationInput,
    total: usize,
) -> async_graphql::Result<PaginationWindow> {
    if let Some(cursor) = &pagination.cursor {
        let limit = normalize_limit(cursor.limit)?;
        let offset = cursor
            .cursor
            .as_deref()
            .map(|cursor| cursor.parse::<usize>().map(|index| index + 1))
            .transpose()
            .map_err(|e| async_graphql::Error::new(format!("invalid cursor: {e}")))?
            .unwrap_or(0);
        return Ok(PaginationWindow {
            offset,
            limit,
            page: None,
        });
    }

    if let Some(page) = &pagination.page {
        let limit = normalize_limit(page.limit)?;
        let offset = page.page as usize * limit;
        return Ok(PaginationWindow {
            offset,
            limit,
            page: Some(page.page),
        });
    }

    if let Some(offset) = &pagination.offset {
        let limit = normalize_limit(offset.limit)?;
        return Ok(PaginationWindow {
            offset: offset.offset as usize,
            limit,
            page: Some(if limit == 0 {
                0
            } else {
                offset.offset / limit as u64
            }),
        });
    }

    Ok(PaginationWindow {
        offset: 0,
        limit: total.min(DEFAULT_QUERY_LIMIT as usize),
        page: None,
    })
}

fn normalize_limit(limit: u64) -> async_graphql::Result<usize> {
    if limit == 0 || limit > MAX_QUERY_LIMIT as u64 {
        return Err(async_graphql::Error::new(format!(
            "pagination limit must be between 1 and {MAX_QUERY_LIMIT}"
        )));
    }
    Ok(limit as usize)
}

fn extract_walk_id_eq(filter: &TrackPointsFilter) -> Option<String> {
    if filter.or.is_empty() && filter.not.is_none() {
        filter.walk_id.as_ref().and_then(|field| field.eq.clone())
    } else {
        None
    }
}
