terraform {
  required_version = ">= 1.6"

  required_providers {
    clouding = {
      source  = "clouding-io/clouding"
      version = "~> 0.1"
    }
  }

  # Backend remoto opcional (Terraform Cloud / S3):
  # backend "remote" {
  #   organization = "bdev-ops"
  #   workspaces { name = "bdev-prod" }
  # }
}

provider "clouding" {
  api_key = var.clouding_api_key
}
