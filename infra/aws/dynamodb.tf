resource "aws_dynamodb_table" "walk_points" {
  name         = "${var.project_name}-${var.environment}-WalkPoints"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
