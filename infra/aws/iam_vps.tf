# --- IAM User for Sakura VPS API ---

resource "aws_iam_user" "vps_api" {
  name = "${var.project_name}-${var.environment}-vps-api"

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_access_key" "vps_api" {
  user = aws_iam_user.vps_api.name
}

resource "aws_iam_user_policy" "vps_api" {
  name = "${var.project_name}-${var.environment}-vps-api"
  user = aws_iam_user.vps_api.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDB"
        Effect = "Allow"
        Action = [
          "dynamodb:BatchWriteItem",
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
        ]
        Resource = aws_dynamodb_table.walk_points.arn
      },
      {
        Sid    = "S3"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
        ]
        Resource = "${aws_s3_bucket.dog_photos.arn}/*"
      },
      {
        Sid    = "Cognito"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:ListUsers",
        ]
        Resource = aws_cognito_user_pool.main.arn
      },
      {
        Sid      = "ECRAuth"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
        Resource = aws_ecr_repository.api.arn
      },
    ]
  })
}
