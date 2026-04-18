#!/bin/bash
# Resume deploy after migrations: install, build, restart.
set -e
echo ""
echo "============================================="
echo "  RESUME DEPLOY: $(date -u)"
echo "============================================="

cd ~/xelnova-web-new

echo ""
echo "=== Frontend env.local files ==="
cat > ./apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
EOF
cat > ./apps/seller/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc4s5osAAAAAOi73vFTn5BLso8XKxXidIoDPiTm
EOF
cat > ./apps/admin/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
EOF

echo ""
echo "=== npm ci ==="
npm ci --prefer-offline 2>&1 | tail -8

echo ""
echo "=== prisma generate ==="
cd backend && npx prisma generate 2>&1 | tail -3 && cd ..

echo ""
echo "=== Build all apps ==="
NODE_OPTIONS="--max-old-space-size=2048" npx turbo run build \
  --filter=@xelnova/utils --filter=@xelnova/ui --filter=@xelnova/api \
  --filter=@xelnova/backend --filter=@xelnova/web \
  --filter=@xelnova/seller --filter=@xelnova/admin 2>&1 | tail -50

echo ""
echo "=== Restart PM2 ==="
pm2 restart ecosystem.config.js --update-env
sleep 6
pm2 save
echo ""
pm2 status
echo ""
echo "=== Backend recent logs ==="
pm2 logs xelnova-api --lines 25 --nostream 2>/dev/null || true

echo ""
echo "============================================="
echo "  RESUME DONE: $(date -u)"
echo "============================================="
