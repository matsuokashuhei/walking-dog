//! Loose birthday value object stored as JSON on the `dog` table.
//!
//! Owners frequently know only the year, or only the year and month, so each
//! component is independently optional rather than forming a strict date.

use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct Model {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}
