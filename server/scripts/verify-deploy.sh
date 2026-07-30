#!/bin/bash
# Deployment Verification Script
# Run: ./verify-deploy.sh

set -e

SERVER_URL=${API_URL:-"http://localhost:3001/api"}
CLIENT_URL=${CLIENT_URL:-"http://localhost:5173"}

echo "=========================================="
echo " Starting Post-Deployment Verification"
echo "=========================================="

# 1. Check Server Health
echo -n "Checking API Health... "
HEALTH_RES=$(curl -s -w "%{http_code}" -o /dev/null ${SERVER_URL}/health)
if [ "$HEALTH_RES" = "200" ]; then
  echo "✅ OK (200)"
else
  echo "❌ FAILED ($HEALTH_RES)"
  exit 1
fi

# 2. Check Client Load
echo -n "Checking Client App... "
CLIENT_RES=$(curl -s -w "%{http_code}" -o /dev/null ${CLIENT_URL})
if [ "$CLIENT_RES" = "200" ]; then
  echo "✅ OK (200)"
else
  echo "❌ FAILED ($CLIENT_RES)"
  exit 1
fi

# 3. Check Database Connection via an endpoint
echo -n "Checking Database Connectivity... "
# Logging in to verify DB
LOGIN_RES=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"admin@vastu.com","password":"admin123"}' ${SERVER_URL}/auth/login)

if echo "$LOGIN_RES" | grep -q "accessToken"; then
  echo "✅ OK (Login successful)"
else
  echo "❌ FAILED (Login failed, DB might be down)"
  exit 1
fi

echo "=========================================="
echo "🎉 Deployment Verification PASSED"
echo "=========================================="
