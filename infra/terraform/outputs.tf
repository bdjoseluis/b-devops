output "server_ip" {
  description = "IP pública IPv4 del VPS — úsala en el inventario Ansible: HETZNER_VPS_IP=<valor>"
  value       = hcloud_server.bdev.ipv4_address
}

output "server_ipv6" {
  description = "IP pública IPv6 del VPS"
  value       = hcloud_server.bdev.ipv6_address
}

output "server_id" {
  description = "ID del servidor en Hetzner Cloud"
  value       = hcloud_server.bdev.id
}

output "server_status" {
  description = "Estado del servidor (running / off)"
  value       = hcloud_server.bdev.status
}

output "ansible_command" {
  description = "Comando listo para ejecutar el playbook de Ansible contra este VPS"
  value       = "HETZNER_VPS_IP=${hcloud_server.bdev.ipv4_address} ansible-playbook -i infra/ansible/hosts.yaml infra/ansible/deploy-base.yaml --limit hetzner"
}
