#!/bin/bash
set -e

SERVICES=(
  "api-gateway"
  "auth-service"
  "cart-service"
  "catalog-service"
  "notification-service"
  "order-service"
  "payment-service"
  "product-service"
  "promo-service"
)

echo "📦 Installing Node dependencies for backend services"
echo "===================================================="

for service in "${SERVICES[@]}"; do
  echo ""
  echo "➡️ Installing dependencies for: $service"

  if [ ! -d "$service" ]; then
    echo "❌ Service directory not found: $service"
    exit 1
  fi

  cd "$service"

  if [ ! -f "package-lock.json" ]; then
    echo "❌ package-lock.json missing in $service"
    exit 1
  fi

  npm ci

  cd ..
done

echo ""
echo "✅ All backend dependencies installed successfully"
