# Generic Brand - Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SELLER DASHBOARD                        │
│                                                             │
│  Add Product Form                                          │
│  ├─ Brand Dropdown (calls GET /seller/brands/available)   │
│  │  ├─ Generic ✓ (No cert needed)                         │
│  │  ├─ Apple   (Own brand)                                │
│  │  ├─ Samsung (Approved)                                 │
│  │  └─ Nike    (Dealer auth needed)                       │
│  │                                                         │
│  ├─ Authorization Certificate (CONDITIONAL)               │
│  │  └─ Hidden when Generic is selected                    │
│  │  └─ Required for other brands                          │
│  │                                                         │
│  └─ Submit Button → POST /seller/products                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND SERVICE LOGIC                          │
│                                                             │
│  createProduct(userId, dto)                               │
│  ├─ Validate brand exists                                  │
│  ├─ Check if brand is DEFAULT                             │
│  │  ├─ If Generic: Skip cert check ✓                      │
│  │  └─ If Other: Require cert ✓                           │
│  ├─ Resolve brand mode                                     │
│  │  └─ resolveBrandForProductListing()                    │
│  │     ├─ If isDefault: return 'standard'                 │
│  │     ├─ If own brand: return 'standard'                 │
│  │     ├─ If approved: return 'standard'                  │
│  │     └─ If other: return 'dealer_documents_pending'     │
│  └─ Create product with appropriate status                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE STORAGE                           │
│                                                             │
│  products table                                            │
│  ├─ name: "Phone Stand"                                    │
│  ├─ brand: "Generic"                                       │
│  ├─ status: PENDING                  (not PENDING_BRAND_AUTH)│
│  ├─ brandAuthAdditionalDocumentUrls: []                    │
│  └─ (rest of product data)                                 │
│                                                             │
│  brands table                                              │
│  ├─ name: "Generic"                                        │
│  ├─ slug: "generic"                                        │
│  ├─ isDefault: true          ← KEY FLAG                    │
│  ├─ approved: true                                         │
│  ├─ isActive: true                                         │
│  └─ proposedBy: null         (admin-created)              │
└─────────────────────────────────────────────────────────────┘
```

## Decision Tree - Brand Authorization Flow

```
                    ┌─ Product Creation Request ─┐
                    │ brand: "Generic"           │
                    └──────────────────────────────┘
                              ↓
                    ┌─────────────────────────┐
                    │ Brand exists in DB?     │
                    └─────────────────────────┘
                      ↙           ↖
                    YES           NO
                    ↓             ↓
            ┌──────────────┐  ┌──────────────────┐
            │ Check if     │  │ Create new brand │
            │ isDefault    │  │ with proposedBy  │
            └──────────────┘  └──────────────────┘
                 ↙    ↖                  ↓
               YES    NO          Product status:
                ↓     ↓              PENDING
            NO  CERT  CERT
            REQ OPTIONAL REQUIRED
            ✓   ⚠️      ⚠️
            │   │       │
            └───┴───────┘
                ↓
        ┌────────────────────┐
        │ Another seller's   │
        │ brand?             │
        └────────────────────┘
         ↙        │        ↖
       OWN      APPROVED   OTHER
       ↓          ↓          ↓
   STANDARD  STANDARD   DEALER_AUTH
   PENDING   PENDING    PENDING_BRAND_AUTHORIZATION
   ✓         ✓          ⚠️ (needs cert + docs)
