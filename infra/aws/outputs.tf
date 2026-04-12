output "aws_region" {
  value = var.aws_region
}

# --- Cognito ---

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  value = aws_cognito_user_pool.main.arn
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.app.id
}

output "cognito_domain" {
  value = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

# --- DynamoDB ---

output "dynamodb_table_walk_points" {
  value = aws_dynamodb_table.walk_points.name
}

# --- S3 ---

output "s3_bucket_dog_photos" {
  value = aws_s3_bucket.dog_photos.bucket
}

# --- CloudFront ---

output "cloudfront_dog_photos_domain" {
  value = aws_cloudfront_distribution.dog_photos.domain_name
}

output "cloudfront_dog_photos_url" {
  value = "https://${aws_cloudfront_distribution.dog_photos.domain_name}"
}

/*
# --- RDS ---

output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "rds_password" {
  value     = random_password.db_password.result
  sensitive = true
}

output "database_url" {
  value     = "postgres://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive = true
}

# --- ECS ---

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}
*/

# --- Networking ---

output "vpc_id" {
  value = aws_vpc.main.id
}

/*
output "alb_security_group_id" {
  value = aws_security_group.alb.id
}
*/

# --- GitHub Actions ---

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}

# --- Route53 ---

output "route53_zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "route53_nameservers" {
  value = aws_route53_zone.main.name_servers
}

# --- ACM ---

output "acm_certificate_arn" {
  value = aws_acm_certificate.main.arn
}

# --- ECR ---

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

# --- VPS API IAM User ---

output "vps_api_access_key_id" {
  value = aws_iam_access_key.vps_api.id
}

output "vps_api_secret_access_key" {
  value     = aws_iam_access_key.vps_api.secret
  sensitive = true
}
