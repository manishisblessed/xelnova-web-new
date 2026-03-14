# Deploying Xelnova Platform

This monorepo contains:

- **apps/web** – Next.js (customer storefront), port 3000  
- **apps/admin** – Next.js (admin dashboard), port 3002  
- **apps/seller** – Next.js (seller dashboard), port 3001  
- **backend** – NestJS API at `/api/v1`, Swagger at `/api/docs`, port 4000  

Recommended: deploy the **3 Next.js apps** on **Vercel** and the **NestJS backend** on **Railway** or **Render**.

---

## 1. Prerequisites

- **Git** – repo pushed to GitHub (or GitLab/Bitbucket).  
- **Node.js 18+** – for local builds.  
- **Accounts**: [Vercel](https://vercel.com), [Railway](https://railway.app) or [Render](https://render.com).

---

## 2. Deploy Backend (NestJS)

### Option A: Railway (Docker)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.  
2. Select this repo and set **Root Directory** to `new/backend`.  
3. Railway will detect the **Dockerfile** in `backend/`.  
4. Add env vars in **Variables** (e.g. `PORT`; Railway sets it automatically).  
5. Under **Settings** → **Networking** → **Generate Domain** to get a public URL (e.g. `https://your-app.up.railway.app`).

### Option B: Render (Docker)

1. Go to [render.com](https://render.com) → **New** → **Web Service**.  
2. Connect the repo and set **Root Directory** to `new/backend`.  
3. **Environment**: Docker.  
4. **Build Command**: (leave default; Render uses the Dockerfile).  
5. Add **Environment Variables** (e.g. `PORT`; Render sets it).  
6. Deploy; use the generated URL (e.g. `https://your-app.onrender.com`).

### Option C: Railway with Node (no Docker)

1. New Project → **Deploy from GitHub** → select repo, **Root Directory** `new/backend`.  
2. **Build Command**: `npm ci && npm run build`  
3. **Start Command**: `npm run start:prod`  
4. **Root Directory**: `new/backend`.  
5. Add variables and generate a public domain.

Backend base URL to use in frontends: e.g. `https://your-backend.up.railway.app`.

---

## 3. Deploy Frontends (Next.js) on Vercel

Use **one repo**, **three Vercel projects** (web, admin, seller). For each project, point at this repo and set the following.

**Recommended: build from monorepo root** so shared packages (`@xelnova/ui`, `@xelnova/utils`) and Turbo cache work correctly.

For **each** of the three projects:

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import this repo.  
2. Set **Root Directory** to `new` (the monorepo root inside your repo).  
3. **Build & Development Settings** (override if needed):  
   - **Framework Preset**: Next.js  
   - **Build Command**: `npx turbo run build --filter=@xelnova/web` (see table below for each app)  
   - **Output Directory**: (see table; Vercel may infer for Next.js)  
   - **Install Command**: `npm ci`  

   | Project | Build Command | Output Directory |
   |---------|----------------|-------------------|
   | Web     | `npx turbo run build --filter=@xelnova/web`   | `apps/web/.next`   |
   | Admin   | `npx turbo run build --filter=@xelnova/admin` | `apps/admin/.next` |
   | Seller  | `npx turbo run build --filter=@xelnova/seller` | `apps/seller/.next` |

4. **Environment variables**:  
   - `NEXT_PUBLIC_API_URL` = your backend URL (e.g. `https://your-backend.up.railway.app`).

5. Deploy. You’ll get three URLs (e.g. `https://xelnova-web.vercel.app`, …).

---

## 4. Environment variables

- **Backend**:  
  - `PORT` – set by Railway/Render; optional locally (default 4000).  
  - Add any DB, secrets, or third-party keys your NestJS app uses.  

- **Frontends**:  
  - `NEXT_PUBLIC_API_URL` – full backend URL (no trailing slash), e.g. `https://your-backend.up.railway.app`.

---

## 5. CI: GitHub Actions

A workflow in `.github/workflows/build.yml` runs on push/PR to `main`/`master`:

- Installs dependencies and runs `npm run build` (Turbo builds all apps and backend).

Fix any failures before or after connecting Vercel/Railway so deploys stay green.

---

## 6. Quick reference

| App     | Root directory   | Build filter        | Typical URL (example)        |
|---------|------------------|---------------------|------------------------------|
| Web     | `new/apps/web`   | `@xelnova/web`      | https://xelnova-web.vercel.app |
| Admin   | `new/apps/admin` | `@xelnova/admin`    | https://xelnova-admin.vercel.app |
| Seller  | `new/apps/seller`| `@xelnova/seller`   | https://xelnova-seller.vercel.app |
| Backend | `new/backend`    | —                   | https://your-app.up.railway.app |

After deployment, point the storefront (web) and dashboards (admin, seller) to the same backend using `NEXT_PUBLIC_API_URL`.
