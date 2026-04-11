# Xelnova — Client Scope Status & How to Verify

This document tracks what is **implemented**, what is **partially done**, and what is **not implemented** against the marketplace scope. It also explains **how you can verify** each area (manual checks, URLs, APIs, and environment variables).

**Last updated:** April 2026 (align with your project branch).

---

## Quick summary

| Status | Count | Meaning |
|--------|------:|---------|
| **Done** | 51 | Implemented end-to-end (or backend + intended UI) with a clear way to verify. |
| **Partial** | 2 | Core code exists; a small follow-up is required for full behaviour. |
| **Not done** | 4 | Not built, or only placeholder/marketing copy exists. |

---

## How to verify (general)

Use these in any order; combine them for confidence.

1. **Run the stack**  
   - Backend: from `backend/`, `npm run dev` (or your deployment URL).  
   - Customer site: from `apps/web/`, `npm run dev`.  
   - Admin: `apps/admin/`. Seller: `apps/seller/`.  
   - Ensure `NEXT_PUBLIC_API_URL` (and related env) points at your running API.

2. **OpenAPI (Swagger)**  
   - Local: typically `http://localhost:<port>/api/docs` (see `backend/src/main.ts`).  
   - In production, docs may require `ENABLE_API_DOCS=true`.  
   - Use this to confirm routes exist and try authenticated calls with a JWT.

3. **Database**  
   - `npx prisma studio` from `backend/` to inspect models (orders, wishlist, loyalty, tickets, etc.).

4. **Browser**  
   - Log in as customer, seller, and admin and walk through the pages listed below.

5. **Automated checks**  
   - Backend: `cd backend && npx tsc --noEmit`  
   - Monorepo: run each app’s `lint` / `build` as you normally do in CI.

---

## Done — feature list & how to check

### Customer storefront (`apps/web`)

| Area | What to check |
|------|----------------|
| Responsive layout | Resize browser; exercise Home, `/products`, `/products/[slug]`, `/cart`, `/checkout`. |
| SEO | Visit `/sitemap.xml`, `/robots.txt`; view page source for meta, OpenGraph; product page includes JSON-LD (`products/[slug]/`). |
| Category & brand landing pages | Open `/categories/<category-slug>` and `/brands/<brand-slug>`; confirm metadata in devtools or “View source”. |
| Search autocomplete | Type 2+ characters in the header search; suggestions should load from the API (not only 50 local products). |
| Phone OTP login | `/login` — request OTP, verify (SMS provider must be configured in backend env). |
| Google login | `/login` — complete Google sign-in flow. |
| Forgot / reset password | Request reset from login flow; open email link; use `/reset-password` with token. |
| Order tracking | `/track-order` with order number (and auth if required by your flow). |
| Order cancellation | Account orders — cancel where allowed; confirm status and stock in admin/DB. |
| Returns | Account flow for return request; admin processes status (see API/Swagger if no dedicated admin returns page). |
| Wallet | `/account/wallet` — balance and transactions. |
| Wishlist | `/account/wishlist` — items persist when logged in (server); guest may still use local merge behaviour. |
| In-app notifications | `/account/notifications`. |
| Loyalty & referral | `/account/loyalty` — balance, ledger, referral code; place an order and confirm points accrue (ledger). |
| Support tickets | `/account/support`. |
| Checkout & payment | `/checkout` — Razorpay flow; COD path if enabled. |
| PDF invoice | From order detail, download invoice (backend `orders` invoice route). |

### Seller portal (`apps/seller`)

| Area | What to check |
|------|----------------|
| Dashboard, orders, products | Sidebar routes; data loads from seller APIs. |
| Inventory & SEO fields | Product create/edit includes meta, HSN, GST, low-stock threshold. |
| Bulk upload | `/bulk-upload` — CSV template, upload, success/error rows. |
| Inventory alerts | `/inventory-alerts` — list + optional email send. |
| Brands | `/brands` — propose brand; see pending/approved in admin. |
| Settlement | `/settlement` — date range + CSV export. |
| Analytics | `/analytics` — charts and summaries. |
| Onboarding gate | Incomplete onboarding should block panel until approved (see seller profile gate). |
| Tickets | `/tickets` — seller view of support. |

### Admin portal (`apps/admin`)

| Area | What to check |
|------|----------------|
| Dashboard | Overview stats. |
| Products, categories, brands | CRUD; pending brands approval. |
| Orders | Status updates, shipment assignment. |
| Coupons | Create with scope: global / category / seller. |
| Commission | Category-based rules. |
| Payouts | Approve / reject / mark paid. |
| Advance payouts & settlement | `/advance-payouts` — advance transfer + order settlement tools. |
| Reports | `/reports` — GST, TDS, refund tabs + CSV. |
| Duplicates | `/duplicates` — scan + hide product. |
| Pricing flags | `/pricing-flags` — scan anomalies. |
| Abandoned carts | `/abandoned-carts` — list + send reminders. |
| Fraud flags | `/fraud-flags` — review queue. |
| CMS pages & site settings | `/pages`, `/settings`. |
| Roles UI | `/roles` — CRUD custom admin roles (permissions stored as comma-separated string). |
| Tickets | `/tickets` — admin view. |
| Seller onboarding review | `/seller-onboarding`. |