```

## Brand Classification Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BRAND CLASSIFICATION                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  GENERIC BRAND                                                      │
│  ├─ name: "Generic"                                                │
│  ├─ isDefault: true                                                │
│  ├─ approved: true                                                 │
│  ├─ proposedBy: null                                               │
│  ├─ Certificate Required: NO ✓                                     │
│  ├─ Product Status: PENDING                                        │
│  └─ Best For: Unbranded, generic products                          │
│                                                                     │
│  APPROVED GLOBAL BRAND                                             │
│  ├─ name: "Apple" (example)                                        │
│  ├─ isDefault: false                                               │
│  ├─ approved: true                                                 │
│  ├─ proposedBy: null (admin-created) or any seller                 │
│  ├─ Certificate Required: OPTIONAL                                 │
│  ├─ Product Status: PENDING                                        │
│  └─ Best For: Well-known brands                                    │
│                                                                     │
│  SELLER'S OWN BRAND                                                │
│  ├─ name: "Acme Inc" (example)                                     │
│  ├─ isDefault: false                                               │
│  ├─ approved: false or true                                        │
│  ├─ proposedBy: seller-id                                          │
│  ├─ Certificate Required: OPTIONAL                                 │
│  ├─ Product Status: PENDING                                        │
│  └─ Best For: Seller's proprietary brand                           │
│                                                                     │
│  OTHER SELLER'S PENDING BRAND                                      │
│  ├─ name: "Nike" (another seller's proposed)                       │
│  ├─ isDefault: false                                               │
│  ├─ approved: false                                                │
│  ├─ proposedBy: other-seller-id                                    │
│  ├─ Certificate Required: YES (mandatory)                          │
│  ├─ Additional Docs Required: YES (≥1)                             │
│  ├─ Product Status: PENDING_BRAND_AUTHORIZATION                    │
│  └─ Best For: Dealer authorization only                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## API Flow Diagram

```
┌─────────────────────┐
│ SELLER APPLICATION  │
│                     │
│ User clicks:        │
│ "Add Product"       │
└─────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ GET /seller/brands/available            │
│                                         │
│ Returns:                                │
│ [                                       │
│   {name: "Generic", isDefault: true},   │
│   {name: "Apple", approved: true},      │
│   {name: "Samsung", approved: true},    │
│   {name: "MyBrand", proposedBy: me},    │
│   ...                                   │
│ ]                                       │
└─────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ USER SELECTS: "Generic"                  │
│                                          │
│ Frontend hides:                          │
│ - Certificate input                      │
│ - Additional docs input                  │
│                                          │
│ Shows:                                   │
│ ✓ No certificates needed                 │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ POST /seller/products                                    │
│                                                          │
│ Body: {                                                  │
│   name: "Phone Stand",                                   │
│   brand: "Generic",                                      │
│   price: 299,                                            │
│   categoryId: "...",                                     │
│   brandAuthorizationCertificate: "" ← OPTIONAL           │
│   brandAuthAdditionalDocumentUrls: [] ← OPTIONAL         │
│   ... rest of fields                                     │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ BACKEND VALIDATION                           │
│                                              │
│ ✓ Brand exists: Generic                      │
│ ✓ Brand isDefault: true                      │
│ ✓ Certificate check: SKIPPED (default brand) │
│ ✓ Cert not required                          │
│ ✓ Create product with PENDING status         │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ RESPONSE 201 CREATED                         │
│                                              │
│ {                                            │
│   id: "prod-123",                            │
│   name: "Phone Stand",                       │
│   brand: "Generic",                          │
│   status: "PENDING",                         │
│   sellerId: "seller-123"                     │
│ }                                            │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ ADMIN REVIEW QUEUE                           │
│                                              │
│ Product appears for admin review             │
│ (standard PENDING, not brand-auth)           │
│                                              │
│ Admin can:                                   │
│ ✓ Approve → goes ACTIVE                      │
│ ✓ Reject → back to seller                    │
└──────────────────────────────────────────────┘
```

## State Diagram - Product Lifecycle with Generic Brand

```
                    ┌─────────────────┐
                    │ CREATE PRODUCT  │
                    │ Brand: Generic  │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │    PENDING      │
                    │  (No admin cert │
                    │   check needed) │
                    └────────┬────────┘
                      ↙              ↖
                 APPROVE           REJECT
                    ↓                ↓
            ┌─────────────────┐  ┌──────────────┐
            │     ACTIVE      │  │ Seller can   │
            │  (Visible to    │  │ edit & retry │
            │   customers)    │  │ or discard   │
            └────────┬────────┘  └──────────────┘
                     ↓
            ┌─────────────────┐
            │ ON_HOLD/PAUSE   │
            │ (by seller)     │
            └────────┬────────┘
                     ↓
            ┌─────────────────┐
            │  DRAFT/DELETE   │
            │  (by seller)    │
            └─────────────────┘

Note: Different from PENDING_BRAND_AUTHORIZATION which requires
additional admin review for brand authorization documents
```

## Comparison: Generic vs Other Brands

```
                   │ Generic │ Approved │ Own Proposed │ Other's Brand
───────────────────┼─────────┼──────────┼──────────────┼───────────────
Certificate Req    │   NO    │ OPTIONAL │  OPTIONAL    │   YES
Add'l Docs Req     │   NO    │   NO     │    NO        │   YES (≥1)
Product Status    │PENDING  │ PENDING  │  PENDING     │ PENDING_AUTH
Admin Cert Review │   NO    │   NO     │   NO         │   YES
Product Goes Live │  After  │  After   │  After       │ After full
                   │ Normal  │ Normal   │  Normal      │ Auth Review
                   │ Approval│ Approval │  Approval    │
───────────────────┴─────────┴──────────┴──────────────┴───────────────
Use Case           │Generic  │ Well-    │ Your own     │ Distributor/
                   │products │ known    │ proprietary  │ Authorized
                   │         │ brands   │ brand        │ reseller
```

## URL Routing Diagram

```
Seller App
│
├─ GET /seller/brands/available
│  └─ Returns all available brands (Generic first)
│
├─ POST /seller/brands/propose
│  └─ Propose new brand (not needed for Generic)
│
├─ GET /seller/brands
│  └─ Returns only seller's own proposed brands
│
├─ GET /seller/brands/listing-hint?brand=Generic
│  └─ Returns: { mode: 'direct' } (no docs needed)
│
├─ POST /seller/products
│  ├─ brand: "Generic" → Certificate OPTIONAL ✓
│  ├─ brand: "Apple" → Certificate OPTIONAL ✓
│  └─ brand: "OtherSeller's Brand" → Certificate REQUIRED ✗
│
└─ GET /seller/products
   └─ Returns all products including Generic brand ones
```

---

These diagrams help visualize:
1. How Generic brand flows through the system
2. Decision logic for certificate requirements
3. Comparison with other brand types
4. API interaction patterns
5. Product lifecycle differences
