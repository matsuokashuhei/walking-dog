pub mod auth;
pub mod dog;
pub mod dog_member;
pub mod encounter;
pub mod photo;
pub mod walk;
pub mod walk_event;

// Re-export everything so `graphql/mod.rs` can use `mutations::` prefix unchanged.
pub use auth::*;
pub use dog::*;
pub use dog_member::*;
pub use encounter::*;
pub use photo::*;
pub use walk::*;
pub use walk_event::*;

use crate::AppState;
use async_graphql::dynamic::Field;
use std::sync::Arc;

pub fn mutation_fields(state: Arc<AppState>) -> Vec<Field> {
    vec![
        auth::sign_up_field(state.clone()),
        auth::confirm_sign_up_field(state.clone()),
        auth::sign_in_field(state.clone()),
        auth::sign_out_field(state.clone()),
        auth::refresh_token_field(state.clone()),
        dog::create_dog_field(state.clone()),
        dog::update_dog_field(state.clone()),
        dog::delete_dog_field(state.clone()),
        photo::generate_dog_photo_upload_url_field(state.clone()),
        walk::start_walk_field(state.clone()),
        walk::finish_walk_field(state.clone()),
        walk::add_walk_points_field(state.clone()),
        auth::update_profile_field(state.clone()),
        dog_member::generate_dog_invitation_field(state.clone()),
        dog_member::accept_dog_invitation_field(state.clone()),
        dog_member::remove_dog_member_field(state.clone()),
        dog_member::leave_dog_field(state.clone()),
        encounter::record_encounter_field(state.clone()),
        encounter::update_encounter_duration_field(state.clone()),
        auth::update_encounter_detection_field(state.clone()),
        walk_event::record_walk_event_field(state.clone()),
        photo::generate_walk_event_photo_upload_url_field(state),
    ]
}
