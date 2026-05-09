use async_graphql::{SimpleObject, connection::CursorType};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub(crate) struct UuidCursor {
    pub(crate) id: Uuid,
}

impl CursorType for UuidCursor {
    type Error = String;

    fn decode_cursor(cursor: &str) -> std::result::Result<Self, Self::Error> {
        Ok(UuidCursor {
            id: Uuid::parse_str(cursor).map_err(|e| e.to_string())?,
        })
    }

    fn encode_cursor(&self) -> String {
        self.id.to_string()
    }
}

#[derive(SimpleObject, Default, Clone, Debug)]
pub(crate) struct ConnectionFields {
    pub(crate) total_count: i64,
}
