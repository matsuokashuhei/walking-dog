use anyhow::Result;
use anyhow::anyhow;
use async_graphql::{Context, Upload};
use std::ffi::OsStr;
use std::io::Read;
use std::path::Path;
use tracing::error;
use url::Url;

pub async fn upload_avatar(ctx: &Context<'_>, file: Upload) -> Result<String> {
    let upload = file.value(ctx)?;
    let extension = Path::new(&upload.filename)
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("bin");
    let key = format!("{}.{}", uuid::Uuid::new_v4(), extension);
    let mut content = upload.content;
    let mut bytes = Vec::new();
    content.read_to_end(&mut bytes)?;
    let content_type = upload
        .content_type
        .as_deref()
        .unwrap_or("application/octet-stream");
    let s3_client = ctx.data::<aws_sdk_s3::Client>().unwrap();
    let bucket = std::env::var("AWS_S3_BUCKET_AVATAR")?;
    s3_client
        .put_object()
        .bucket(&bucket)
        .key(&key)
        .body(aws_sdk_s3::primitives::ByteStream::from(bytes))
        .content_type(content_type)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to upload avatar: {:?}", e);
            anyhow!(e.into_service_error())
        })?;
    Ok(key)
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
