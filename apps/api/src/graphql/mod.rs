use std::sync::Arc;
use seaography::BuilderContext;
use crate::AppState;

pub mod custom_mutations;
pub mod custom_queries;

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
    let mut builder = seaography::Builder::new(context, state.db.clone());
    builder = crate::entities::register_entity_modules(builder);

    // Add custom query fields to the root query object.
    for field in custom_queries::query_fields(state.clone()) {
        builder.query = builder.query.field(field);
    }

    // Add custom mutation fields to the root mutation object.
    for field in custom_mutations::mutation_fields(state.clone()) {
        builder.mutation = builder.mutation.field(field);
    }

    // Register custom types with the schema builder.
    builder.schema = builder.schema
        // Query output types
        .register(custom_queries::walk_point_type())
        .register(custom_queries::walk_stats_type())
        // Mutation output types
        .register(custom_mutations::birth_date_type())
        .register(custom_mutations::dog_output_type())
        .register(custom_mutations::walk_output_type())
        .register(custom_mutations::walker_output_type())
        .register(custom_mutations::walk_point_output_type())
        .register(custom_mutations::user_output_type())
        .register(custom_mutations::presigned_url_type())
        .register(custom_mutations::dog_invitation_output_type())
        .register(custom_mutations::sign_up_output_type())
        .register(custom_mutations::sign_in_output_type())
        // Mutation input types
        .register(custom_mutations::birth_date_input_type())
        .register(custom_mutations::create_dog_input_type())
        .register(custom_mutations::update_dog_input_type())
        .register(custom_mutations::walk_point_input_type())
        .register(custom_mutations::update_profile_input_type())
        .register(custom_mutations::sign_up_input_type())
        .register(custom_mutations::confirm_sign_up_input_type())
        .register(custom_mutations::sign_in_input_type())
        .register(custom_mutations::refresh_token_input_type());

    // schema_builder() registers builder.query and builder.mutation as root
    // Query/Mutation types, then returns the completed SchemaBuilder.
    builder
        .schema_builder()
        .data(state)
        .finish()
        .expect("Failed to build GraphQL schema")
}
