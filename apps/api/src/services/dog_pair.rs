//! Canonical pair of dog IDs.
//!
//! Several tables (`encounters`, `friendships`) store relationships between two
//! dogs with an invariant `dog_id_1 < dog_id_2` so that the same social bond is
//! represented once regardless of which direction a request comes from. Before
//! this module, that ordering was expressed by:
//! - a private helper `normalize_dog_pair` inside `encounter_service`, and
//! - an inline `if a < b { ... } else { ... }` swap inside
//!   `friendship_service::get_friendship`.
//!
//! Callers had to remember this rule when inserting rows directly. `DogPair`
//! moves the rule into the type system — you cannot construct an
//! out-of-order pair, and `None` on equal IDs makes the degenerate case
//! impossible to forget.

use uuid::Uuid;

/// A pair of distinct dog IDs, sorted so that `first() < second()`.
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct DogPair {
    first: Uuid,
    second: Uuid,
}

impl DogPair {
    /// Construct a canonically-sorted pair. Returns `None` when the two IDs
    /// are equal (same dog — no pair to form).
    pub fn new(a: Uuid, b: Uuid) -> Option<Self> {
        match a.cmp(&b) {
            std::cmp::Ordering::Less => Some(Self {
                first: a,
                second: b,
            }),
            std::cmp::Ordering::Greater => Some(Self {
                first: b,
                second: a,
            }),
            std::cmp::Ordering::Equal => None,
        }
    }

    /// The smaller of the two IDs (stored in the `dog_id_1` column).
    pub fn first(&self) -> Uuid {
        self.first
    }

    /// The larger of the two IDs (stored in the `dog_id_2` column).
    pub fn second(&self) -> Uuid {
        self.second
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_orders_ascending_when_first_less_than_second() {
        let a = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let b = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let pair = DogPair::new(a, b).unwrap();
        assert_eq!(pair.first(), a);
        assert_eq!(pair.second(), b);
    }

    #[test]
    fn new_swaps_when_first_greater_than_second() {
        let a = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let b = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let pair = DogPair::new(a, b).unwrap();
        assert_eq!(pair.first(), b);
        assert_eq!(pair.second(), a);
    }

    #[test]
    fn new_returns_none_for_same_dog() {
        let id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        assert!(DogPair::new(id, id).is_none());
    }
}
