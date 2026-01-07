provider "aws" {
  region = "us-east-1"  # Use a free-tier region
}

# VPC and Subnets
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

# Security Groups
resource "aws_security_group" "ec2_sg" {
  name   = "ec2_sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Restrict to your IP for security
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds_sg" {
  name   = "rds_sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id]  # Only allow from EC2
  }
}

# EC2 Instance (t2.micro for free tier)
resource "aws_instance" "k3s_server" {
  ami           = "ami-0c55b159cbfafe1d0"  # Amazon Linux 2 (free tier)
  instance_type = "t2.micro"
  subnet_id     = aws_subnet.public.id
  security_groups = [aws_security_group.ec2_sg.id]
  key_name      = "your-key-pair"  # Create in AWS Console if needed

  tags = {
    Name = "k3s-server"
  }
}

# RDS MySQL (t2.micro for free tier)
resource "aws_db_instance" "mydb" {
  identifier           = "mydb"
  engine               = "mysql"
  instance_class       = "db.t2.micro"
  allocated_storage    = 20
  username             = "admin"
  password             = "password123"  # Change and use secrets manager in prod
  db_name              = "mydb"
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name = aws_db_subnet_group.default.name
  publicly_accessible = false
}

resource "aws_db_subnet_group" "default" {
  name       = "main"
  subnet_ids = [aws_subnet.public.id]
}