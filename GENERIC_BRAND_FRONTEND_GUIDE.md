# Generic Brand - Frontend Implementation Guide

## Quick Overview

Sellers can now use a **"Generic" brand** to add products without needing authorization certificates. This is perfect for sellers who don't have established brands.

## API Changes

### New Endpoint Available

```
GET /seller/brands/available

Response:
[
  {
    id: "cuid1",
    name: "Generic",
    slug: "generic",
    logo: null,
    featured: false,
    isActive: true,
    isDefault: true,
    proposedBy: null,
    approved: true,
    authorizationCertificate: null,
    rejectionReason: null,
    createdAt: "2026-05-09T...",
    updatedAt: "2026-05-09T..."
  },
  {
    id: "cuid2",
    name: "Samsung",
    slug: "samsung",
    ...
  },
  // ... more brands
]
```

### Modified Endpoint Behavior

```
POST /seller/products

Body:
{
  ...other fields...,
  brand: "Generic", // or any other brand name
  brandAuthorizationCertificate: "", // Optional for Generic brand
  brandAuthAdditionalDocumentUrls: [] // Optional for Generic brand
}
```

## UI Implementation

### Product Creation Form

#### 1. Brand Selection Dropdown

```jsx
// Call this on component mount or when user opens product form
const { data: availableBrands } = await fetch('/seller/brands/available')

// Display brands sorted (Generic first):
// - Generic (default) - highlighted or marked as "No certificate needed"
// - Other approved brands
// - Seller's own brands
```

#### 2. Authorization Certificate Field

```jsx
const [selectedBrand, setSelectedBrand] = useState('')
const [certificate, setCertificate] = useState('')

const isGenericBrand = selectedBrand === 'Generic'
const isCertificateRequired = !isGenericBrand && /* other conditions */

// Make certificate field conditional:
{!isGenericBrand && (
  <div>
    <label>Brand Authorization Certificate *</label>
    <input 
      required={isCertificateRequired}
      ...
    />
  </div>
)}

// For Generic brand, optionally show a note:
{isGenericBrand && (
  <div className="info-banner">
    ✓ No authorization documents needed for Generic brand
  </div>
)}
```

#### 3. Additional Documents Field

```jsx
// Hide this section for Generic brand
{!isGenericBrand && (
  <div>
    <label>Additional Documents</label>
    <input type="text" placeholder="Distributor letter, etc." .../>
  </div>
)}
```

### Bulk Upload Support

Generic brand is supported in bulk upload CSV too. No changes needed on the frontend - the backend handles it the same way:

```csv
product_name, brand, price, ...
"My Product", "Generic", 499, ...
```

## UX Improvements

### 1. Brand Selection Screen
```
┌─────────────────────────────────┐
│ Select a Brand                  │
├─────────────────────────────────┤
│ ○ Generic                   ✓   │  <- Highlighted, no cert needed
│   Perfect for products with...  │
├─────────────────────────────────┤
│ ○ Apple                         │
│ ○ Samsung                       │
│ ○ My Own Brand                  │
└─────────────────────────────────┘
```

### 2. Form State After Generic Selection
```
[Generic ▼]

ℹ️ No authorization certificate needed for Generic brand
   You can add generic products without brand documents

Product Name: _______________________
Price: _______________________
Stock: _______________________
...
```

### 3. Form State After Other Brand Selection
```
[Apple ▼]

⚠️ This brand requires authorization
   Upload your certificate and at least one additional document

Brand Authorization Certificate *  [Choose File]
Additional Documents *              [Choose File]
```

## Seller Workflow

### Scenario 1: Seller with no established brand
1. Go to Add Product
2. Select "Generic" from brand dropdown
3. Fill in product details
4. Skip authorization certificate section
5. Submit for review
6. Product goes live after admin approval

### Scenario 2: Seller with authorized brand
1. Go to Add Product
2. Select their brand from dropdown
3. Fill in product details
4. Optionally upload certificate (for verification)
5. Submit for review
6. Product goes live after admin approval

### Scenario 3: Seller wanting to sell under another brand
1. Go to Add Product
2. Type/select other seller's brand
3. Upload authorization certificate (required)
4. Upload dealer documents (required)
5. Submit for review
6. Admin reviews brand authorization
7. Product goes live after approval

## Testing Steps

- [ ] Create product with Generic brand without certificate
- [ ] Verify certificate field is hidden when Generic selected
- [ ] Verify certificate field is required for non-Generic brands
- [ ] Bulk upload with Generic brand works
- [ ] Verify Generic brand appears first in brand list
- [ ] Verify products created with Generic show correctly in inventory

## Error Handling

If seller forgets to select a brand:
```
"Brand is required"
```

If seller selects non-Generic brand but forgets certificate:
```
"Brand authorization certificate is required"
```

If seller uses another seller's brand without documents:
```
"This brand is already registered. Provide a brand authorization 
certificate and at least one additional document for admin review."
```

## API Response Examples

### Success: Create Product with Generic Brand
```json
{
  "status": "ok",
  "data": {
    "id": "prod123",
    "name": "Generic Product",
    "brand": "Generic",
    "status": "PENDING",
    "brandAuthAdditionalDocumentUrls": []
  }
}
```

### Error: Missing Certificate for Non-Generic Brand
```json
{
  "status": "error",
  "code": "BAD_REQUEST",
  "message": "Brand authorization certificate is required"
}
```

## Notes for Developers

1. **Generic brand is always available** - no special permissions needed
2. **Backward compatible** - existing functionality unchanged for other brands
3. **Case-insensitive** - "generic", "Generic", "GENERIC" all work
4. **Always approved** - Generic brand doesn't need admin approval
5. **Seller can still propose brands** - they can add their own brands too
