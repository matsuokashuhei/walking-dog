use aws_sdk_s3::{
    Client as S3Client,
    presigning::PresigningConfig,
};
use std::time::Duration;
use uuid::Uuid;

pub struct PresignedUrl {
    pub url: String,
    pub key: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

pub async fn generate_dog_photo_upload_url(
    s3: &S3Client,
    bucket: &str,
    dog_id: Uuid,
) -> Result<PresignedUrl, crate::error::AppError> {
    let key = format!("dogs/{}/{}.jpg", dog_id, Uuid::new_v4());
    let expires_in = Duration::from_secs(3600);

    let presigned = s3
        .put_object()
        .bucket(bucket)
        .key(&key)
        .content_type("image/jpeg")
        .presigned(
            PresigningConfig::expires_in(expires_in)
                .map_err(|e| crate::error::AppError::Internal(e.to_string()))?,
        )
        .await
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;

    let expires_at = chrono::Utc::now() + chrono::Duration::seconds(3600);
    Ok(PresignedUrl {
        url: presigned.uri().to_string(),
        key,
        expires_at,
    })
}
