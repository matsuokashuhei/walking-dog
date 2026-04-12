# --- CloudFront distribution for dog photos ---

resource "aws_cloudfront_origin_access_control" "dog_photos" {
  name                              = "${var.project_name}-${var.environment}-dog-photos"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "dog_photos" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name}-${var.environment} dog photos"
  price_class         = "PriceClass_200"
  default_root_object = ""

  origin {
    domain_name              = aws_s3_bucket.dog_photos.bucket_regional_domain_name
    origin_id                = "s3-dog-photos"
    origin_access_control_id = aws_cloudfront_origin_access_control.dog_photos.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-dog-photos"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS managed policy: CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- S3 bucket policy: allow CloudFront OAC to read objects ---

data "aws_iam_policy_document" "dog_photos" {
  statement {
    sid       = "AllowCloudFrontServicePrincipalRead"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.dog_photos.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.dog_photos.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "dog_photos" {
  bucket = aws_s3_bucket.dog_photos.id
  policy = data.aws_iam_policy_document.dog_photos.json
}
