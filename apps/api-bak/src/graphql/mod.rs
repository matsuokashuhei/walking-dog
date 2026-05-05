use crate::AppState;
use seaography::BuilderContext;
use std::sync::Arc;

pub mod auth_helpers;
pub mod custom_queries;
pub mod dynamic_helpers;
pub mod enums;
pub mod input;
pub mod loaders;
pub mod mutations;
use self::mutations::{
    auth::{
        confirm_sign_up_input_type, refresh_token_input_type, sign_in_input_type,
        sign_in_output_type, sign_up_input_type, sign_up_output_type, update_profile_input_type,
        user_output_type,
    },
    dog::{birth_date_type, create_dog_input_type, dog_output_type, update_dog_input_type},
    dog_member::{dog_invitation_output_type, dog_member_output_type},
    photo::presigned_url_type,
    walk::{walk_output_type, walk_point_input_type, walker_output_type},
    walk_event::{record_walk_event_input_type, walk_event_output_type},
};

/// Dynamic schema produced by Seaography.
pub type AppSchema = async_graphql::dynamic::Schema;

static CONTEXT: std::sync::OnceLock<BuilderContext> = std::sync::OnceLock::new();

/// Build the Seaography-based GraphQL schema.
///
/// * Auto-generated CRUD queries for all entities (mutation auto-gen is disabled).
/// * Custom top-level queries: `me`, `dogWalkStats`, `walkPoints`.
/// * Custom mutations: `startWalk`, `finishWalk`, `addWalkPoints`,
///   `updateProfile`, `deleteDog`, `generateDogPhotoUploadUrl`.
pub fn build_schema(state: Arc<AppState>) -> AppSchema {
    let context = CONTEXT.get_or_init(BuilderContext::default);
    let db = state.db.clone();
    let mut builder = seaography::Builder::new(context, db.clone());
    builder = crate::entities::register_entity_modules(builder);

    // Add custom query fields to the root query object.
    for field in custom_queries::query_fields(state.clone()) {
        builder.query = builder.query.field(field);
    }

    // Add custom mutation fields to the root mutation object.
    for field in mutations::mutation_fields(state.clone()) {
        builder.mutation = builder.mutation.field(field);
    }

    // Register custom types with the schema builder.
    builder.schema = builder
        .schema
        // Enum types
        .register(enums::walk_status_enum())
        .register(enums::walk_event_type_enum())
        .register(enums::period_enum())
        // Query output types
        .register(custom_queries::walk_point_type())
        .register(custom_queries::walk_stats_type())
        .register(custom_queries::encounter_output_type())
        .register(custom_queries::friendship_output_type())
        // Mutation output types
        .register(birth_date_type())
        .register(dog_output_type())
        .register(walk_output_type())
        .register(walker_output_type())
        .register(user_output_type())
        .register(walk_event_output_type())
        .register(presigned_url_type())
        .register(dog_invitation_output_type())
        .register(dog_member_output_type())
        .register(sign_up_output_type())
        .register(sign_in_output_type())
        // Mutation input types
        .register(mutations::dog::birth_date_input_type())
        .register(create_dog_input_type())
        .register(update_dog_input_type())
        .register(walk_point_input_type())
        .register(update_profile_input_type())
        .register(sign_up_input_type())
        .register(confirm_sign_up_input_type())
        .register(sign_in_input_type())
        .register(refresh_token_input_type())
        .register(record_walk_event_input_type());

    // schema_builder() registers builder.query and builder.mutation as root
    // Query/Mutation types, then returns the completed SchemaBuilder.
    builder
        .schema_builder()
        .data(state)
        .finish()
        .expect("Failed to build GraphQL schema")
}
