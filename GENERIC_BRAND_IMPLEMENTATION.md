# Generic Brand Implementation Summary

## Overview
Added a default "Generic" brand that all sellers can use to add products without requiring brand authorization certificates. This allows sellers without registered brands to still sell generic products on the marketplace.

## Changes Made

### 1. Database Schema Updates (`backend/prisma/schema.prisma`)
- Added `isDefault` boolean field to the `Brand` model (defaults to `false`)
- This field identifies brands that don't require authorization certificates

### 2. Database Migration (`backend/prisma/migrations/20260509000000_add_is_default_to_brands/migration.sql`)
- Created migration to add the `isDefault` column to the `brands` table
- Migration uses `IF NOT EXISTS` for safety on existing deployments

### 3. Seed Data Updates (`backend/prisma/seed-ecommerce.ts`)
- Added "Generic" brand to the brands array with `isDefault: true`
- Updated the upsert logic to handle the `isDefault` flag
- Generic brand is created with:
  - `slug: "generic"`
  - `name: "Generic"`
  - `isActive: true`
  - `approved: true`
  - `isDefault: true`

### 4. Service Layer Updates (`backend/src/modules/seller-dashboard/seller-dashboard.service.ts`)

#### `createProduct()` method:
- Modified brand authorization certificate requirement
- Now checks if the brand is a default brand
- Certificate is **optional** for default brands (Generic)
- Certificate remains **required** for non-default brands

#### `resolveBrandForProductListing()` method:
- Updated to recognize default brands (`isDefault === true`)
- Default brands are treated like:
  - Seller's own brands
  - Admin-approved global brands
- No dealer documentation requirements for default brands

#### `getBrandListingHint()` method:
- Added check for `isDefault` flag
- Returns `direct` mode for default brands (no authorization needed)

#### `getSellerBrands()` method:
- Existing method - returns seller's own proposed brands
- Unchanged

#### `getAvailableBrandsForSeller()` method (NEW):
- Returns all brands available to a seller:
  - Seller's own proposed brands
  - Admin-approved global brands
  - Default brands (Generic)
- Sorted with default brands first for better UX
- Filters only active brands

### 5. Controller Updates (`backend/src/modules/seller-dashboard/seller-dashboard.controller.ts`)
- Added new endpoint: `GET /seller/brands/available`
- Returns all brands available for the current seller
- Includes own brands, approved brands, and default brands

## How It Works

### For Sellers Using Generic Brand:
1. Seller selects "Generic" from the available brands list
2. No authorization certificate is required
3. Product can be created directly with PENDING status
4. Admin reviews the product and approves it (standard flow)

### For Sellers Using Other Brands:
- If using their own proposed brand or an admin-approved brand:
  - Authorization certificate is optional
  - Product is added with PENDING status
  
- If using another seller's pending brand:
  - Authorization certificate is **required**
  - At least one additional document is required
  - Product is added with PENDING_BRAND_AUTHORIZATION status
  - Admin reviews both brand and product authorization

## Frontend Integration Points

The seller dashboard UI should:

1. **Brand Selection Dropdown:**
   - Call `GET /seller/brands/available` on product creation
   - Display Generic brand prominently (first in list)
   - Show other available brands below

2. **Authorization Certificate Field:**
   - Make it **optional** when Generic brand is selected
   - Make it **required** for other non-approved brands
   - Hide dealer document fields when Generic brand is selected

3. **Existing Products:**
   - Sellers can keep using their existing brands
   - No changes required for already-created products

## Testing Checklist

- [ ] Seed Generic brand by running `npx prisma migrate dev`
- [ ] Verify Generic brand appears in `GET /seller/brands/available`
- [ ] Create product with Generic brand without certificate
- [ ] Verify product is created with PENDING status
- [ ] Create product with Generic brand via bulk upload
- [ ] Verify admin can still approve Generic products
- [ ] Test that non-default brands still require certificates
- [ ] Test UI shows/hides certificate field based on brand selection

## API Endpoints

### New Endpoint:
```
GET /seller/brands/available
Authorization: Bearer <seller-token>
Response: Array<Brand>
```

Returns all brands available for the current seller (own + approved + default).

### Updated Behavior:
```
POST /seller/products
- Brand authorization certificate is now optional for Generic brand
- Certificate remains required for other non-approved brands
```

## Rollback Instructions

If needed to rollback:
1. Remove the `isDefault` column: `ALTER TABLE brands DROP COLUMN isDefault;`
2. Revert changes to seller-dashboard.service.ts
3. Revert changes to seller-dashboard.controller.ts
4. The seed file can be safely kept as-is (upsert handles missing flag)

## Notes

- The Generic brand is created during seed/migration
- Existing sellers can immediately start using Generic brand for new products
- No seller profile changes or permissions updates needed
- Admin approval flow remains unchanged
- Generic brand cannot be deleted or disabled (business rule)
