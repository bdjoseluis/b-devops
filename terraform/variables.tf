variable "tenancy_ocid"          { description = "OCID del tenancy (en OCI → Profile → Tenancy)" }
variable "user_ocid"             { description = "OCID de tu usuario (en OCI → Profile → User)" }
variable "fingerprint"           { description = "Fingerprint de tu API key OCI" }
variable "private_key_path"      { description = "Ruta a tu clave privada OCI (~/.oci/oci_api_key.pem)" }
variable "region"                { description = "Región OCI (ej: eu-frankfurt-1)" default = "eu-frankfurt-1" }
variable "compartment_id"        { description = "OCID del compartment (mismo que tenancy_ocid para root)" }
variable "ssh_public_key_path"   { description = "Ruta a tu clave SSH pública (~/.ssh/id_rsa.pub)" default = "~/.ssh/id_rsa.pub" }
variable "cloudflare_tunnel_token" { description = "Token del Cloudflare Tunnel" default = "" }
variable "ubuntu_arm_image_id"   {
  description = "OCID de Ubuntu 22.04 ARM en Frankfurt"
  # Obtén el OCID correcto en: https://docs.oracle.com/en-us/iaas/images/
  default = "ocid1.image.oc1.eu-frankfurt-1.aaaaaaaav7pke7dfomrjb7ib45ggxvkxywjrmzqobrgxkv7v4kzxlj5lf2na"
}
