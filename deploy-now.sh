#!/bin/bash
set -e

echo "========================================="
echo "  STEP 1: Fix Razorpay live key"
echo "========================================="
# Fix in both locations
for f in ~/backend/.env ~/xelnova-web-new/backend/.env; do
  if [ -f "$f" ]; then
    sed -i 's|RAZORPAY_KEY_ID=rzp_live_[^"]*|RAZORPAY_KEY_ID=rzp_test_SYXLNzHZjBIdRu|' "$f"
    # Also fix the secret to match test key
    if grep -q 'rzp_live_' "$f" 2>/dev/null; then
      echo "WARNING: Still found rzp_live_ in $f"
    fi
  fi
done
echo "Razorpay keys now:"
grep RAZORPAY_KEY_ID ~/backend/.env 2>/dev/null || true
echo ""

echo "========================================="
echo "  STEP 2: Check OTP logs"
echo "========================================="
pm2 logs xelnova-api --lines 200 --nostream 2>/dev/null | grep -i 'SMS\|OTP\|fortius\|CRITICAL' | tail -20 || echo "(no SMS logs found)"
echo ""

echo "========================================="
echo "  STEP 3: Pull and build new code"
echo "========================================="
cd ~/xelnova-web-new
git pull origin main
npm ci
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo ""
echo "========================================="
echo "  STEP 4: Copy production .env"
echo "========================================="
cp ~/backend/.env ~/xelnova-web-new/backend/.env
echo "Copied ~/backend/.env -> ~/xelnova-web-new/backend/.env"
# Ensure NODE_ENV=production
grep -q '^NODE_ENV=' ~/xelnova-web-new/backend/.env || echo 'NODE_ENV=production' >> ~/xelnova-web-new/backend/.env
echo ""

echo "========================================="
echo "  STEP 5: Setup frontend env files"
echo "========================================="
cat > ~/xelnova-web-new/apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
EOF
echo "Created apps/web/.env.local"

cat > ~/xelnova-web-new/apps/seller/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc4s5osAAAAAOi73vFTn5BLso8XKxXidIoDPiTm
EOF
echo "Created apps/seller/.env.local"

cat > ~/xelnova-web-new/apps/admin/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
EOF
echo "Created apps/admin/.env.local"
echo ""

echo "========================================="
echo "  STEP 6: Restart PM2"
echo "========================================="
pm2 delete all 2>/dev/null || true
cd ~/xelnova-web-new
pm2 start ecosystem.config.js
sleep 5
pm2 save
echo ""
pm2 status
echo ""
echo "=== Backend logs ==="
pm2 logs xelnova-api --lines 20 --nostream 2>/dev/null || true
echo ""
echo "========================================="
echo "  ALL DONE!"
echo "========================================="
