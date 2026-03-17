# Fix: "Can't find required-server-files.json" — Use Static Hosting

Your build **succeeds**, but Amplify fails because it is in **SSR (WEB_COMPUTE)** mode and looks for `required-server-files.json`. With `output: 'export'`, we produce a **static** site in `out/`, so that file does not exist.

**Fix:** Switch each Amplify app to **static hosting (WEB)** and set the branch framework to **Next.js - SSG**.

---

## Option A: AWS Console (no CLI)

1. In **AWS Amplify** → **All apps**, open **each** of the 3 apps (web, admin, seller).
2. Go to **Hosting** in the left sidebar (under the app).
3. Open **Hosting** or **Build settings** and find **Platform** / **Application type**.
4. Change from **Web compute** (or **Next.js - SSR**) to **Static (S3 and CloudFront)** or **Web**.
5. If you see **Framework**, set it to **Next.js - SSG**.
6. Save and **Redeploy this version** for the branch.

Repeat for all 3 apps.

---

## Option B: AWS CLI (recommended)

Use your region (e.g. **ap-south-1** for Mumbai). Replace `main` if your branch name is different.

**Web app**
```bash
aws amplify update-app --app-id dvoml5jtqtva7 --platform WEB --region ap-south-1
aws amplify update-branch --app-id dvoml5jtqtva7 --branch-name main --framework "Next.js - SSG" --region ap-south-1
```

**Admin app**
```bash
aws amplify update-app --app-id dpf37cxmd5zcb --platform WEB --region ap-south-1
aws amplify update-branch --app-id dpf37cxmd5zcb --branch-name main --framework "Next.js - SSG" --region ap-south-1
```

**Seller app**
```bash
aws amplify update-app --app-id d12w7f3sixeqq1 --platform WEB --region ap-south-1
aws amplify update-branch --app-id d12w7f3sixeqq1 --branch-name main --framework "Next.js - SSG" --region ap-south-1
```

Then in Amplify Console, trigger a **Redeploy** for each app (or push a small commit).

---

## App IDs (from your build logs)

| App    | App ID          |
|--------|------------------|
| Web    | `dvoml5jtqtva7` |
| Admin  | `dpf37cxmd5zcb` |
| Seller | `d12w7f3sixeqq1` |

If your apps use different IDs, get them from: Amplify Console → App → **App settings** → **General** → **App ARN** (the ID after `/apps/`).

---

## After switching to WEB

- Amplify will serve the contents of **baseDirectory** (`apps/web/out`, `apps/admin/out`, `apps/seller/out`) as static files.
- It will **not** look for `required-server-files.json`.
- Your `amplify.yml` is already correct with `baseDirectory: apps/<app>/out`.
