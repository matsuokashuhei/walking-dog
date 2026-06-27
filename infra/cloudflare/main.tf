terraform {
  required_version = ">= 1.5"

  backend "s3" {
    bucket = "walking-dog-tfstate-967026628831"
    key    = "cloudflare/cacheandbuffer.com/terraform.tfstate"
    region = "ap-northeast-1"
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {}
