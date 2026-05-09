resource "aws_sqs_queue" "track_point_dlq" {
  name                       = "${var.project_name}-${var.environment}-track-point-dlq"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_sqs_queue" "track_point" {
  name                       = "${var.project_name}-${var.environment}-track-point"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.track_point_dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
