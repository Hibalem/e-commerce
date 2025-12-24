variable "aws_region" {
  default = "us-east-1"
}

variable "cluster_name" {
  default = "my-cluster"
}

variable "key_name" {
  description = "EC2 key pair for nodes"
  type        = string
}

variable "db_username" {
  default = "admin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}