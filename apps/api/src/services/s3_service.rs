use aws_sdk_s3::{presigning::PresigningConfig, Client as S3Client};
use std::time::Duration;
use uuid::Uuid;

pub struct PresignedUrl {
    pub url: String,
    pub key: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

/// Map a supported image MIME type to its canonical file extension.
///
/// Returns `None` for any MIME type not on the allow-list. Callers must treat
/// `None` as a user input error (unsupported content type).
pub fn extension_for_content_type(ct: &str) -> Option<&'static str> {
    match ct {
        "image/jpeg" => Some("jpg"),
        "image/png" => Some("png"),
        "image/heic" => Some("heic"),
        "image/heif" => Some("heif"),
        "image/webp" => Some("webp"),
        _ => None,
    }
}

pub async fn generate_walk_event_photo_upload_url(
    s3: &S3Client,
    bucket: &str,
    walk_id: Uuid,
    content_type: &str,
) -> Result<PresignedUrl, crate::error::AppError> {
    let ext = extension_for_content_type(content_type).ok_or_else(|| {
        crate::error::AppError::BadRequest(format!("Unsupported content type: {}", content_type))
    })?;

    let key = format!("walks/{}/{}.{}", walk_id, Uuid::new_v4(), ext);
    let expires_in = Duration::from_secs(3600);

    let presigned = s3
        .put_object()
        .bucket(bucket)
        .key(&key)
        .content_type(content_type)
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

pub async fn generate_dog_photo_upload_url(
    s3: &S3Client,
    bucket: &str,
    dog_id: Uuid,
    content_type: &str,
) -> Result<PresignedUrl, crate::error::AppError> {
    let ext = extension_for_content_type(content_type).ok_or_else(|| {
        crate::error::AppError::BadRequest(format!("Unsupported content type: {}", content_type))
    })?;

    let key = format!("dogs/{}/{}.{}", dog_id, Uuid::new_v4(), ext);
    let expires_in = Duration::from_secs(3600);

    let presigned = s3
        .put_object()
        .bucket(bucket)
        .key(&key)
        .content_type(content_type)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extension_for_content_type_maps_jpeg() {
        assert_eq!(extension_for_content_type("image/jpeg"), Some("jpg"));
    }

    #[test]
    fn extension_for_content_type_maps_png() {
        assert_eq!(extension_for_content_type("image/png"), Some("png"));
    }

    #[test]
    fn extension_for_content_type_maps_heic() {
        assert_eq!(extension_for_content_type("image/heic"), Some("heic"));
    }

    #[test]
    fn extension_for_content_type_maps_heif() {
        assert_eq!(extension_for_content_type("image/heif"), Some("heif"));
    }

    #[test]
    fn extension_for_content_type_maps_webp() {
        assert_eq!(extension_for_content_type("image/webp"), Some("webp"));
    }

    #[test]
    fn extension_for_content_type_rejects_pdf() {
        assert_eq!(extension_for_content_type("application/pdf"), None);
    }

    #[test]
    fn extension_for_content_type_rejects_empty_string() {
        assert_eq!(extension_for_content_type(""), None);
    }

    #[test]
    fn s3_presigned_url_expiry_is_3600_secs() {
        assert_eq!(S3_PRESIGNED_URL_EXPIRY.as_secs(), 3600);
    }
}
