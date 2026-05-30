# ─── SSH Key ─────────────────────────────────────────────────────────────────
resource "hcloud_ssh_key" "bdev" {
  name       = "bdev-ops-key"
  public_key = var.ssh_public_key

  labels = {
    project = "bdev-ops"
    managed = "terraform"
  }
}

# ─── Firewall ─────────────────────────────────────────────────────────────────
resource "hcloud_firewall" "bdev" {
  name = "bdev-firewall"

  # SSH
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # HTTP
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # HTTPS
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # WireGuard VPN
  rule {
    direction = "in"
    protocol  = "udp"
    port      = "51820"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # ICMP (ping)
  rule {
    direction = "in"
    protocol  = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  labels = {
    project = "bdev-ops"
    managed = "terraform"
  }
}

# ─── VPS ──────────────────────────────────────────────────────────────────────
resource "hcloud_server" "bdev" {
  name        = var.server_name
  server_type = var.server_type
  image       = var.image
  location    = var.location
  backups     = var.backups_enabled

  ssh_keys = [hcloud_ssh_key.bdev.id]

  firewall_ids = [hcloud_firewall.bdev.id]

  # Cloud-init: prepara el servidor al nacer
  # Crea usuario deploy, instala herramientas mínimas, desactiva login root por password
  user_data = <<-EOT
    #cloud-config
    package_update: true
    package_upgrade: true
    packages:
      - git
      - curl
      - ca-certificates
      - ufw

    users:
      - name: deploy
        groups: sudo, docker
        shell: /bin/bash
        sudo: ALL=(ALL) NOPASSWD:ALL
        ssh_authorized_keys:
          - ${var.ssh_public_key}

    runcmd:
      - ufw allow 22/tcp
      - ufw allow 80/tcp
      - ufw allow 443/tcp
      - ufw allow 51820/udp
      - ufw --force enable
  EOT

  labels = {
    project     = "bdev-ops"
    environment = "production"
    managed     = "terraform"
  }
}

# ─── DNS (opcional — descomenta si gestionas el dominio en Hetzner DNS) ──────
# resource "hcloud_rdns" "bdev_ipv4" {
#   server_id  = hcloud_server.bdev.id
#   ip_address = hcloud_server.bdev.ipv4_address
#   dns_ptr    = "bdev.qzz.io"
# }
