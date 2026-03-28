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

# Add reCAPTCHA Enterprise vars if missing
# RECAPTCHA_SITE_KEY must match NEXT_PUBLIC_RECAPTCHA_SITE_KEY in the seller app
grep -q '^RECAPTCHA_SITE_KEY=' .env || echo 'RECAPTCHA_SITE_KEY="6Lc4s5osAAAAAOi73vFTn5BLso8XKxXidIoDPiTm"' >> .env
grep -q '^RECAPTCHA_PROJECT_ID=' .env || echo 'RECAPTCHA_PROJECT_ID="xelnova-1774475911864"' >> .env
grep -q '^RECAPTCHA_API_KEY=' .env || echo 'RECAPTCHA_API_KEY="AIzaSyAlaRrvDRMvMVUzURqhs1rx9SfAdaZ14bg"' >> .env

echo "Building backend..."
cd ~/xelnova-web-new/backend
npx prisma generate
npm run build 2>&1 | tail -5

echo "Syncing backend dist..."
rsync -av --delete ~/xelnova-web-new/backend/dist/ ~/backend/dist/ > /dev/null
cp ~/xelnova-web-new/backend/package.json ~/backend/package.json

echo "Restarting backend..."
cd ~/backend
pm2 restart xelnova-api
sleep 5
pm2 logs xelnova-api --lines 3 --nostream

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
