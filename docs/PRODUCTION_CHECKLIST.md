# Production checklist – xelnova.online (AWS)

**Current:** Frontend on **AWS Amplify** (ready). Backend **not yet deployed** — use the EC2 guide below when you’re ready.

---

## Frontend (AWS Amplify) – ready

- Set **environment variable** in each Amplify app (web, admin, seller):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | Your backend API URL **after** EC2 is live, e.g. `https://api.xelnova.online/api/v1` |

Until the backend is on EC2, frontends will get "Backend not reachable" when they call the API.

---

## Backend – deploy to EC2 (when you’re ready)

**File to use on server:** `backend/.env.production` (already has CORS and app URLs for xelnova.online).

### 1. Launch an EC2 instance

- AMI: Ubuntu 22.04 LTS
- Instance type: e.g. t3.small (or larger for production)
- Security group: allow **22** (SSH), **80** (HTTP), **443** (HTTPS); restrict SSH to your IP if possible
- Storage: 20 GB+ recommended

### 2. Install Node.js and PM2 on the instance

```bash
# SSH into the instance, then:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 3. Copy your backend to EC2

From your machine (replace `YOUR_EC2_IP` or use EC2 key):

```bash
# Option A: Clone from Git (if repo is private, use SSH key or deploy key on EC2)
ssh ubuntu@YOUR_EC2_IP
git clone YOUR_REPO_URL /home/ubuntu/xelnova
cd /home/ubuntu/xelnova
```

Or use **Option B:** zip the `backend` folder (and any root files needed for monorepo), scp to EC2, unzip there. Ensure Prisma and Nest can run (same structure as in repo).

### 4. Configure environment on EC2

```bash
cd /home/ubuntu/xelnova/backend   # or wherever your backend lives
cp .env.production .env
nano .env   # set DATABASE_URL, DIRECT_URL (and Razorpay if needed)
```

Do **not** commit `.env`; keep it only on the server.

### 5. Build and run

```bash
cd /home/ubuntu/xelnova/backend
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy   # run migrations on production DB
npm run build
pm2 start dist/main.js --name xelnova-api
pm2 save
pm2 startup   # follow the command it prints so PM2 starts on reboot
```

API will listen on `PORT` from `.env` (e.g. 4000). Test: `curl http://localhost:4000/api/v1/health` (if you have a health route) or any public route.

### 6. Put Nginx in front (recommended)

- Install Nginx: `sudo apt install nginx`
- Create a vhost that proxies to `http://127.0.0.1:4000` for `api.xelnova.online`
- Use Certbot for SSL: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d api.xelnova.online`

Then your API URL is `https://api.xelnova.online`; set **NEXT_PUBLIC_API_URL** in Amplify to `https://api.xelnova.online/api/v1`.

### 7. Point DNS

- **api.xelnova.online** → A record to your EC2 public IP (or CNAME to ALB if you use a load balancer).

---

## Summary

| Item | Status |
|------|--------|
| CORS & app URLs in `backend/.env.production` | Done (xelnova.online) |
| Frontend on Amplify | Ready (set `NEXT_PUBLIC_API_URL` once API is live) |
| Backend on EC2 | Not deployed yet — follow “Backend – deploy to EC2” above |

After EC2 is running and DNS/SSL are set, update Amplify env vars to `https://api.xelnova.online/api/v1` and redeploy if needed.
