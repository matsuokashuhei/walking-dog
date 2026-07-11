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

pub fn initialize() {
    let _ignored = tracing_subscriber::fmt()
        .json()
        .with_env_filter("info")
        .try_init();
}
