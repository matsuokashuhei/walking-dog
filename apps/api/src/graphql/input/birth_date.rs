#[cfg(test)]
mod tests {
    use crate::graphql::input::birth_date::parse_birth_date_input;

    #[test]
    fn parse_birth_date_input_returns_none_when_field_absent() {
        let result = parse_birth_date_input(None);
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }
}
