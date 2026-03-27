# EC2 Deployment Guide

Deploys the NestJS backend + Next.js apps from `main` branch to the EC2 instance.

## Server Details

| Item              | Value                                    |
| ----------------- | ---------------------------------------- |
| Host              | `3.83.45.205`                            |
| User              | `ubuntu`                                 |
| SSH Key           | `C:\Users\hp\Desktop\xelnova_backend.pem`|
| Backend directory | `~/backend`                              |
| Repo clone        | `~/xelnova-web-new`                      |
| PM2 process name  | `xelnova-api`                            |
| Backend port      | `4000`                                   |

## Production Domains

| Service  | Domain                  | Upstream port |
| -------- | ----------------------- | ------------- |
| API      | `api.xelnova.in`        | 4000          |
| Web      | `xelnova.in`            | 3000          |
| Seller   | `seller.xelnova.in`     | 3003          |
| Admin    | `admin.xelnova.in`      | 3002          |

## Prerequisites (already installed on server)

- Node.js 20
- PM2 (`npm i -g pm2`)
- Git
- Nginx (with SSL certs via Let's Encrypt)

---

## 1. Backend Deploy (Quick)

Run from your **local machine** (PowerShell):

```powershell
ssh -i "C:\Users\hp\Desktop\xelnova_backend.pem" ubuntu@3.83.45.205
```

Then on the **EC2 server**:

```bash
# Pull latest code
cd ~/xelnova-web-new && git pull origin main

# Sync backend files (preserves .env)
rsync -av \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.env \
  --exclude=.env.production \
  ~/xelnova-web-new/backend/ ~/backend/

# Install dependencies & build
cd ~/backend
npm ci
npm run build          # runs: prisma generate && nest build

# Restart the PM2 process
pm2 restart xelnova-api

# Verify it started
pm2 logs xelnova-api --lines 15 --nostream
```

You should see **"Nest application successfully started"** and
**"Xelnova API running on port 4000 [production]"**.

### Backend one-liner (from local PowerShell)

```powershell
ssh -i "C:\Users\hp\Desktop\xelnova_backend.pem" ubuntu@3.83.45.205 "cd ~/xelnova-web-new && git pull origin main && rsync -av --exclude=node_modules --exclude=dist --exclude=.env --exclude=.env.production ~/xelnova-web-new/backend/ ~/backend/ && cd ~/backend && npm ci && npm run build && pm2 restart xelnova-api && sleep 5 && pm2 logs xelnova-api --lines 10 --nostream"
```

---

## 2. Backend Environment Variables

The `.env` file lives at `~/backend/.env` on the server. **Critical production values:**

```bash
NODE_ENV=production

# URLs — must be production domains
GOOGLE_CALLBACK_URL="https://api.xelnova.in/api/v1/auth/google/callback"
FRONTEND_URL="https://xelnova.in"
SELLER_URL="https://seller.xelnova.in"
ADMIN_URL="https://admin.xelnova.in"
APP_URL="https://xelnova.in"
CORS_ORIGINS="https://xelnova.in,https://www.xelnova.in,https://seller.xelnova.in,https://admin.xelnova.in"

# reCAPTCHA — must be PRODUCTION keys (not test keys)
# Get from https://www.google.com/recaptcha/admin
# Add domains: xelnova.in, seller.xelnova.in, admin.xelnova.in
RECAPTCHA_SITE_KEY="<production-site-key>"
RECAPTCHA_SECRET_KEY="<production-secret-key>"
```

See `backend/.env.production.example` for the full template.

To edit: `nano ~/backend/.env`

---

## 3. Frontend Apps Deploy (Seller / Web / Admin)

If hosting on the **same EC2** (PM2 + Nginx):

```bash
# SSH into server
cd ~/xelnova-web-new && git pull origin main

# ─── Build & start seller app ───
cd ~/xelnova-web-new/apps/seller
cp .env.production .env.local   # or set env vars directly
npm run build
pm2 start npm --name xelnova-seller -- run start
# Runs on port 3003

# ─── Build & start web app ───
cd ~/xelnova-web-new/apps/web
cp .env.production .env.local
npm run build
pm2 start npm --name xelnova-web -- run start
# Runs on port 3000

# ─── Build & start admin app ───
cd ~/xelnova-web-new/apps/admin
npm run build
pm2 start npm --name xelnova-admin -- run start
# Runs on port 3002

pm2 save
```

### Frontend env vars (set on hosting platform or in .env.local)

**Seller app** (`seller.xelnova.in`):
```
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<production-site-key>
```

**Web app** (`xelnova.in`):
```
NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com
```

---

## 4. Nginx

Config: `nginx/nginx.conf` in the repo. Copy to server:

```bash
sudo cp ~/xelnova-web-new/nginx/nginx.conf /etc/nginx/sites-available/xelnova
sudo ln -sf /etc/nginx/sites-available/xelnova /etc/nginx/sites-enabled/xelnova
sudo nginx -t && sudo systemctl reload nginx
```

### SSL Certificates (Let's Encrypt)

```bash
sudo certbot --nginx -d api.xelnova.in
sudo certbot --nginx -d xelnova.in -d www.xelnova.in
sudo certbot --nginx -d seller.xelnova.in
sudo certbot --nginx -d admin.xelnova.in
```

---

## 5. Production Checklist

- [ ] `~/backend/.env` has `NODE_ENV=production`
- [ ] `CORS_ORIGINS` lists all production domains
- [ ] `GOOGLE_CALLBACK_URL` points to `https://api.xelnova.in/...`
- [ ] `FRONTEND_URL`, `SELLER_URL`, `ADMIN_URL` are `https://...xelnova.in`
- [ ] `RECAPTCHA_SITE_KEY` is set in backend `.env` (must match `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in seller app)
- [ ] `RECAPTCHA_PROJECT_ID` and `RECAPTCHA_API_KEY` are set in backend `.env`
- [ ] `RESEND_API_KEY` is set (email OTP)
- [ ] `FORTIUS_API_KEY` is set (SMS OTP)
- [ ] Frontend apps have `NEXT_PUBLIC_API_URL=https://api.xelnova.in/api/v1`
- [ ] Seller app has `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` matching backend's `RECAPTCHA_SITE_KEY`
- [ ] Nginx config uses `.xelnova.in` domains
- [ ] SSL certs are issued for all 4 subdomains
- [ ] DNS A records point `api.xelnova.in`, `seller.xelnova.in`, `admin.xelnova.in` to EC2 IP
- [ ] Google OAuth console has `https://api.xelnova.in/api/v1/auth/google/callback` as redirect URI
- [ ] Google reCAPTCHA Enterprise console has `seller.xelnova.in` as allowed domain

---

## Useful PM2 Commands

```bash
pm2 list                          # show all processes
pm2 logs xelnova-api              # live tail logs
pm2 logs xelnova-api --lines 50   # last 50 lines
pm2 restart xelnova-api           # restart
pm2 stop xelnova-api              # stop
pm2 delete xelnova-api            # remove process

# First-time PM2 setup (already done):
# cd ~/backend && pm2 start npm --name xelnova-api -- run start:prod
# pm2 save && pm2 startup
```

## Troubleshooting

**Build fails with Prisma errors**
```bash
cd ~/backend && npx prisma generate
npm run build
```

**App crashes on start**
```bash
pm2 logs xelnova-api --lines 50 --nostream
```

**Port already in use**
```bash
lsof -i :4000
kill -9 <PID>
pm2 restart xelnova-api
```

**OTP not working on production**
- Check `pm2 logs xelnova-api` for Resend/Fortius errors
- Verify `RESEND_API_KEY` and `FORTIUS_API_KEY` are set in `~/backend/.env`
- Verify `NODE_ENV=production` (dev mode returns devOtp; production requires real keys)

**CORS errors in browser**
- Check `CORS_ORIGINS` in `~/backend/.env` includes the exact origin (with `https://`)
- Restart: `pm2 restart xelnova-api`

**reCAPTCHA verification failing on seller registration**
- Check `pm2 logs xelnova-api` for `[reCAPTCHA]` errors
- Verify all three vars are set in `~/backend/.env`: `RECAPTCHA_SITE_KEY`, `RECAPTCHA_PROJECT_ID`, `RECAPTCHA_API_KEY`
- Verify `RECAPTCHA_SITE_KEY` matches `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in seller app
- Verify the key is a **reCAPTCHA Enterprise** key (not v2/v3) at https://console.cloud.google.com/security/recaptcha
- Verify `seller.xelnova.in` is listed as an allowed domain in the reCAPTCHA Enterprise console
- Restart: `pm2 restart xelnova-api`

**Google Sign-In not working**
- Check `GOOGLE_CALLBACK_URL` in backend `.env` matches the OAuth console redirect URI
- Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in frontend `.env` matches `GOOGLE_CLIENT_ID` in backend
