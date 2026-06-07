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

output "ses_cognito_domain_identity_arn" {
  description = "Amazon SES domain identity ARN used by Cognito when cognito_use_ses_email is true."
  value       = aws_ses_domain_identity.cognito.arn
}

output "ses_cloudflare_dns_records" {
  description = "DNS records to add in Cloudflare for SES domain verification, DKIM, custom MAIL FROM, and DMARC."
  value       = local.ses_cloudflare_dns_records
}

output "ses_sandbox_recipient_email_identities" {
  description = "SES email identities requested by Terraform for sandbox recipient testing. Each recipient must click the SES verification email link."
  value       = sort(tolist(var.ses_sandbox_recipient_email_addresses))
}

# --- DynamoDB ---

output "dynamodb_table_track_point" {
  value = aws_dynamodb_table.track_point.name
}

output "track_point_queue_url" {
  value = aws_sqs_queue.track_point.id
}

# --- S3 ---

output "s3_bucket_avatars" {
  value = aws_s3_bucket.avatars.bucket
}

output "s3_bucket_photos" {
  value = aws_s3_bucket.photos.bucket
}

# --- CloudFront ---

output "cloudfront_avatars_domain" {
  value = aws_cloudfront_distribution.avatars.domain_name
}

output "cloudfront_avatars_url" {
  value = "https://${aws_cloudfront_distribution.avatars.domain_name}"
}

output "cloudfront_photos_domain" {
  value = aws_cloudfront_distribution.photos.domain_name
}

output "cloudfront_photos_url" {
  value = "https://${aws_cloudfront_distribution.photos.domain_name}"
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
