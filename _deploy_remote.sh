#!/bin/bash
# One-shot deploy: pull latest, run migrations, build, restart.
# Caller is expected to redirect stdout/stderr to ~/deploy.log.
set -e
echo ""
echo "============================================="
echo "  DEPLOY START: $(date -u)"
echo "============================================="

cd ~/xelnova-web-new

echo ""
echo "=== [1/7] Pull latest from main ==="
git fetch --all
git reset --hard origin/main
git log --oneline -3

echo ""
echo "=== [2/7] Sync prod backend .env into repo ==="
if [ -f ~/backend/.env ]; then
  cp ~/backend/.env ./backend/.env
  echo "Copied ~/backend/.env -> backend/.env"
else
  echo "WARN: ~/backend/.env not found, using whatever is in repo"
fi
grep -q '^NODE_ENV=' ./backend/.env || echo 'NODE_ENV=production' >> ./backend/.env

echo ""
echo "=== [3/7] Frontend env.local files ==="
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
echo "env.local files written"

echo ""
echo "=== [4/7] Install dependencies (npm ci) ==="
npm ci --prefer-offline 2>&1 | tail -8

echo ""
echo "=== [5/7] Apply Prisma migrations ==="
cd backend
npx prisma migrate deploy
npx prisma generate 2>&1 | tail -3
cd ..

echo ""
echo "=== [6/7] Build all apps ==="
NODE_OPTIONS="--max-old-space-size=2048" npx turbo run build \
  --filter=@xelnova/utils --filter=@xelnova/ui --filter=@xelnova/api \
  --filter=@xelnova/backend --filter=@xelnova/web \
  --filter=@xelnova/seller --filter=@xelnova/admin 2>&1 | tail -40

echo ""
echo "=== [7/7] Restart PM2 ==="
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
echo "  DEPLOY DONE: $(date -u)"
echo "============================================="
