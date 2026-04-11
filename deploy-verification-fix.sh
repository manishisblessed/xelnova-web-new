#!/bin/bash
set -e

echo "========================================="
echo "  Xelnova Verification Fix - Production"
echo "========================================="
echo ""

# Step 1: Add missing env vars to ~/backend/.env (the master .env)
MASTER_ENV="$HOME/backend/.env"

add_env_if_missing() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$MASTER_ENV" 2>/dev/null; then
    echo "  [OK] $key already exists"
  else
    echo "" >> "$MASTER_ENV"
    echo "${key}=${value}" >> "$MASTER_ENV"
    echo "  [ADDED] $key"
  fi
}

echo "Step 1: Ensuring verification env vars in $MASTER_ENV"
add_env_if_missing 'GSTIN_API_KEY' '"8a8e34cd78c26d2d0a59cc9a51746065"'
add_env_if_missing 'EKYCHUB_USERNAME' '"9259055514"'
add_env_if_missing 'EKYCHUB_TOKEN' '"d102591250467ea13760c654c7a6f15e"'
add_env_if_missing 'EKYCHUB_DIGILOCKER_REDIRECT_URL' '"https://api.xelnova.in/api/v1/verification/digilocker/callback"'
echo ""

# Step 2: Copy master .env to working repo
echo "Step 2: Syncing .env to working directory"
cp "$MASTER_ENV" "$HOME/xelnova-web-new/backend/.env"
echo "  Copied $MASTER_ENV -> ~/xelnova-web-new/backend/.env"
echo ""

# Step 3: Pull latest code, build, and restart
echo "Step 3: Pulling latest code and rebuilding"
cd "$HOME/xelnova-web-new"
git pull origin main
npm ci
NODE_OPTIONS="--max-old-space-size=4096" npm run build
echo ""

# Step 4: Copy .env again (in case build overwrote it)
cp "$MASTER_ENV" "$HOME/xelnova-web-new/backend/.env"

# Step 5: Restart backend
echo "Step 4: Restarting backend"
pm2 restart xelnova-api
sleep 3

# Step 6: Verify
echo ""
echo "Step 5: Verifying..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/api/v1/verification/gstin/07FSZPM1862G1Z2 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  GSTIN verification: WORKING (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "400" ]; then
  echo "  GSTIN verification: WORKING (HTTP $HTTP_CODE - invalid GSTIN is expected)"
else
  echo "  GSTIN verification: HTTP $HTTP_CODE (check pm2 logs xelnova-api)"
fi

echo ""
echo "========================================="
echo "  Done! Restart other apps if needed:"
echo "  pm2 restart all"
echo "========================================="
