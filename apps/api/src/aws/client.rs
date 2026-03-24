use aws_config::{BehaviorVersion, Region};
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_cognitoidentityprovider::Client as CognitoClient;

pub async fn build_dynamo_client(region: &str, endpoint_url: Option<&str>) -> DynamoClient {
    let mut builder = aws_config::defaults(BehaviorVersion::latest())
        .region(Region::new(region.to_string()));
    if let Some(url) = endpoint_url {
        builder = builder.endpoint_url(url);
    }
    let config = builder.load().await;
    DynamoClient::new(&config)
}

pub async fn build_s3_client(region: &str, endpoint_url: Option<&str>) -> S3Client {
    let mut builder = aws_config::defaults(BehaviorVersion::latest())
        .region(Region::new(region.to_string()));
    if let Some(url) = endpoint_url {
        builder = builder.endpoint_url(url);
    }
    let config = builder.load().await;
    let s3_config = aws_sdk_s3::config::Builder::from(&config)
        .force_path_style(true)
        .build();
    S3Client::from_conf(s3_config)
}

pub async fn build_cognito_client(region: &str, endpoint_url: Option<&str>) -> CognitoClient {
    let mut builder = aws_config::defaults(BehaviorVersion::latest())
        .region(Region::new(region.to_string()));
    if let Some(url) = endpoint_url {
        builder = builder.endpoint_url(url);
    }
    let config = builder.load().await;
    CognitoClient::new(&config)
}
