pub mod auth;
pub mod dog;
pub mod track_point;
pub mod user;
pub mod walk;
pub mod walk_dog_event;
pub mod walk_photo;

use async_graphql::MergedObject;

#[derive(MergedObject, Default)]
pub struct Mutation(
    auth::AuthMutation,
    dog::DogMutation,
    track_point::TrackPointMutation,
    user::UserMutation,
    walk::WalkMutation,
    walk_dog_event::WalkDogEventMutation,
    walk_photo::WalkPhotoMutation,
);
