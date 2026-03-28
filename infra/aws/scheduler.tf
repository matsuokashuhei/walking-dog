data "archive_file" "scheduler" {
  type        = "zip"
  source_file = "${path.module}/lambda/scheduler.py"
  output_path = "${path.module}/lambda/scheduler.zip"
}

resource "aws_lambda_function" "scheduler" {
  filename         = data.archive_file.scheduler.output_path
  source_code_hash = data.archive_file.scheduler.output_base64sha256
  function_name    = "${var.project_name}-${var.environment}-scheduler"
  role             = aws_iam_role.scheduler_lambda.arn
  handler          = "scheduler.handler"
  runtime          = "python3.12"
  timeout          = 900
  memory_size      = 128

  environment {
    variables = {
      DB_INSTANCE_ID   = aws_db_instance.main.identifier
      ECS_CLUSTER      = aws_ecs_cluster.main.name
      ECS_SERVICE_NAME = "${var.project_name}-${var.environment}-api"
      TASK_DEFINITION  = aws_ecs_task_definition.api.family
      SUBNET_IDS       = jsonencode([aws_subnet.public_a.id, aws_subnet.public_c.id])
      ALB_SG_ID        = aws_security_group.alb.id
      ECS_SG_ID        = aws_security_group.ecs.id
      VPC_ID           = aws_vpc.main.id
      PROJECT_NAME        = var.project_name
      ENVIRONMENT         = var.environment
      ACM_CERTIFICATE_ARN = aws_acm_certificate_validation.main.certificate_arn
      ROUTE53_ZONE_ID     = aws_route53_zone.main.zone_id
      DOMAIN_NAME         = "walkingdogdev.dpdns.org"
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- EventBridge: Start on Friday 18:00 JST (09:00 UTC) ---

resource "aws_cloudwatch_event_rule" "start_weekend" {
  name                = "${var.project_name}-${var.environment}-start-weekend"
  description         = "Start dev environment on Friday 18:00 JST"
  schedule_expression = "cron(0 9 ? * FRI *)"

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cloudwatch_event_target" "start_weekend" {
  rule = aws_cloudwatch_event_rule.start_weekend.name
  arn  = aws_lambda_function.scheduler.arn

  input = jsonencode({ action = "start" })
}

resource "aws_lambda_permission" "start_weekend" {
  statement_id  = "AllowEventBridgeStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_weekend.arn
}

# --- EventBridge: Stop on Sunday 23:00 JST (14:00 UTC) ---

resource "aws_cloudwatch_event_rule" "stop_weekend" {
  name                = "${var.project_name}-${var.environment}-stop-weekend"
  description         = "Stop dev environment on Sunday 23:00 JST"
  schedule_expression = "cron(0 14 ? * SUN *)"

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cloudwatch_event_target" "stop_weekend" {
  rule = aws_cloudwatch_event_rule.stop_weekend.name
  arn  = aws_lambda_function.scheduler.arn

  input = jsonencode({ action = "stop" })
}

resource "aws_lambda_permission" "stop_weekend" {
  statement_id  = "AllowEventBridgeStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_weekend.arn
}
