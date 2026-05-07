use anyhow::{Result, anyhow, bail};
use async_graphql::{Context, Upload};
use std::ffi::OsStr;
use std::io::Read;
use std::path::Path;
use tracing::error;
use url::Url;

const DEFAULT_MAX_UPLOAD_BYTES: u64 = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES_ENV: &str = "MAX_UPLOAD_BYTES";

pub async fn upload_avatar(ctx: &Context<'_>, file: Upload) -> Result<String> {
    let bucket = std::env::var("AWS_S3_BUCKET_AVATAR")?;
    upload_file(ctx, file, &bucket).await
}

pub async fn upload_walk_photo(ctx: &Context<'_>, file: Upload) -> Result<String> {
    let bucket = std::env::var("AWS_S3_BUCKET_PHOTO")?;
    upload_file(ctx, file, &bucket).await
}

async fn upload_file(ctx: &Context<'_>, file: Upload, bucket: &str) -> Result<String> {
    let upload = file.value(ctx)?;
    let extension = Path::new(&upload.filename)
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("bin");
    let key = format!("{}.{}", uuid::Uuid::new_v4(), extension);
    let max_upload_bytes = max_upload_bytes();
    let mut content = upload.content.take(max_upload_bytes + 1);
    let mut bytes = Vec::new();
    content.read_to_end(&mut bytes)?;
    if bytes.len() as u64 > max_upload_bytes {
        bail!("Uploaded file exceeds {} bytes", max_upload_bytes);
    }
    let content_type = upload
        .content_type
        .as_deref()
        .unwrap_or("application/octet-stream");
    let s3_client = ctx.data::<aws_sdk_s3::Client>().unwrap();
    s3_client
        .put_object()
        .bucket(bucket)
        .key(&key)
        .body(aws_sdk_s3::primitives::ByteStream::from(bytes))
        .content_type(content_type)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to upload file: {:?} to bucket: {}", e, bucket);
            anyhow!(e.into_service_error())
        })?;
    Ok(key)
}

fn max_upload_bytes() -> u64 {
    std::env::var(MAX_UPLOAD_BYTES_ENV)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(DEFAULT_MAX_UPLOAD_BYTES)
}

pub fn avatar_url(key: Option<&str>) -> Option<Url> {
    let bucket = std::env::var("AWS_S3_BUCKET_AVATAR").unwrap();
    let endpoint = std::env::var("AWS_S3_ENDPOINT").ok();
    if let Some(key) = key {
        if let Some(_) = endpoint {
            Url::parse(&format!("http://localhost:9000/{}/{}", bucket, key)).ok()
        } else {
            Url::parse(&format!("https://{}.s3.amazonaws.com/{}", bucket, key)).ok()
        }
    } else {
        None
    }
}
