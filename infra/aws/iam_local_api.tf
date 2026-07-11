# --- IAM Role for local API Cognito access ---

# This role is intentionally limited to the Cognito user pool used by the
# local API. The local DynamoDB, S3, and SQS emulators do not require AWS
# permissions, and the Cognito end-user operations are authorized by the app
# client rather than by this role.
resource "aws_iam_role" "local_api" {
  name = "${var.project_name}-${var.environment}-local-api"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAdministratorSsoRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          ArnLike = {
            "aws:PrincipalArn" = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/aws-reserved/sso.amazonaws.com/*/AWSReservedSSO_AdministratorAccess_*"
          }
        }
      },
    ]
  })

  tags = {
    Environment = "local"
    Project     = var.project_name
    Purpose     = "Local API Cognito access"
  }
}

resource "aws_iam_role_policy" "local_api" {
  name = "${var.project_name}-${var.environment}-local-api-cognito"
  role = aws_iam_role.local_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "LocalCognitoUserManagement"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminDeleteUser",
        ]
        Resource = aws_cognito_user_pool.local.arn
      },
    ]
  })
}
