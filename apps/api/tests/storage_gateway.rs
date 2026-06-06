use std::io::Cursor;

use walking_dog::service::storage::{StorageUpload, StorageUrlConfig};

#[test]
fn storage_upload_rejects_content_larger_than_limit() {
    let error = StorageUpload::from_reader(
        "avatar.png",
        Some("image/png"),
        Cursor::new(vec![1, 2, 3, 4]),
        3,
    )
    .unwrap_err();

    assert!(error.to_string().contains("Content too large"));
}

#[test]
fn avatar_url_prefers_configured_cdn_base() {
    let config = StorageUrlConfig {
        avatar_cdn_url: Some("https://cdn.example.test/avatars/".into()),
        avatar_bucket: Some("avatar-bucket".into()),
        local_s3_endpoint: true,
    };

    let url = config.avatar_url(Some("dog.png")).unwrap();

    assert_eq!(url.as_str(), "https://cdn.example.test/avatars/dog.png");
}
