pub mod caretaker;

use async_graphql::MergedObject;
use caretaker::CaretakerQuery;

#[derive(MergedObject, Default)]
pub struct Query(CaretakerQuery);