### Backend-only or cross-cutting (verify via Swagger + logs + DB)

| Area | What to check |
|------|----------------|
| Razorpay | Create order, verify payment, webhook (configure webhook URL + secret), refund API. |
| Split / advance payouts | `split-payment.service` routes from admin; `Payout` records and Razorpay transfer IDs in DB. |
| Multi-courier & AWB | Shipping module providers; create shipment; `Shipment` AWB and tracking URL in DB. |
| COD verification | `cod-verification` endpoints — generate/verify delivery OTP; risk assessment response. |
| Email (Resend) | Order emails, password reset, seller alerts — with `RESEND_*` (or your) env configured. |
| WhatsApp (Meta Cloud API) | Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`; trigger flows that call `WhatsAppService` (e.g. order/shipment helpers); watch logs for Graph API success/errors. |
| Fraud rules | New order creates `FraudFlag` rows when rules hit; admin can review. |
| Abandoned cart | Stale carts appear in admin; reminder sends email when run. |
| Loyalty earn on order | After placing order, new `LoyaltyLedger` credit row for user. |

---

## Partial — what is left & how to verify the fix

### 1. Admin RBAC (fine-grained permissions)

**Status:** `RolesGuard` and `@RequirePermissions()` exist (`backend/src/common/guards/roles.guard.ts`, `permissions.decorator.ts`). Users can have `adminRoleId` (Prisma `User`) linking to `AdminRole.permissions`.

**Gap:** Admin controllers mostly use `@Auth(Role.ADMIN)` only. Without `@RequirePermissions('some_permission')` on specific routes, custom roles do not restrict API access.

**How to verify it is fixed:**  
- Assign a test admin user a custom role with a **narrow** permission set.  
- Call an endpoint that should be denied (e.g. delete product) — expect `403`.  
- Confirm allowed endpoints still return `200`.  
- Grep the codebase for `@RequirePermissions` on admin routes — you should see it on sensitive handlers.

**Database note:** After schema changes, run migrations so `adminRoleId` exists on `users`.

### 2. Web push (browser notifications)

**Status:** `WebPushService` uses VAPID and sends to stored `PushToken` rows; order notifications call into it when configured.

**Gap:** The `web-push` npm package may be missing from `backend/package.json`. Without it, the service falls back to “not available” at runtime.

**How to verify it works:**  
- Run `npm install web-push` in `backend/` (if not already in lockfile).  
- Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and optionally `VAPID_SUBJECT`.  
- `GET /notifications/push/vapid-key` returns the public key.  
- Register a subscription from the web app (Service Worker + `PushManager.subscribe`), then POST token to your existing register endpoint.  
- Trigger an order event and confirm a push is received (or check logs for send success/failure).

---

## Not done — scope gaps

| Item | Notes | How you would verify *when built* |
|------|--------|-------------------------------------|
| **Email OTP login (customers)** | Customers use phone OTP + Google + password email; no email OTP login flow for shoppers. | `/login` offers “Email OTP”; backend endpoints send/verify email OTP without password. |
| **Multilingual (i18n)** | No locale routes or i18n library wired through apps. | URLs like `/en/...`, `/hi/...` or locale switcher; translated strings across key pages. |
| **Extended warranty API** | Static warranty text only; no partner API or checkout line item for extended warranty. | Checkout shows add-on; order stores warranty SKU; partner webhook or API documented. |
| **AI / ML recommendations** | “Recommended” sections use simple filters (e.g. high rating), not a model or collaborative filtering service. | Dedicated API (e.g. `/recommendations`) backed by rules/ML; different users see personalised sets. |

---

## Optional: mapping “done” to code locations

High-signal entry points (not exhaustive):

- **API root & Swagger:** `backend/src/main.ts`  
- **Prisma models:** `backend/prisma/schema.prisma`  
- **Customer app routes:** `apps/web/src/app/`  
- **Shared HTTP client:** `packages/api/src/`  
- **Search:** `backend/src/modules/search/`  
- **Wishlist:** `backend/src/modules/wishlist/`  
- **Notifications / loyalty / fraud / abandoned cart:** `backend/src/modules/notifications/`  
- **Payments & split:** `backend/src/modules/payment/`  
- **Admin reports & tools:** `backend/src/modules/admin/`  

---

## Keeping this document accurate

When you ship a feature:

1. Mark it **Done** here and add one line under “How to check”.  
2. If you only add backend support, note whether **admin/seller/web UI** exists or is “API only”.  
3. Re-run the verification steps for that feature before client demos.

If you want this split into a client-facing PDF checklist, export this file or copy the tables into your proposal template.
