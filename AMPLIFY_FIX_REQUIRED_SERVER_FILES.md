# Fix: "Can't find required-server-files.json"

Your **build succeeds** but deploy fails with this error because Amplify is in **SSR mode**. It must be switched to **static (WEB)**. That option is **not in the website** — you have to run 2 commands once. Easiest way: use **AWS CloudShell** in the browser (no install).

---

## Use CloudShell (browser — no install)

### 1. Open CloudShell

- Go to [AWS Console](https://console.aws.amazon.com/) and make sure you're in **Asia Pacific (Mumbai)** (top-right).
- In the top search bar, type **CloudShell** and open **AWS CloudShell**.
- A terminal opens at the bottom of the page. Wait until it says a prompt like `username@cloudshell:~$`.

### 2. Run the 2 commands for the app that failed

From your log, the app that failed is **xelnova-web-new** with App ID **d3em7874u7qs7u**.

In CloudShell, type or paste **the first line** below and press **Enter**. Then do the **second line** and press **Enter**.

```bash
aws amplify update-app --app-id d3em7874u7qs7u --platform WEB --region ap-south-1
```

```bash
aws amplify update-branch --app-id d3em7874u7qs7u --branch-name main --framework "Next.js - SSG" --region ap-south-1
```

You should see a short JSON response each time (no error).

### 3. Do the same for your other 2 apps

You need to run the **same 2 commands** for **admin** and **seller**, but with **their** App IDs.

- Open **xelnova-web-new-admin** in Amplify → **App settings** → **General** → **App ARN**. The App ID is the part after `/apps/` (e.g. `d1abc2xyz`).
- In CloudShell, run:
  ```bash
  aws amplify update-app --app-id PUT_ADMIN_APP_ID_HERE --platform WEB --region ap-south-1
  aws amplify update-branch --app-id PUT_ADMIN_APP_ID_HERE --branch-name main --framework "Next.js - SSG" --region ap-south-1
  ```
- Repeat for **xelnova-web-new-seller** with its App ID.

### 4. Redeploy

- In Amplify, open **each** of the 3 apps.
- Go to **Hosting** → click branch **main** → **Redeploy this version**.

After that, the "required-server-files.json" error should be gone and the deploy should succeed.

---

## Summary

| What | Why |
|------|-----|
| **Error** | `Can't find required-server-files.json in build output directory` |
| **Cause** | App is in SSR (Web compute) mode; your app is static export (`out/`). |
| **Fix** | Set platform to **WEB** and framework to **Next.js - SSG** via the 2 commands above (once per app). |
| **Where** | AWS CloudShell (browser) or PowerShell with AWS CLI — **not** in Amplify Console menus. |
