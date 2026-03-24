// apps/api/src/config.rs
#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub aws_region: String,
    pub aws_endpoint_url: Option<String>,
    pub dynamodb_endpoint_url: Option<String>,
    pub dynamodb_table_walk_points: String,
    pub s3_bucket_dog_photos: String,
    pub cognito_user_pool_id: String,
    pub cognito_region: String,
    /// cognito-local のエンドポイント (例: http://localhost:9229)
    /// 本番環境では None にする
    pub cognito_endpoint_url: Option<String>,
    pub cognito_client_id: String,
    pub port: u16,
    pub test_mode: bool,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();
        Self {
            database_url: std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            aws_region: std::env::var("AWS_REGION").unwrap_or_else(|_| "ap-northeast-1".to_string()),
            aws_endpoint_url: std::env::var("AWS_ENDPOINT_URL").ok(),
            dynamodb_endpoint_url: std::env::var("DYNAMODB_ENDPOINT_URL").ok(),
            dynamodb_table_walk_points: std::env::var("DYNAMODB_TABLE_WALK_POINTS")
                .unwrap_or_else(|_| "WalkPoints".to_string()),
            s3_bucket_dog_photos: std::env::var("S3_BUCKET_DOG_PHOTOS")
                .unwrap_or_else(|_| "dog-photos".to_string()),
            cognito_user_pool_id: std::env::var("COGNITO_USER_POOL_ID")
                .unwrap_or_default(),
            cognito_region: std::env::var("COGNITO_REGION")
                .unwrap_or_else(|_| "ap-northeast-1".to_string()),
            cognito_endpoint_url: std::env::var("COGNITO_ENDPOINT_URL").ok(),
            cognito_client_id: std::env::var("COGNITO_CLIENT_ID").unwrap_or_default(),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .expect("PORT must be a number"),
            test_mode: std::env::var("TEST_MODE")
                .map(|v| v == "true" || v == "1")
                .unwrap_or(false),
        }
    }
}
