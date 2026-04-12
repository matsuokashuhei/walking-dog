# --- Route53 ---

resource "aws_route53_zone" "main" {
  name = "walkingdogdev.dpdns.org"
}

# --- Sakura VPS (test environment) ---

resource "aws_route53_record" "vps_a" {
  zone_id         = aws_route53_zone.main.zone_id
  name            = "walkingdogdev.dpdns.org"
  type            = "A"
  ttl             = 300
  records         = ["133.167.103.109"]
  allow_overwrite = true
}
