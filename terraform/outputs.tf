output "cluster_name" {
  value = module.eks_cluster.cluster_id
}

output "rds_endpoint" {
  value = aws_db_instance.example.endpoint
}