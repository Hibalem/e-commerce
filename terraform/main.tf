terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"  # Pin to v4+ for compatibility with module v19
    }
  }
  required_version = ">= 1.0"  # Ensure Terraform is recent
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = element(data.aws_availability_zones.available.names, count.index)
  map_public_ip_on_launch = true
}

data "aws_availability_zones" "available" {}

resource "aws_security_group" "eks_security_group" {
  name        = "eks_security_group"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Restrict in production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

module "eks_cluster" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "~> 19.0"
  cluster_name    = "my-cluster"
  cluster_version = "1.27"
  subnet_ids      = aws_subnet.public[*].id
  vpc_id          = aws_vpc.main.id
  create_iam_role = false 
  iam_role_arn    = "arn:aws:iam::891377219096:role/voclabs" 

  self_managed_node_groups = {
    eks_nodes = {
      desired_capacity = 2
      max_capacity     = 3
      min_capacity     = 1
      instance_type    = "t3.medium"
    }
  }
}

resource "aws_db_subnet_group" "example" {
  name       = "main"
  subnet_ids = aws_subnet.public[*].id
}

resource "aws_db_instance" "example" {
  identifier              = "mydbinstance"
  engine                  = "mysql"
  instance_class          = "db.t3.micro"
  allocated_storage       = 20
  username                = "admin"
  password                = "password"  # Secure with Secrets Manager
  db_name                 = "mydb"
  vpc_security_group_ids  = [aws_security_group.eks_security_group.id]
  db_subnet_group_name    = aws_db_subnet_group.example.name
  publicly_accessible     = false
}