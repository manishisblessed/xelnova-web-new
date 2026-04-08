#!/bin/bash
set -e

echo "========================================="
echo "  STEP 0: Add swap space (2GB)"
echo "========================================="
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo "Swap created and enabled"
else
  sudo swapon /swapfile 2>/dev/null || true
  echo "Swap already exists"
fi
free -h | grep -i swap
echo ""

echo "========================================="
echo "  STEP 1: Clean up disk space"
echo "========================================="
rm -rf ~/xelnova-web-new/node_modules/.cache 2>/dev/null || true
rm -rf ~/xelnova-web-new/apps/web/.next 2>/dev/null || true
rm -rf ~/xelnova-web-new/apps/seller/.next 2>/dev/null || true
rm -rf ~/xelnova-web-new/apps/admin/.next 2>/dev/null || true
rm -rf /tmp/npm-* 2>/dev/null || true
echo "Cleaned caches"
df -h / | tail -1
echo ""

echo "========================================="
echo "  STEP 2: Fix Razorpay + copy .env"
echo "========================================="
# Ensure test keys in both locations
sed -i 's|RAZORPAY_KEY_ID=rzp_live_[^"]*|RAZORPAY_KEY_ID=rzp_test_SYXLNzHZjBIdRu|' ~/backend/.env 2>/dev/null || true
cp ~/backend/.env ~/xelnova-web-new/backend/.env
grep -q '^NODE_ENV=' ~/xelnova-web-new/backend/.env || echo 'NODE_ENV=production' >> ~/xelnova-web-new/backend/.env
echo "Razorpay key: $(grep RAZORPAY_KEY_ID ~/xelnova-web-new/backend/.env)"
echo "Fortius key: $(grep FORTIUS_API_KEY ~/xelnova-web-new/backend/.env | cut -c1-30)..."
echo ""

echo "========================================="
echo "  STEP 3: Setup frontend env files"
echo "========================================="
cat > ~/xelnova-web-new/apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
EOF

cat > ~/xelnova-web-new/apps/seller/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc4s5osAAAAAOi73vFTn5BLso8XKxXidIoDPiTm
EOF

cat > ~/xelnova-web-new/apps/admin/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
EOF
echo "Frontend env files created"
echo ""

echo "========================================="
echo "  STEP 4: Install dependencies"
echo "========================================="
cd ~/xelnova-web-new
npm ci --prefer-offline 2>&1 | tail -5
echo ""

echo "========================================="
echo "  STEP 5: Build backend first"
echo "========================================="
cd ~/xelnova-web-new
NODE_OPTIONS="--max-old-space-size=1536" npx turbo run build --filter=@xelnova/backend 2>&1 | tail -10
echo ""

echo "========================================="
echo "  STEP 5b: Build packages"
echo "========================================="
NODE_OPTIONS="--max-old-space-size=1536" npx turbo run build --filter=@xelnova/ui --filter=@xelnova/utils --filter=@xelnova/api 2>&1 | tail -10
echo ""

echo "========================================="
echo "  STEP 5c: Build web app"
echo "========================================="
NODE_OPTIONS="--max-old-space-size=1536" npx turbo run build --filter=@xelnova/web 2>&1 | tail -15
echo ""

echo "========================================="
echo "  STEP 5d: Build seller app"
echo "========================================="
NODE_OPTIONS="--max-old-space-size=1536" npx turbo run build --filter=@xelnova/seller 2>&1 | tail -15
echo ""

echo "========================================="
echo "  STEP 5e: Build admin app"
echo "========================================="
NODE_OPTIONS="--max-old-space-size=1536" npx turbo run build --filter=@xelnova/admin 2>&1 | tail -15
echo ""

echo "========================================="
echo "  STEP 6: Restart PM2"
echo "========================================="
pm2 delete all 2>/dev/null || true
cd ~/xelnova-web-new
pm2 start ecosystem.config.js
sleep 8
pm2 save
echo ""
pm2 status
echo ""
echo "=== Backend startup logs ==="
pm2 logs xelnova-api --lines 25 --nostream 2>/dev/null || true
echo ""
echo "========================================="
echo "  ALL DONE!"
echo "========================================="
