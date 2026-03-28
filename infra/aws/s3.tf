resource "aws_s3_bucket" "dog_photos" {
  bucket = "${var.project_name}-${var.environment}-dog-photos-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_s3_bucket_cors_configuration" "dog_photos" {
  bucket = aws_s3_bucket.dog_photos.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_public_access_block" "dog_photos" {
  bucket                  = aws_s3_bucket.dog_photos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
