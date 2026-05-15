#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Xelnova EC2 deploy script (single-directory layout).
#
# Assumes the repo lives at  ~/xelnova-web-new  on the box and pm2 already has
# the four processes running:  xelnova-api, xelnova-seller, xelnova-web,
# xelnova-admin. Runs everything in-place (no separate ~/backend directory).
#
# Usage:   bash deploy-ec2.sh                 # deploy everything
#          bash deploy-ec2.sh backend         # backend only
#          bash deploy-ec2.sh seller          # seller app only
#          bash deploy-ec2.sh web             # customer web app only
#          bash deploy-ec2.sh admin           # admin app only
# ─────────────────────────────────────────────────────────────────────────────
set -e

REPO_ROOT="$HOME/xelnova-web-new"
BACKEND_DIR="$REPO_ROOT/backend"
TARGET="${1:-all}"

if [ ! -d "$REPO_ROOT" ]; then
  echo "ERROR: $REPO_ROOT does not exist. Clone the repo there first."
  exit 1
fi

# Resolve the backend pm2 process name (we used to rename xelnova-api →
# xelnova-backend; honour whichever one is actually online so the script
# stays idempotent).
detect_backend_pm2() {
  if pm2 describe xelnova-backend > /dev/null 2>&1; then
    echo "xelnova-backend"
  elif pm2 describe xelnova-api > /dev/null 2>&1; then
    echo "xelnova-api"
  else
    echo ""
  fi
}

ensure_backend_env() {
  local env_file="$BACKEND_DIR/.env"
  if [ ! -f "$env_file" ]; then
    echo "WARNING: $env_file is missing — the backend will not boot."
    echo "         Create it manually with the production secrets, then re-run."
    return
  fi

  # Force production URLs (idempotent — only rewrites localhost lines).
  sed -i 's|GOOGLE_CALLBACK_URL="http://localhost:4000/api/v1/auth/google/callback"|GOOGLE_CALLBACK_URL="https://api.xelnova.in/api/v1/auth/google/callback"|' "$env_file"
  sed -i 's|FRONTEND_URL="http://localhost:3000"|FRONTEND_URL="https://xelnova.in"|' "$env_file"
  sed -i 's|SELLER_URL="http://localhost:3003"|SELLER_URL="https://seller.xelnova.in"|' "$env_file"
  sed -i 's|ADMIN_URL="http://localhost:3002"|ADMIN_URL="https://admin.xelnova.in"|' "$env_file"
  sed -i 's|APP_URL="http://localhost:3000"|APP_URL="https://xelnova.in"|' "$env_file"
  sed -i 's|CORS_ORIGINS="http://localhost:3000,http://localhost:3002,http://localhost:3003"|CORS_ORIGINS="https://xelnova.in,https://www.xelnova.in,https://seller.xelnova.in,https://admin.xelnova.in"|' "$env_file"

  # NODE_ENV must be production for prisma/Nest defaults.
  grep -q '^NODE_ENV=' "$env_file" || echo 'NODE_ENV=production' >> "$env_file"

  # Razorpay — keep test keys present so checkout never silently 500s.
  grep -q '^RAZORPAY_KEY_ID='        "$env_file" || echo 'RAZORPAY_KEY_ID="rzp_test_SYXLNzHZjBIdRu"' >> "$env_file"
  grep -q '^RAZORPAY_KEY_SECRET='    "$env_file" || echo 'RAZORPAY_KEY_SECRET="36rdANPPAZTBZskZawfsT2M7"' >> "$env_file"
  grep -q '^RAZORPAY_WEBHOOK_SECRET=' "$env_file" || echo 'RAZORPAY_WEBHOOK_SECRET=""' >> "$env_file"

  if grep -q 'rzp_live_' "$env_file"; then
    echo ""
    echo "WARNING: LIVE Razorpay keys detected — real money will be charged."
    echo ""
  fi

  if ! grep -q '^FORTIUS_API_KEY=.\+' "$env_file"; then
    echo ""
    echo "WARNING: FORTIUS_API_KEY missing — OTP SMS will NOT be delivered."
    echo ""
  fi

  grep -q '^CLOUDINARY_URL=' "$env_file" || echo 'CLOUDINARY_URL=cloudinary://635444549461982:4QTXNyUtKGn9MBDcsqpw_YKhxe4@dgulzkcnq' >> "$env_file"
  grep -q '^RECAPTCHA_SITE_KEY='   "$env_file" || echo 'RECAPTCHA_SITE_KEY="6Lc4s5osAAAAAOi73vFTn5BLso8XKxXidIoDPiTm"' >> "$env_file"
  grep -q '^RECAPTCHA_PROJECT_ID=' "$env_file" || echo 'RECAPTCHA_PROJECT_ID="xelnova-1774475911864"' >> "$env_file"
  grep -q '^RECAPTCHA_API_KEY='    "$env_file" || echo "WARNING: RECAPTCHA_API_KEY not found in .env — set it manually"
}

