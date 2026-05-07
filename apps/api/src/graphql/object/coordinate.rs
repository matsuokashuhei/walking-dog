use async_graphql::{
    InputType, InputValueError, InputValueResult, Number, Scalar, ScalarType, SimpleObject, Value,
};

#[derive(SimpleObject, Clone, Debug)]
pub struct Coordinate {
    pub latitude: Latitude,
    pub longitude: Longitude,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Latitude(f64);

impl Latitude {
    pub fn value(self) -> f64 {
        self.0
    }
}

impl From<f64> for Latitude {
    fn from(value: f64) -> Self {
        debug_assert!(is_in_range(value, -90.0, 90.0));
        Latitude(value)
    }
}

#[Scalar]
impl ScalarType for Latitude {
    fn parse(value: Value) -> InputValueResult<Self> {
        parse_coordinate(value, "Latitude", -90.0, 90.0, Latitude)
    }

    fn is_valid(value: &Value) -> bool {
        is_valid_coordinate(value, -90.0, 90.0)
    }

    fn to_value(&self) -> Value {
        coordinate_to_value(self.0)
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Longitude(f64);

impl Longitude {
    pub fn value(self) -> f64 {
        self.0
    }
}

impl From<f64> for Longitude {
    fn from(value: f64) -> Self {
        debug_assert!(is_in_range(value, -180.0, 180.0));
        Longitude(value)
    }
}

#[Scalar]
impl ScalarType for Longitude {
    fn parse(value: Value) -> InputValueResult<Self> {
        parse_coordinate(value, "Longitude", -180.0, 180.0, Longitude)
    }

    fn is_valid(value: &Value) -> bool {
        is_valid_coordinate(value, -180.0, 180.0)
    }

    fn to_value(&self) -> Value {
        coordinate_to_value(self.0)
    }
}

fn parse_coordinate<T: InputType>(
    value: Value,
    name: &str,
    minimum: f64,
    maximum: f64,
    build: impl FnOnce(f64) -> T,
) -> InputValueResult<T> {
    match value {
        Value::Number(number) => {
            let value = number
                .as_f64()
                .ok_or_else(|| InputValueError::from("Invalid number"))?;
            if is_in_range(value, minimum, maximum) {
                Ok(build(value))
            } else {
                Err(InputValueError::custom(format!(
                    "{} must be between {} and {}",
                    name, minimum, maximum
                )))
            }
        }
        _ => Err(InputValueError::expected_type(value)),
    }
}

fn is_valid_coordinate(value: &Value, minimum: f64, maximum: f64) -> bool {
    match value {
        Value::Number(number) => number
            .as_f64()
            .is_some_and(|value| is_in_range(value, minimum, maximum)),
        _ => false,
    }
}

fn is_in_range(value: f64, minimum: f64, maximum: f64) -> bool {
    (minimum..=maximum).contains(&value)
}

fn coordinate_to_value(value: f64) -> Value {
    Number::from_f64(value).map_or(Value::Null, Value::Number)
}
