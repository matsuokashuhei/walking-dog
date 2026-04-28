use crate::error::{AppError, FieldError};
use crate::graphql::auth_helpers;
use crate::graphql::custom_queries::EncounterOutput;
use crate::graphql::dynamic_helpers::{parse_uuid, parse_uuid_with_field_error};
use crate::services::encounter_service;
use crate::AppState;
use async_graphql::dynamic::{Field, FieldFuture, FieldValue, InputValue, TypeRef};
use std::sync::Arc;

pub fn record_encounter_field(state: Arc<AppState>) -> Field {
    Field::new(
        "recordEncounter",
        TypeRef::named_nn_list_nn("EncounterOutput"),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                // Input parse — accumulate all field errors before returning
                let my_walk_id_str = ctx.args.try_get("myWalkId")?.string()?;
                let their_walk_id_str = ctx.args.try_get("theirWalkId")?.string()?;

                let mut field_errors: Vec<FieldError> = Vec::new();

                let my_walk_id =
                    parse_uuid_with_field_error(my_walk_id_str, "myWalkId", &mut field_errors);
                let their_walk_id = parse_uuid_with_field_error(
                    their_walk_id_str,
                    "theirWalkId",
                    &mut field_errors,
                );

                if !field_errors.is_empty() {
                    return Err(AppError::ValidationErrors(field_errors).into_graphql_error());
                }

                // Both values are Some since field_errors is empty
                let my_walk_id = my_walk_id.unwrap();
                let their_walk_id = their_walk_id.unwrap();

                // Auth
                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                // Service call — authorization + counterparty opt-out check delegated to service
                let encounters = encounter_service::record_encounter(
                    &state.db,
                    my_walk_id,
                    their_walk_id,
                    30,
                    user.id,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                // Output
                let values: Vec<FieldValue> = encounters
                    .into_iter()
                    .map(|e| FieldValue::owned_any(EncounterOutput::from(e)))
                    .collect();
                Ok(Some(FieldValue::list(values)))
            })
        },
    )
    .argument(InputValue::new("myWalkId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "theirWalkId",
        TypeRef::named_nn(TypeRef::ID),
    ))
}

pub fn update_encounter_duration_field(state: Arc<AppState>) -> Field {
    Field::new(
        "updateEncounterDuration",
        TypeRef::named_nn(TypeRef::BOOLEAN),
        move |ctx| {
            let state = state.clone();
            FieldFuture::new(async move {
                // Input parse
                let my_walk_id_str = ctx.args.try_get("myWalkId")?.string()?;
                let their_walk_id_str = ctx.args.try_get("theirWalkId")?.string()?;
                let duration_sec = i32::try_from(ctx.args.try_get("durationSec")?.i64()?)
                    .map_err(|_| {
                        AppError::BadRequest("durationSec out of i32 range".to_string())
                            .into_graphql_error()
                    })?;
                let my_walk_id = parse_uuid(my_walk_id_str, "Invalid myWalkId")?;
                let their_walk_id = parse_uuid(their_walk_id_str, "Invalid theirWalkId")?;

                // Auth
                let user = auth_helpers::resolve_user(&ctx, &state).await?;

                // Service call (authorization delegated to service)
                let result = encounter_service::update_encounter_duration(
                    &state.db,
                    my_walk_id,
                    their_walk_id,
                    duration_sec,
                    user.id,
                )
                .await
                .map_err(AppError::into_graphql_error)?;

                // Output
                Ok(Some(FieldValue::value(result)))
            })
        },
    )
    .argument(InputValue::new("myWalkId", TypeRef::named_nn(TypeRef::ID)))
    .argument(InputValue::new(
        "theirWalkId",
        TypeRef::named_nn(TypeRef::ID),
    ))
    .argument(InputValue::new(
        "durationSec",
        TypeRef::named_nn(TypeRef::INT),
    ))
}
