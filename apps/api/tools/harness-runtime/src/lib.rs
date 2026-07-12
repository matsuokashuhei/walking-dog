#![forbid(unsafe_code)]

use testcontainers::{
    ContainerAsync, GenericImage, ImageExt,
    core::{IntoContainerPort, WaitFor},
    runners::AsyncRunner,
};

pub struct PostgresContainer {
    _container: ContainerAsync<GenericImage>,
    connection_url: String,
}

impl PostgresContainer {
    /// Starts an isolated `PostgreSQL` service owned by this handle.
    ///
    /// # Errors
    ///
    /// Returns the container runtime or endpoint discovery error.
    pub async fn start() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let container = GenericImage::new("postgres", "16-alpine")
            .with_wait_for(WaitFor::message_on_stderr(
                "database system is ready to accept connections",
            ))
            .with_exposed_port(5432.tcp())
            .with_env_var("POSTGRES_USER", "postgres")
            .with_env_var("POSTGRES_PASSWORD", "kernel")
            .with_env_var("POSTGRES_DB", "kernel")
            .start()
            .await?;
        let host = container.get_host().await?;
        let port = container.get_host_port_ipv4(5432.tcp()).await?;
        Ok(Self {
            connection_url: format!("postgres://postgres:kernel@{host}:{port}/kernel"),
            _container: container,
        })
    }

    #[must_use]
    pub fn connection_url(&self) -> &str {
        &self.connection_url
    }
}
