# Fresh deploy: Xelnova (Web, Admin, Seller) on AWS Amplify

Follow these steps for a clean deployment of all 3 apps. Use **static hosting** so you never hit the `required-server-files.json` error.

---

## Before you start

- [ ] Code is pushed to GitHub (repo: `manishisblessed/xelnova-web-new` or your fork).
- [ ] Branch to deploy: usually `main`.
- [ ] AWS account and Amplify available in your chosen region (e.g. **ap-south-1** for Mumbai).
- [ ] (Optional) AWS CLI installed and configured if you use the CLI steps.

---

## Part 1: Remove old apps (optional)

If you want a **fully fresh** start:

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/) → **All apps**.
2. For each of the 3 existing apps (e.g. `xelnova-web-new`, `xelnova-web-new-seller`, etc.):
   - Open the app → **App settings** → **General**.
   - Click **Delete app** and confirm.

If you prefer to **reuse** existing apps, skip to Part 2 and use “Update existing app” where relevant.

---

## Part 2: Create (or reuse) 3 Amplify apps

You need **3 separate Amplify apps** (one for web, one for admin, one for seller), all using the **same** GitHub repo and the **root** `amplify.yml`.

### 2.1 Create the first app (Web)

1. In Amplify Console, click **Create new app** → **Host web app**.
2. **Connect repository**
   - Choose **GitHub** (or GitHub Enterprise).
   - Authorize if needed, then select repo **xelnova-web-new** and branch **main**.
3. **Configure build**
   - Check **“Monorepo”** (or “My app is a monorepo”).
   - Set **App root** to: `apps/web`.
   - Amplify will detect the repo’s `amplify.yml`; the block with `appRoot: apps/web` will be used. You can leave the default build spec as-is (or paste the same structure with `baseDirectory: apps/web/out`).
4. Click **Next** → **Save and deploy** (or **Save** only if you want to set static hosting first).

Repeat for **Admin** and **Seller** with:

| App   | App name (example)   | Monorepo app root |
|-------|----------------------|--------------------|
| Web   | xelnova-web          | `apps/web`         |
| Admin | xelnova-admin        | `apps/admin`       |
| Seller| xelnova-seller       | `apps/seller`      |

So:

- **Admin:** Create new app → same repo & branch → Monorepo → App root: `apps/admin` → Save and deploy.
- **Seller:** Create new app → same repo & branch → Monorepo → App root: `apps/seller` → Save and deploy.

---

## Part 3: Set static hosting (required)

Amplify must **not** use SSR mode, or you get:  
`Can't find required-server-files.json in build output directory`.

Do this for **each** of the 3 apps.

### Option A — AWS Console

1. Open the app → **Hosting** (left sidebar).
2. Find **Platform** / **Application type** (may be under “Build settings” or “General”).
3. Set to **Static (S3 and CloudFront)** or **Web** (not “Web compute” / “Next.js - SSR”).
4. If there is a **Framework** field, set to **Next.js - SSG**.
5. Save.

### Option B — AWS CLI

Replace `ap-south-1` and `main` if you use another region or branch. Use your **actual app IDs** from Amplify (App settings → General → App ARN: the ID after `/apps/`).

```bash
# Web (use your web app ID)
aws amplify update-app --app-id YOUR_WEB_APP_ID --platform WEB --region ap-south-1
aws amplify update-branch --app-id YOUR_WEB_APP_ID --branch-name main --framework "Next.js - SSG" --region ap-south-1

# Admin
aws amplify update-app --app-id YOUR_ADMIN_APP_ID --platform WEB --region ap-south-1
aws amplify update-branch --app-id YOUR_ADMIN_APP_ID --branch-name main --framework "Next.js - SSG" --region ap-south-1

# Seller
aws amplify update-app --app-id YOUR_SELLER_APP_ID --platform WEB --region ap-south-1
aws amplify update-branch --app-id YOUR_SELLER_APP_ID --branch-name main --framework "Next.js - SSG" --region ap-south-1
```

If you still have the same app IDs as in the earlier fix:

- Web: `dvoml5jtqtva7`
- Admin: `dpf37cxmd5zcb`
- Seller: `d12w7f3sixeqq1`

---

## Part 4: Build settings (confirm)

Your **root** `amplify.yml` already defines all three apps. Amplify uses the block where `appRoot` matches the app’s monorepo root.

Ensure in the Console for each app:

- **Monorepo app root** is exactly:
  - Web: `apps/web`
  - Admin: `apps/admin`
  - Seller: `apps/seller`
- **Build spec** is either “Use amplify.yml” / “Use repository’s build spec” or matches the same structure, with:
  - **preBuild:** `npm ci`
  - **build:**  
    - Web: `npx turbo run build --filter=@xelnova/web`  
    - Admin: `npx turbo run build --filter=@xelnova/admin`  
    - Seller: `npx turbo run build --filter=@xelnova/seller`
  - **Artifacts baseDirectory:**  
    - Web: `apps/web/out`  
    - Admin: `apps/admin/out`  
    - Seller: `apps/seller/out`

No need to change anything in the repo if `amplify.yml` is already committed as in the repo.

---

## Part 5: Deploy

1. **Redeploy** each app:
   - Open app → **Hosting** → open the branch (e.g. `main`) → **Redeploy this version**.
2. Or **push a commit** to the connected branch; Amplify will build and deploy all 3 apps according to their app roots and `amplify.yml`.

Wait for the build to finish. Build output should show:

- `✓ Exporting (2/2)` and artifacts under `apps/<app>/out`.
- No step looking for `required-server-files.json`.

---

## Part 6: Verify

- **Web:** `https://main.<web-app-id>.amplifyapp.com`
- **Admin:** `https://main.<admin-app-id>.amplifyapp.com`
- **Seller:** `https://main.<seller-app-id>.amplifyapp.com`

Open each URL; you should see the app. If you get a blank page, check **Hosting → Rewrites and redirects** and add a rewrite so `/` serves `/index.html` (e.g. source `/index.html` → target `/`, type 200 Rewrite).

---

## Quick checklist

| Step | Web | Admin | Seller |
|------|-----|-------|--------|
| Create app, connect repo, branch `main` | ✓ | ✓ | ✓ |
| Monorepo app root | `apps/web` | `apps/admin` | `apps/seller` |
| Platform = **WEB** (static) | ✓ | ✓ | ✓ |
| Framework = **Next.js - SSG** | ✓ | ✓ | ✓ |
| Artifacts baseDirectory | `apps/web/out` | `apps/admin/out` | `apps/seller/out` |
| Redeploy / push and verify URL | ✓ | ✓ | ✓ |

---

## Troubleshooting

- **Build fails with “required-server-files.json”**  
  → Platform is still SSR. Repeat Part 3 (set **WEB** and **Next.js - SSG**) for that app and redeploy.

- **Build fails: “baseDirectory not found”**  
  → Confirm build command runs from **repo root** (e.g. `npx turbo run build --filter=@xelnova/web`) and that `output: 'export'` is set in that app’s `next.config.ts` so `apps/<app>/out` is produced.

- **Blank page or 404**  
  → Add rewrite: `/index.html` → `/` (200 Rewrite) in Hosting → Rewrites and redirects.

- **Wrong app (e.g. web content on admin URL)**  
  → Check that app’s **Monorepo app root** and **build filter** match the table in Part 4.
