#!/bin/bash
# Script de inicialización automática del servidor Oracle Cloud
# Se ejecuta una sola vez al crear la VM

set -e
export DEBIAN_FRONTEND=noninteractive

echo "=== B-DEVOPS Server Setup ==="

# Actualizar sistema
apt-get update -qq && apt-get upgrade -y -qq

# Instalar dependencias
apt-get install -y -qq curl wget git unzip

# Instalar k3s (Kubernetes ligero)
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --node-name bdev-server

# Esperar a que k3s esté listo
sleep 30
until kubectl get nodes 2>/dev/null | grep -q Ready; do sleep 5; done
echo "k3s listo"

# Instalar Helm
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Instalar Traefik via Helm (ingress controller)
helm repo add traefik https://traefik.github.io/charts
helm repo update
kubectl create namespace traefik --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install traefik traefik/traefik \
  --namespace traefik \
  --set ports.web.port=80 \
  --set ports.websecure.port=443

# Instalar cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# Instalar cloudflared si hay token
%{ if cloudflare_token != "" }
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
cloudflared service install ${cloudflare_token}
%{ endif }

# Firewall (Oracle Cloud usa iptables además del security list)
iptables -I INPUT -p tcp --dport 80 -j ACCEPT
iptables -I INPUT -p tcp --dport 443 -j ACCEPT
iptables -I INPUT -p tcp --dport 6443 -j ACCEPT
netfilter-persistent save 2>/dev/null || true

echo "=== Setup completado ==="
echo "Kubeconfig en: /etc/rancher/k3s/k3s.yaml"
