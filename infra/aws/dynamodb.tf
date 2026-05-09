resource "aws_dynamodb_table" "track_point" {
  name         = "${var.project_name}-${var.environment}-track-point"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "walk_id"
  range_key    = "tracked_at"

  attribute {
    name = "walk_id"
    type = "S"
  }

  attribute {
    name = "tracked_at"
    type = "N"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
