# Amplify still not working – do this now

All 3 apps are failing. Follow these steps **in order**. After each step, **redeploy** the app and check the build log.

---

## Step 1: Fix static hosting (stops "required-server-files.json" error)

Amplify must be in **static** mode, not SSR. Run these in **PowerShell** (replace app IDs if yours are different):

```powershell
# Get your app IDs from: Amplify Console → each app → App settings → General → App ARN (the ID after /apps/)

$region = "ap-south-1"
$branch = "main"

# Web app
aws amplify update-app --app-id YOUR_WEB_APP_ID --platform WEB --region $region
aws amplify update-branch --app-id YOUR_WEB_APP_ID --branch-name $branch --framework "Next.js - SSG" --region $region

# Admin app  
aws amplify update-app --app-id YOUR_ADMIN_APP_ID --platform WEB --region $region
aws amplify update-branch --app-id YOUR_ADMIN_APP_ID --branch-name $branch --framework "Next.js - SSG" --region $region

# Seller app
aws amplify update-app --app-id YOUR_SELLER_APP_ID --platform WEB --region $region
aws amplify update-branch --app-id YOUR_SELLER_APP_ID --branch-name $branch --framework "Next.js - SSG" --region $region
```

**To find App ID:** Amplify → open app → **App settings** → **General** → look at **App ARN**, e.g. `arn:aws:amplify:ap-south-1:xxx:apps/abc123xyz` → App ID is **abc123xyz**.

If you don’t use CLI: in each app go to **Hosting** → find **Platform** / **Application type** → set to **Static** or **Web**. If you see **Framework**, set **Next.js - SSG**. Save.

---

## Step 2: Set monorepo app root for each app

So Amplify picks the right build from `amplify.yml`:

1. **xelnova-web-new-web** → Hosting → Environment variables → Add:
   - **Variable:** `AMPLIFY_MONOREPO_APP_ROOT`
   - **Value:** `apps/web`
2. **xelnova-web-new-admin** → same, **Value:** `apps/admin`
3. **xelnova-web-new-seller** → same, **Value:** `apps/seller`

Save for each. Then **Redeploy this version** for branch **main** on each app.

---

## Step 3: Get the actual error from a failed build

Until we see the real error, we’re guessing. Do this for **one** failed app (e.g. **xelnova-web-new-web**):

1. Open the app → **Hosting** → click the **main** branch.
2. Open the latest **failed** build.
3. Open the **Build** step (or **Frontend** phase).
4. Scroll to the **bottom** of the log.
5. Copy the **last 30–50 lines** (where the red ERROR usually is) and save them (e.g. in a file or chat).

Typical errors:

- **"Can't find required-server-files.json"** → Step 1 (platform WEB) not done or not applied.
- **"No appRoot matching"** or **"Invalid monorepo spec"** → Step 2 (AMPLIFY_MONOREPO_APP_ROOT) wrong or missing.
- **"npm ERR!"** or **"turbo" error** → build script or dependency issue; the log will show the exact command and error.
- **"baseDirectory" or "artifact" error** → artifact path mismatch; we’ll fix once we see the exact message.

---

## Step 4: Push the restored amplify.yml

The repo again has an **amplify.yml** at the root (restored from backup). Commit and push so Amplify uses it:

```bash
git add amplify.yml
git commit -m "Restore amplify.yml for Amplify"
git push origin main
```

Then trigger **Redeploy** for each app (or wait for auto deploy).

---

## Checklist

- [ ] Step 1: Platform = **WEB**, Framework = **Next.js - SSG** for all 3 apps (CLI or Console).
- [ ] Step 2: **AMPLIFY_MONOREPO_APP_ROOT** set for each app (apps/web, apps/admin, apps/seller).
- [ ] Step 3: Copy the **build log tail** from one failed build and keep it to share or debug.
- [ ] Step 4: **amplify.yml** restored and pushed to **main**.
- [ ] Redeploy all 3 apps after the above.

If it still fails after Step 1 and 2, the **exact build log** from Step 3 is needed to fix the next issue.
