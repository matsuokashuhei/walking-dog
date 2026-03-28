# --- Route53 ---

resource "aws_route53_zone" "main" {
  name = "walkingdogdev.dpdns.org"
}
