use std::{ffi::OsStr, io::Read, path::Path, sync::Arc};

use async_trait::async_trait;
use tracing::error;
use url::Url;

use crate::util::error::format_error_chain;

const DEFAULT_MAX_UPLOAD_BYTES: u64 = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES_ENV: &str = "MAX_UPLOAD_BYTES";
const AVATAR_BUCKET_ENV: &str = "AWS_S3_BUCKET_AVATAR";
const PHOTO_BUCKET_ENV: &str = "AWS_S3_BUCKET_PHOTO";

pub type SharedStorageGateway = Arc<dyn StorageGateway>;

#[derive(Clone, Debug)]
pub struct StorageUpload {
    filename: String,
    content_type: String,
    bytes: Vec<u8>,
}

impl StorageUpload {
    pub fn from_reader<C>(
        filename: impl Into<String>,
        content_type: Option<C>,
        reader: impl Read,
        max_upload_bytes: u64,
    ) -> Result<Self, StorageError>
    where
        C: Into<String>,
    {
        let mut content = reader.take(max_upload_bytes + 1);
        let mut bytes = Vec::new();
        content.read_to_end(&mut bytes)?;
        if bytes.len() as u64 > max_upload_bytes {
            return Err(StorageError::ContentTooLarge(bytes.len() as u64));
        }

        Ok(Self {
            filename: filename.into(),
            content_type: content_type
                .map(Into::into)
                .unwrap_or_else(|| "application/octet-stream".to_string()),
            bytes,
        })
    }
}

#[async_trait]
pub trait StorageGateway: Send + Sync + 'static {
    fn max_upload_bytes(&self) -> u64;

    async fn put_avatar(&self, upload: StorageUpload) -> Result<String, StorageError>;

    async fn put_walk_photo(&self, upload: StorageUpload) -> Result<String, StorageError>;

    fn avatar_url(&self, key: Option<&str>) -> Option<Url>;
}

#[derive(Clone)]
pub struct S3StorageGateway {
    client: aws_sdk_s3::Client,
    avatar_bucket: Option<String>,
    photo_bucket: Option<String>,
    url_config: StorageUrlConfig,
    max_upload_bytes: u64,
}

impl S3StorageGateway {
    pub fn from_env(client: aws_sdk_s3::Client) -> Self {
        let avatar_bucket = std::env::var(AVATAR_BUCKET_ENV).ok();
        Self {
            client,
            photo_bucket: std::env::var(PHOTO_BUCKET_ENV).ok(),
            url_config: StorageUrlConfig {
                avatar_cdn_url: std::env::var("AVATAR_CDN_URL").ok(),
                avatar_bucket: avatar_bucket.clone(),
                local_s3_endpoint: std::env::var("AWS_S3_ENDPOINT").is_ok(),
            },
            avatar_bucket,
            max_upload_bytes: max_upload_bytes_from_env(),
        }
    }

    async fn put_file(&self, bucket: &str, upload: StorageUpload) -> Result<String, StorageError> {
        let extension = Path::new(&upload.filename)
            .extension()
            .and_then(OsStr::to_str)
            .unwrap_or("bin");
        let key = format!("{}.{}", uuid::Uuid::new_v4(), extension);

        self.client
            .put_object()
            .bucket(bucket)
            .key(&key)
            .body(aws_sdk_s3::primitives::ByteStream::from(upload.bytes))
            .content_type(upload.content_type)
            .send()
            .await
            .map_err(|error| {
                let error_chain = format_error_chain(&error);
                error!(
                    error = ?error,
                    %error_chain,
                    bucket,
                    "Failed to upload file"
                );
                StorageError::InternalError(error_chain)
            })?;
        Ok(key)
    }
}

#[async_trait]
impl StorageGateway for S3StorageGateway {
    fn max_upload_bytes(&self) -> u64 {
        self.max_upload_bytes
    }

    async fn put_avatar(&self, upload: StorageUpload) -> Result<String, StorageError> {
        let bucket = self
            .avatar_bucket
            .as_deref()
            .ok_or(StorageError::MissingBucket(AVATAR_BUCKET_ENV))?;
        self.put_file(bucket, upload).await
    }

    async fn put_walk_photo(&self, upload: StorageUpload) -> Result<String, StorageError> {
        let bucket = self
            .photo_bucket
            .as_deref()
            .ok_or(StorageError::MissingBucket(PHOTO_BUCKET_ENV))?;
        self.put_file(bucket, upload).await
    }

    fn avatar_url(&self, key: Option<&str>) -> Option<Url> {
        self.url_config.avatar_url(key)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StorageUrlConfig {
    pub avatar_cdn_url: Option<String>,
    pub avatar_bucket: Option<String>,
    pub local_s3_endpoint: bool,
}

impl StorageUrlConfig {
    pub fn avatar_url(&self, key: Option<&str>) -> Option<Url> {
        let key = key?;

        if let Some(cdn_base) = &self.avatar_cdn_url {
            return Url::parse(&format!("{}/{}", cdn_base.trim_end_matches('/'), key)).ok();
        }

        let bucket = self.avatar_bucket.as_ref()?;
        if self.local_s3_endpoint {
            return Url::parse(&format!("{}/{}/{}", "http://localhost:9000", bucket, key)).ok();
        }

        Url::parse(&format!("https://{}.s3.amazonaws.com/{}", bucket, key)).ok()
    }
}

pub fn avatar_url_from_env(key: Option<&str>) -> Option<Url> {
    StorageUrlConfig {
        avatar_cdn_url: std::env::var("AVATAR_CDN_URL").ok(),
        avatar_bucket: std::env::var(AVATAR_BUCKET_ENV).ok(),
        local_s3_endpoint: std::env::var("AWS_S3_ENDPOINT").is_ok(),
    }
    .avatar_url(key)
}

fn max_upload_bytes_from_env() -> u64 {
    std::env::var(MAX_UPLOAD_BYTES_ENV)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(DEFAULT_MAX_UPLOAD_BYTES)
}

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("Content too large: {0} bytes exceeds the maximum allowed size")]
    ContentTooLarge(u64),
    #[error("{0} is not set")]
    MissingBucket(&'static str),
    #[error("Internal server error: {0}")]
    InternalError(String),
    #[error("Failed to read upload content: {0}")]
    Read(#[from] std::io::Error),
}
