use anyhow::Result;
use async_graphql::{Context, Upload};

use crate::service::storage::StorageUpload;

pub(crate) fn storage_upload_from_graphql(
    ctx: &Context<'_>,
    file: Upload,
    max_upload_bytes: u64,
) -> Result<StorageUpload> {
    let upload = file.value(ctx)?;
    Ok(StorageUpload::from_reader(
        upload.filename,
        upload.content_type,
        upload.content,
        max_upload_bytes,
    )?)
}
