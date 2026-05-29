#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AURA OPS — Script de deploy
# Uso: ./deploy.sh [local|build|push|k8s]
# ─────────────────────────────────────────────────────────────────────────────

set -e

REGISTRY="${REGISTRY:-ghcr.io/TU_USUARIO}"
TAG="${TAG:-latest}"

case "${1:-local}" in

  local)
    echo "▶ Levantando stack local con Docker Compose..."
    cp -n .env.example .env 2>/dev/null || true
    docker compose up -d --build
    echo ""
    echo "✅ Stack levantado:"
    echo "   Frontend   → http://localhost:3000"
    echo "   Backend    → http://localhost:8000/docs"
    echo "   ClickHouse → http://localhost:8123/play"
    echo "   n8n        → http://localhost:5678"
    echo ""
    docker compose ps
    ;;

  build)
    echo "▶ Construyendo imágenes Docker..."
    docker build -t "$REGISTRY/aura-backend:$TAG" ./backend
    docker build -t "$REGISTRY/aura-frontend:$TAG" ./frontend
    echo "✅ Imágenes construidas:"
    echo "   $REGISTRY/aura-backend:$TAG"
    echo "   $REGISTRY/aura-frontend:$TAG"
    ;;

  push)
    echo "▶ Subiendo imágenes a $REGISTRY..."
    docker push "$REGISTRY/aura-backend:$TAG"
    docker push "$REGISTRY/aura-frontend:$TAG"
    echo "✅ Imágenes publicadas en $REGISTRY"
    ;;

  k8s)
    echo "▶ Desplegando en Kubernetes..."
    echo ""
    echo "⚠️  Antes de continuar verifica que has editado:"
    echo "   kubernetes/04-aura-backend.yaml  → YOUR_REGISTRY"
    echo "   kubernetes/05-aura-frontend.yaml → YOUR_REGISTRY"
    echo "   kubernetes/06-ingress.yaml       → TU_DOMINIO"
    echo "   kubernetes/07-cert-manager.yaml  → TU_EMAIL"
    echo ""
    read -p "¿Continuar? (y/N) " confirm
    [[ "$confirm" == "y" || "$confirm" == "Y" ]] || exit 0

    kubectl apply -k ./kubernetes/
    echo ""
    echo "✅ Manifests aplicados. Comprobando pods..."
    kubectl get pods -n aura-ops
    ;;

  stop)
    echo "▶ Deteniendo stack local..."
    docker compose down
    echo "✅ Stack detenido"
    ;;

  logs)
    docker compose logs -f "${2:-aura-backend}"
    ;;

  *)
    echo "Uso: ./deploy.sh [local|build|push|k8s|stop|logs]"
    echo ""
    echo "  local  → docker compose up (dev local)"
    echo "  build  → construir imágenes Docker"
    echo "  push   → subir imágenes a ghcr.io"
    echo "  k8s    → desplegar en Kubernetes"
    echo "  stop   → parar el stack local"
    echo "  logs   → ver logs (./deploy.sh logs aura-backend)"
    ;;
esac
