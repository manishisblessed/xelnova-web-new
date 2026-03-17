# Amplify "Not Working" – Fix Checklist

Use this when builds **fail** or show **"No builds"**. Do every step for **each** of your 3 apps.

---

## Your 3 apps (from your screenshot)

| Amplify app name       | Must use this app root | Purpose  |
|------------------------|------------------------|----------|
| **xelnova-web-new-web**   | `apps/web`             | Customer storefront |
| **xelnova-web-new-admin** | `apps/admin`           | Admin dashboard     |
| **xelnova-web-new**       | `apps/seller`          | Seller portal       |

If **xelnova-web-new** is actually your *web* app, set its app root to `apps/web` and use a separate app for seller with `apps/seller`.

---

## Step 1: Set monorepo app root (required)

Amplify picks the right build from `amplify.yml` only when **AMPLIFY_MONOREPO_APP_ROOT** matches one of the `appRoot` values. If this is wrong or missing, the wrong app is built or the build fails.

For **each** of the 3 apps:

1. Open the app in Amplify Console.
2. Go to **Hosting** (left sidebar) → **Environment variables** (or **App settings** → **Environment variables**).
3. Click **Manage variables** → **Add new**.
4. **Variable:** `AMPLIFY_MONOREPO_APP_ROOT`  
   **Value:** (choose one)
   - **xelnova-web-new-web** → `apps/web`
   - **xelnova-web-new-admin** → `apps/admin`
   - **xelnova-web-new** → `apps/seller` (or `apps/web` if this is your main storefront)
5. Apply to branch **main** (or all branches).
6. **Save**.

Repeat for the other two apps with their correct values.

---

## Step 2: Set static hosting (no SSR)

If you skip this, you get: **Can't find required-server-files.json**.

For **each** app:

1. Open the app → **Hosting**.
2. Find **Build settings** or **General** (or the page where you edit the build spec).
3. Set **Platform** / **Application type** to **Static** or **Web** (not "Web compute" / "Next.js - SSR").
4. If you see **Framework**, set it to **Next.js - SSG**.
5. Save.

---

## Step 3: Confirm build spec (when using repo’s amplify.yml)

Your repo’s `amplify.yml` is used for all 3 apps. Each app uses the block where `appRoot` equals that app’s **AMPLIFY_MONOREPO_APP_ROOT**.

You do **not** need to paste build spec in the Console as long as:

- `amplify.yml` is at the **root** of the repo.
- Step 1 is done so each app has the correct **AMPLIFY_MONOREPO_APP_ROOT**.

If the Console shows an **Edit build spec** or **Build specification** section, you can leave it as “Use amplify.yml” or ensure it matches the structure in the repo (preBuild: `npm ci`, build: `npx turbo run build --filter=@xelnova/<web|admin|seller>`, artifacts baseDirectory: `apps/<web|admin|seller>/out`).

---

## Step 4: Redeploy

1. For **each** app: **Hosting** → select branch **main** → **Redeploy this version**.
2. Wait for the build to finish.
3. If it fails, open the **build log** and check the error (e.g. “no appRoot matching” or “required-server-files.json”).

---

## Step 5: If it still fails – use Console build spec

If the repo’s `amplify.yml` still doesn’t apply correctly (e.g. “Invalid monorepo spec” or wrong app built), you can **override** with the Console build spec.

**Option A – Temporarily stop using amplify.yml**

1. In your repo, rename `amplify.yml` to `amplify.yml.backup` and push to `main`.
2. In Amplify Console, for **each** app, go to **Build settings** → **Edit** and paste the **correct** spec below for that app.
3. Save and redeploy each app.

**Build spec for xelnova-web-new-web (apps/web):**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npx turbo run build --filter=@xelnova/web
  artifacts:
    baseDirectory: apps/web/out
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .turbo/**/*
```

**Build spec for xelnova-web-new-admin (apps/admin):**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npx turbo run build --filter=@xelnova/admin
  artifacts:
    baseDirectory: apps/admin/out
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .turbo/**/*
```

**Build spec for xelnova-web-new (seller – apps/seller):**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npx turbo run build --filter=@xelnova/seller
  artifacts:
    baseDirectory: apps/seller/out
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .turbo/**/*
```

After all 3 deploy successfully, you can restore `amplify.yml` (rename `.backup` back) and switch back to “Use amplify.yml” if you want.

---

## Quick checklist (each app)

- [ ] **AMPLIFY_MONOREPO_APP_ROOT** set correctly (apps/web, apps/admin, or apps/seller).
- [ ] **Platform** = **WEB** (static).
- [ ] **Framework** = **Next.js - SSG** (if shown).
- [ ] **Redeploy** after any change.
- [ ] If still failing, try **Option A** (rename amplify.yml, paste spec in Console).
