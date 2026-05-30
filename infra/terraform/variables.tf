variable "clouding_api_key" {
  description = "API Key de Clouding.io (Cuenta → API → Generar clave)"
  type        = string
  sensitive   = true
}

variable "server_name" {
  description = "Nombre del servidor en Clouding"
  type        = string
  default     = "bdev-vps"
}

variable "hostname" {
  description = "Hostname del servidor"
  type        = string
  default     = "bdev-vps"
}

variable "vcores" {
  description = <<-EOT
    Número de vCores. Referencia para 13-15 contenedores:
      2 vCores → ajustado (mínimo viable)
      4 vCores → recomendado con holgura  ← default
      8 vCores → producción con carga alta
  EOT
  type        = number
  default     = 4
}

variable "ram_gb" {
  description = <<-EOT
    GB de RAM. Debe ser múltiplo de vcores según ratio elegido:
      ratio 2GB/vCore → 4 vCores = 8 GB   ← recomendado
      ratio 4GB/vCore → 4 vCores = 16 GB  (más holgura para ClickHouse)
  EOT
  type        = number
  default     = 8
}

variable "disk_gb" {
  description = "Tamaño del disco NVMe en GB (mínimo 20, recomendado 60 para logs + datos)"
  type        = number
  default     = 60
}

variable "image_id" {
  description = <<-EOT
    ID de la imagen en Clouding. Ubuntu 24.04 LTS (Noble Numbat).
    Consulta los IDs disponibles en: portal.clouding.io → crear servidor → Ubuntu.
    Por defecto se asume el slug de Ubuntu 24.04 — ajusta si tu cuenta usa un ID numérico.
  EOT
  type        = string
  default     = "ubuntu-24.04"
}

variable "ssh_public_key" {
  description = "Contenido de tu clave pública SSH (~/.ssh/id_rsa.pub o id_ed25519.pub)"
  type        = string
}

variable "ssh_key_name" {
  description = "Nombre de la clave SSH en Clouding"
  type        = string
  default     = "bdev-ops-key"
}

variable "backups_enabled" {
  description = "Activar snapshots automáticos (+20% del coste)"
  type        = bool
  default     = false
}