deploy_backend() {
  local pm2_name
  pm2_name="$(detect_backend_pm2)"

  echo "=== Backend ==="
  ensure_backend_env

  echo "Building backend (in place)..."
  cd "$BACKEND_DIR"
  npx prisma generate
  # Apply any pending Prisma migrations against the prod DB. Safe — this
  # runs ONLY pending migrations and never resets data.
  echo "Applying pending Prisma migrations..."
  npx prisma migrate deploy
  npm run build

  if [ -z "$pm2_name" ]; then
    echo "No existing backend pm2 process; starting fresh as xelnova-api..."
    pm2 start dist/src/main.js --name xelnova-api --update-env --cwd "$BACKEND_DIR"
    pm2_name="xelnova-api"
  else
    echo "Restarting $pm2_name..."
    pm2 restart "$pm2_name" --update-env
  fi

  pm2 save
  sleep 3
  pm2 logs "$pm2_name" --lines 15 --nostream
}

deploy_seller() {
  echo ""
  echo "=== Seller app ==="
  cd "$REPO_ROOT/apps/seller"
  cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc4s5osAAAAAOi73vFTn5BLso8XKxXidIoDPiTm
ENVEOF
  npm run build
  pm2 describe xelnova-seller > /dev/null 2>&1 \
    && pm2 restart xelnova-seller --update-env \
    || pm2 start npm --name xelnova-seller --cwd "$REPO_ROOT/apps/seller" -- run start
  pm2 save
}

deploy_web() {
  echo ""
  echo "=== Customer web app ==="
  cd "$REPO_ROOT/apps/web"
  cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
ENVEOF
  npm run build
  pm2 describe xelnova-web > /dev/null 2>&1 \
    && pm2 restart xelnova-web --update-env \
    || pm2 start npm --name xelnova-web --cwd "$REPO_ROOT/apps/web" -- run start
  pm2 save
}

deploy_admin() {
  echo ""
  echo "=== Admin app ==="
  cd "$REPO_ROOT/apps/admin"
  npm run build
  pm2 describe xelnova-admin > /dev/null 2>&1 \
    && pm2 restart xelnova-admin --update-env \
    || pm2 start npm --name xelnova-admin --cwd "$REPO_ROOT/apps/admin" -- run start
  pm2 save
}

build_shared_packages() {
  echo ""
  echo "=== Building shared packages ==="
  cd "$REPO_ROOT/packages/utils"
  npm run build
}

case "$TARGET" in
  backend)
    build_shared_packages
    deploy_backend
    ;;
  seller)
    build_shared_packages
    deploy_seller
    ;;
  web)
    build_shared_packages
    deploy_web
    ;;
  admin)
    build_shared_packages
    deploy_admin
    ;;
  all)
    build_shared_packages
    deploy_backend
    deploy_seller
    deploy_web
    deploy_admin
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: bash deploy-ec2.sh [all|backend|seller|web|admin]"
    exit 1
    ;;
esac

echo ""
echo "=== Done ==="
pm2 list
