# ─────────────────────────────────────────────────────────────────────────────
# AURA OPS — Oracle Cloud Always Free Infrastructure
# VM ARM Ampere A1: 4 OCPU + 24GB RAM — completamente gratis para siempre
#
# Uso:
#   1. Rellena terraform.tfvars con tus credenciales OCI
#   2. terraform init
#   3. terraform plan
#   4. terraform apply
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# ── VCN (red virtual) ────────────────────────────────────────────────────────
resource "oci_core_vcn" "aura_vcn" {
  compartment_id = var.compartment_id
  cidr_block     = "10.0.0.0/16"
  display_name   = "aura-ops-vcn"
  dns_label      = "auraops"
}

resource "oci_core_internet_gateway" "aura_igw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.aura_vcn.id
  display_name   = "aura-igw"
  enabled        = true
}

resource "oci_core_route_table" "aura_rt" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.aura_vcn.id
  display_name   = "aura-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.aura_igw.id
  }
}

resource "oci_core_subnet" "aura_subnet" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.aura_vcn.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "aura-subnet"
  dns_label         = "aurasubnet"
  route_table_id    = oci_core_route_table.aura_rt.id
  security_list_ids = [oci_core_security_list.aura_sl.id]
}

# ── Security List (firewall) ─────────────────────────────────────────────────
resource "oci_core_security_list" "aura_sl" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.aura_vcn.id
  display_name   = "aura-security-list"

  # Salida libre
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # SSH
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 22; max = 22 }
  }

  # HTTP (para Cloudflare Tunnel outbound — no estrictamente necesario)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 80; max = 80 }
  }

  # HTTPS
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 443; max = 443 }
  }

  # k3s API
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 6443; max = 6443 }
  }
}

# ── VM ARM Ampere A1 — 4 OCPU + 24GB — Always Free ──────────────────────────
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

resource "oci_core_instance" "aura_server" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "aura-ops-server"
  shape               = "VM.Standard.A1.Flex"  # ARM — Always Free

  shape_config {
    ocpus         = 4
    memory_in_gbs = 24
  }

  source_details {
    source_type = "image"
    source_id   = var.ubuntu_arm_image_id  # Ubuntu 22.04 ARM
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.aura_subnet.id
    assign_public_ip = true
    display_name     = "aura-vnic"
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(templatefile("${path.module}/cloud-init.sh", {
      cloudflare_token = var.cloudflare_tunnel_token
    }))
  }
}

# ── Outputs ──────────────────────────────────────────────────────────────────
output "server_public_ip" {
  value       = oci_core_instance.aura_server.public_ip
  description = "IP pública del servidor — apunta tu dominio aquí en Cloudflare"
}

output "ssh_command" {
  value       = "ssh ubuntu@${oci_core_instance.aura_server.public_ip}"
  description = "Comando SSH para conectarte al servidor"
}
