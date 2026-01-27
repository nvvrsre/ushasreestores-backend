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

echo "🧪 Running backend tests"
echo "======================="

for service in "${SERVICES[@]}"; do
  echo ""
  echo "➡️ Testing service: $service"

  if [ ! -d "$service" ]; then
    echo "❌ Service directory not found: $service"
    exit 1
  fi

  cd "$service"

  if [ ! -f "package.json" ]; then
    echo "❌ package.json missing in $service"
    exit 1
  fi

  # Check if test script exists
  if npm pkg get scripts.test | grep -qv null; then
    npm test
  else
    echo "⚠️ No test script found in $service — skipping tests (temporary)"
  fi

  cd ..
done

echo ""
echo "✅ Backend test stage completed"
