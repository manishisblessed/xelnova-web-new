Full Project Status — Done vs Pending
DONE (Fully Implemented) — 49 Features
#	Feature	Status
1
Responsive website (homepage, listing, detail, cart, checkout)
Done
2
SEO — sitemap.xml, robots.txt, meta tags, OpenGraph, Twitter Card, JSON-LD
Done
3
Phone OTP login (Fortius SMS)
Done
4
Google social login (OAuth)
Done
5
Forgot / reset password (email token flow + UI)
Done
6
Order tracking (track order page + status)
Done
7
Order cancellation (with stock restore)
Done
8
Returns / refund requests (customer + admin)
Done
9
Reverse pickup for returns (AWB, courier, scheduling)
Done
10
Customer wallet (balance, credit/debit, payout)
Done
11
PDF invoices (pdf-lib, download endpoint)
Done
12
Support ticket system (customer, seller, admin, internal notes, forwarding)
Done
13
Seller dashboard (stats, orders, products, analytics)
Done
14
Product CRUD (create/edit/delete, variants, SEO fields, HSN, GST)
Done
15
Inventory management (stock tracking, low-stock alerts, email)
Done
16
Bulk product upload (CSV parsing + preview + error reporting)
Done
17
Seller brand proposals (propose + admin approve)
Done
18
Seller settlement reports (date filters, CSV export)
Done
19
Seller sales analytics (revenue chart, top products, category breakdown)
Done
20
Admin dashboard (overview stats)
Done
21
Admin product/category/brand management
Done
22
Admin order management (status updates, shipment assignment)
Done
23
Coupon management (global + category-scoped + seller-scoped)
Done
24
Commission rules (category-based, configurable rates)
Done
25
Payout management (approve/reject/pay)
Done
26
Split payments / advance payouts (Razorpay transfers, seller shares)
Done
27
Seller onboarding (multi-step: GST, PAN, Aadhaar, bank, verification)
Done
28
CMS pages (admin CRUD)
Done
29
Site settings (admin configurable)
Done
30
GST / TDS reporting (with CSV export)
Done
31
Refund reporting
Done
32
Duplicate listing detection (heuristics + admin hide)
Done
33
Pricing anomaly flags (zero price, extreme discount, etc.)
Done
34
Razorpay payment integration (create order, verify, webhook, refund)
Done
35
COD verification (delivery OTP + risk assessment)
Done
36
Multi-courier shipping (Delhivery, ShipRocket, Xpressbees, Ekart, Xelnova)
Done
37
AWB generation + tracking
Done
38
Email notifications (Resend — all templates)
Done
39
In-app notification system (log, read/unread, mark-all-read)
Done
40
Abandoned cart recovery (detection + reminder emails + conversion tracking)
Done
41
Fraud order detection (rules engine + admin review queue)
Done
42
Loyalty points (earn from orders, signup bonus, redeem for discount)
Done
43
Referral system (unique codes, referrer + referred bonuses, stats)
Done
44
Loyalty auto-earn on order (wired into order service)
Done
45
OpenAPI / Swagger documentation
Done
46
Admin roles UI (CRUD for custom roles)
Done
47
Server-side search autocomplete (backend API + frontend wired)
Done
48
Dedicated /categories/[slug] pages (with SEO metadata)
Done
49
Dedicated /brands/[slug] pages (with SEO metadata)
Done
50
Backend wishlist API (server-persisted + synced with local storage)
Done
51
WhatsApp notifications (Meta Cloud API — real integration)
Done
PARTIAL (Code exists but has a gap) — 2 Features
#	Feature	What's Missing
1
Admin RBAC enforcement
Guard logic + @RequirePermissions() decorator exist, but no admin route currently uses @RequirePermissions(). The decorator needs to be applied to specific admin endpoints (e.g. @RequirePermissions('manage_orders')) to actually enforce fine-grained access.
2
Web Push notifications
Service code (web-push.service.ts) is complete with VAPID support, but web-push npm package is not installed in backend/package.json. Needs npm install web-push to work at runtime.
NOT DONE (No implementation found) — 4 Features
#	Feature	Notes
1
Email OTP login (for customers)
Only phone OTP exists for customers. Email login is password-based. Email OTP exists only in seller onboarding.
2
Multilingual / i18n
No i18n framework, no locale routing, hardcoded lang="en".
3
Extended warranty API
Only static marketing copy. No partner integration or checkout add-on.
4
AI/ML recommendations
"Recommended for You" uses a simple rating >= 4.0 filter. No real recommendation engine.