#!/bin/bash
set -e

echo "=== Updating backend .env with production URLs ==="
cd ~/backend

# Update URLs to production
sed -i 's|GOOGLE_CALLBACK_URL="http://localhost:4000/api/v1/auth/google/callback"|GOOGLE_CALLBACK_URL="https://api.xelnova.in/api/v1/auth/google/callback"|' .env
sed -i 's|FRONTEND_URL="http://localhost:3000"|FRONTEND_URL="https://xelnova.in"|' .env
sed -i 's|SELLER_URL="http://localhost:3003"|SELLER_URL="https://seller.xelnova.in"|' .env
sed -i 's|ADMIN_URL="http://localhost:3002"|ADMIN_URL="https://admin.xelnova.in"|' .env
sed -i 's|APP_URL="http://localhost:3000"|APP_URL="https://xelnova.in"|' .env
sed -i 's|CORS_ORIGINS="http://localhost:3000,http://localhost:3002,http://localhost:3003"|CORS_ORIGINS="https://xelnova.in,https://www.xelnova.in,https://seller.xelnova.in,https://admin.xelnova.in"|' .env

# Razorpay — ensure keys are present (TEST keys only for safety)
grep -q '^RAZORPAY_KEY_ID=' .env || echo 'RAZORPAY_KEY_ID="rzp_test_SYXLNzHZjBIdRu"' >> .env
grep -q '^RAZORPAY_KEY_SECRET=' .env || echo 'RAZORPAY_KEY_SECRET="36rdANPPAZTBZskZawfsT2M7"' >> .env
grep -q '^RAZORPAY_WEBHOOK_SECRET=' .env || echo 'RAZORPAY_WEBHOOK_SECRET=""' >> .env

# Safety check: warn if live Razorpay keys are detected
if grep -q 'rzp_live_' .env; then
  echo ""
  echo "⚠️  WARNING: LIVE Razorpay keys detected in .env!"
  echo "⚠️  Real money will be charged to customers."
  echo "⚠️  If this is not intended, replace with test keys (rzp_test_...)."
  echo ""
fi

# Fortius SMS — verify keys are set for OTP delivery
if ! grep -q '^FORTIUS_API_KEY=.\+' .env; then
  echo ""
  echo "⚠️  WARNING: FORTIUS_API_KEY is not set! OTP SMS will NOT be delivered."
  echo "⚠️  Set FORTIUS_API_KEY in ~/backend/.env for OTP to work."
  echo ""
fi

# Cloudinary — ensure CLOUDINARY_URL is present
grep -q '^CLOUDINARY_URL=' .env || echo 'CLOUDINARY_URL=cloudinary://635444549461982:4QTXNyUtKGn9MBDcsqpw_YKhxe4@dgulzkcnq' >> .env

# reCAPTCHA Enterprise — site key is public, secret/API keys are set manually in ~/backend/.env
grep -q '^RECAPTCHA_SITE_KEY=' .env || echo 'RECAPTCHA_SITE_KEY="6Lc4s5osAAAAAOi73vFTn5BLso8XKxXidIoDPiTm"' >> .env
grep -q '^RECAPTCHA_PROJECT_ID=' .env || echo 'RECAPTCHA_PROJECT_ID="xelnova-1774475911864"' >> .env
grep -q '^RECAPTCHA_API_KEY=' .env || { echo "WARNING: RECAPTCHA_API_KEY not found in .env — set it manually"; }

echo "Building backend..."
cd ~/xelnova-web-new/backend
npx prisma generate
npm run build 2>&1 | tail -5

echo "Syncing backend dist and schema..."
rsync -av --delete ~/xelnova-web-new/backend/dist/ ~/backend/dist/ > /dev/null
cp ~/xelnova-web-new/backend/package.json ~/backend/package.json
cp ~/xelnova-web-new/backend/prisma/schema.prisma ~/backend/prisma/schema.prisma
cp ~/xelnova-web-new/backend/prisma.config.ts ~/backend/prisma.config.ts 2>/dev/null

echo "Installing deps & generating Prisma client in production dir..."
cd ~/backend
npm install --omit=dev 2>&1 | tail -3
npx prisma generate 2>&1 | tail -3

echo "Ensuring NODE_ENV=production..."
grep -q '^NODE_ENV=' .env || echo 'NODE_ENV=production' >> .env

echo "Restarting backend (cwd=~/backend)..."
# Single listener on 4000: remove BOTH legacy names, kill stale bind, then start once (avoids EADDRINUSE)
pm2 delete xelnova-api xelnova-backend 2>/dev/null || true
sleep 1
sudo fuser -k 4000/tcp 2>/dev/null || true
sleep 2
cd ~/backend
# Direct node entrypoint avoids npm workspace resolution issues; dotenv loads ~/backend/.env via cwd
pm2 start dist/src/main.js --name xelnova-backend --update-env
sleep 4
pm2 save
pm2 logs xelnova-backend --lines 12 --nostream

echo ""
echo "=== Building seller app ==="
cd ~/xelnova-web-new/apps/seller
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc4s5osAAAAAOi73vFTn5BLso8XKxXidIoDPiTm
ENVEOF
npm run build 2>&1 | tail -15

echo ""
echo "=== Starting seller app ==="
pm2 describe xelnova-seller > /dev/null 2>&1 && pm2 restart xelnova-seller || pm2 start npm --name xelnova-seller -- run start

echo ""
echo "=== Building web app ==="
cd ~/xelnova-web-new/apps/web
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
ENVEOF
npm run build 2>&1 | tail -15

echo ""
echo "=== Starting web app ==="
pm2 describe xelnova-web > /dev/null 2>&1 && pm2 restart xelnova-web || pm2 start npm --name xelnova-web -- run start

echo ""
pm2 save
echo "=== All done! ==="
pm2 list
