#!/usr/bin/env bash
set -euo pipefail

### ===== CONFIG =====
VERSION="v26.1.0"
DOCKER_USER="nvvrsre"

BACKEND_SERVICES=(
  api-gateway
  auth-service
  product-service
  cart-service
  order-service
  payment-service
  catalog-service
  promo-service
  notification-service
)

FRONTEND_DIR="../frontend"
FRONTEND_IMAGE="frontend"

### ===================

echo "========================================="
echo "Building & pushing images with version: $VERSION"
echo "Docker Hub user: $DOCKER_USER"
echo "========================================="

# Ensure Docker is running
docker info >/dev/null 2>&1 || {
  echo "❌ Docker is not running"
  exit 1
}


# -------- Backend services --------
for service in "${BACKEND_SERVICES[@]}"; do
  echo ""
  echo "🚀 Building backend service: $service"

  if [ ! -f "$service/Dockerfile" ]; then
    echo "❌ Dockerfile not found in $service"
    exit 1
  fi

  IMAGE="$DOCKER_USER/$service:$VERSION"

  docker build -t "$IMAGE" "$service"
  docker push "$IMAGE"

  echo "✅ Pushed $IMAGE"
done

# -------- Frontend --------
echo ""
echo "🚀 Building frontend"

if [ ! -f "$FRONTEND_DIR/Dockerfile" ]; then
  echo "❌ Dockerfile not found in frontend directory"
  exit 1
fi

FRONTEND_IMAGE_TAG="$DOCKER_USER/$FRONTEND_IMAGE:$VERSION"

docker build -t "$FRONTEND_IMAGE_TAG" "$FRONTEND_DIR"
docker push "$FRONTEND_IMAGE_TAG"

echo "✅ Pushed $FRONTEND_IMAGE_TAG"

echo ""
echo "========================================="
echo "🎉 All images built and pushed successfully"
echo "Version: $VERSION"
echo "========================================="
