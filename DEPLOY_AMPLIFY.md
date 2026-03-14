# Deploying xelnova to AWS Amplify

You have **3 frontend apps** (web, admin, seller) in one repo. On Amplify you deploy **one app per frontend** — so you will create **3 separate Amplify apps**, all connected to the same GitHub repository.

---

## Step 1: Create three Amplify apps

1. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/).
2. For **each** of web, admin, and seller:
   - Click **Create new app** → **Host web app**.
   - Connect your **GitHub** account and choose the repo and branch (e.g. `main`).
   - On “Add repository branch”:
     - Select your repo and branch.
     - Check **“My app is a monorepo”**.
     - Set **App root** to:
       - **Web:** `apps/web`
       - **Admin:** `apps/admin`
       - **Seller:** `apps/seller`
   - Click **Next** through the wizard (you can keep default build settings; the repo’s `amplify.yml` will be used if present).
   - **Save and deploy** (or skip initial deploy and push the `amplify.yml` first).

Amplify will set `AMPLIFY_MONOREPO_APP_ROOT` for each app to the path you entered.

---

## Step 2: Use the repo’s build config

This repo includes an **`amplify.yml`** at the root that defines build and artifacts for all three apps. When Amplify builds an app, it uses the block whose `appRoot` matches that app’s `AMPLIFY_MONOREPO_APP_ROOT`.

So you do **not** need to paste build spec in the console for each app — just:

- Commit and push `amplify.yml` to your default branch.
- Ensure each Amplify app has the correct **monorepo app root** (Step 1). No need to duplicate build commands in the console.

---

## Step 3: Optional — env vars and branch-specific deploys

- **Environment variables:** In Amplify Console → each app → **Hosting** → **Environment variables**, add any keys (e.g. API URLs, feature flags). Use different values per app if needed.
- **Branches:** You can connect more branches later; each app will build from its `appRoot` on that branch.

---

## Summary

| App    | Amplify app (create separately) | Monorepo app root |
|--------|----------------------------------|--------------------|
| Web    | e.g. “xelnova-web”               | `apps/web`         |
| Admin  | e.g. “xelnova-admin”             | `apps/admin`       |
| Seller | e.g. “xelnova-seller”            | `apps/seller`      |

You will get **3 different URLs** (e.g. `https://main.xxx.amplifyapp.com` per app). No need to deploy from three different repos — one GitHub repo, three Amplify apps, each with its own app root and the shared `amplify.yml`.
