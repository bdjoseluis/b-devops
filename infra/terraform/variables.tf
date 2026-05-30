variable "hcloud_token" {
  description = "API token de Hetzner Cloud (Project → Security → API Tokens → Read+Write)"
  type        = string
  sensitive   = true
}

variable "server_type" {
  description = <<-EOT
    Tipo de servidor Hetzner. Recomendación para 13-15 contenedores:
      cx22  → 2 vCPU / 4 GB RAM  (mínimo viable, precio ~4 €/mes)
      cx32  → 4 vCPU / 8 GB RAM  (recomendado con holgura, ~8 €/mes)
      cx42  → 8 vCPU / 16 GB RAM (producción con carga real, ~16 €/mes)
  EOT
  type        = string
  default     = "cx32"

  validation {
    condition     = contains(["cx22", "cx32", "cx42", "cx52", "cpx11", "cpx21", "cpx31"], var.server_type)
    error_message = "Tipo de servidor no válido. Usa cx22, cx32, cx42 o similar."
  }
}

variable "location" {
  description = <<-EOT
    Datacenter de Hetzner:
      nbg1 → Nuremberg (Alemania) — latencia baja para España
      hel1 → Helsinki (Finlandia)
      fsn1 → Falkenstein (Alemania)
      ash  → Ashburn (EEUU)
  EOT
  type        = string
  default     = "nbg1"

  validation {
    condition     = contains(["nbg1", "hel1", "fsn1", "ash", "hil"], var.location)
    error_message = "Localización no válida. Usa nbg1, hel1, fsn1 o ash."
  }
}

variable "ssh_public_key" {
  description = "Contenido de la clave SSH pública (~/.ssh/id_rsa.pub) para inyectar en el servidor"
  type        = string
}

variable "server_name" {
  description = "Nombre del servidor en Hetzner Cloud"
  type        = string
  default     = "bdev-vps"
}

variable "image" {
  description = "Imagen del sistema operativo"
  type        = string
  default     = "ubuntu-24.04"
}

variable "backups_enabled" {
  description = "Activar backups automáticos de Hetzner (+20% del coste del servidor)"
  type        = bool
  default     = false
}
