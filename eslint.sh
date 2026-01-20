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

ROOT_DIR="$(pwd)"

echo "🚀 Running ESLint for backend services"
echo "====================================="

for service in "${SERVICES[@]}"; do
  echo ""
  echo "🔍 Linting: $service"

  cd "$ROOT_DIR/$service"

  # Fail on ERRORS only, allow WARNINGS
  npx eslint . --max-warnings=-1

  cd "$ROOT_DIR"
done

echo ""
echo "✅ ESLint completed (errors block, warnings allowed)"
