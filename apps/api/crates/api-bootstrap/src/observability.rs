use thiserror::Error;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SafeEvent {
    message: String,
    fields: Vec<(String, String)>,
}

#[derive(Clone, Copy, Debug, Error, Eq, PartialEq)]
pub enum SafeLogError {
    #[error("log field is forbidden")]
    ForbiddenField,
    #[error("log value may contain sensitive data")]
    ForbiddenValue,
}

#[derive(Clone, Debug, Error, Eq, PartialEq)]
#[error("structured subscriber initialization failed: {0}")]
pub struct ObservabilityInitError(String);

impl SafeEvent {
    #[must_use]
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            fields: Vec::new(),
        }
    }

    /// Adds a field after enforcing the safe-log policy.
    ///
    /// # Errors
    ///
    /// Returns an error when the field name or value may expose sensitive data.
    pub fn field(
        mut self,
        key: impl Into<String>,
        value: impl Into<String>,
    ) -> Result<Self, SafeLogError> {
        let key = key.into();
        let value = value.into();
        let normalized = key.to_ascii_lowercase();
        let forbidden = [
            "token",
            "otp",
            "email",
            "url",
            "key",
            "idempotency",
            "latitude",
            "longitude",
            "coordinate",
        ];
        if forbidden.iter().any(|part| normalized.contains(part)) {
            return Err(SafeLogError::ForbiddenField);
        }
        if value.contains('@') || value.contains("http://") || value.contains("https://") {
            return Err(SafeLogError::ForbiddenValue);
        }
        self.fields.push((key, value));
        Ok(self)
    }

    pub fn emit(&self) {
        tracing::info!(message = %self.message, fields = ?self.fields);
    }
}

/// Installs the process-wide structured subscriber.
///
/// # Errors
///
/// Returns a typed initialization error when a subscriber is already installed.
pub fn initialize() -> Result<(), ObservabilityInitError> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter("info")
        .try_init()
        .map_err(|error| ObservabilityInitError(error.to_string()))
}
