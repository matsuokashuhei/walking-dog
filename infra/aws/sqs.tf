resource "aws_sqs_queue" "walk_points_dlq" {
  name                       = "${var.project_name}-${var.environment}-walk-points-dlq"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_sqs_queue" "walk_points" {
  name                       = "${var.project_name}-${var.environment}-walk-points"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.walk_points_dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
