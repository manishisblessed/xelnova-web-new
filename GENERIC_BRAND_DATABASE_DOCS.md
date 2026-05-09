# Generic Brand - Database Documentation

## Schema Changes

### Brand Model - New Field

```prisma
model Brand {
  id       String  @id @default(cuid())
  name     String  @unique
  slug     String  @unique
  logo     String?
  featured Boolean @default(false)
  isActive Boolean @default(true)
  
  // NEW FIELD:
  /** When true, sellers can use this brand without authorization certificates */
  isDefault Boolean @default(false)

  proposedBy String?
  approved   Boolean @default(true)
  authorizationCertificate String?
  rejectionReason String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([proposedBy])
  @@index([approved])
  @@map("brands")
}
```

## Migration

File: `backend/prisma/migrations/20260509000000_add_is_default_to_brands/migration.sql`

```sql
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;
```

## Data Changes

### Initial Data (from seed)

The `generic` brand is automatically created by the seeder:

```
INSERT INTO brands (id, name, slug, logo, featured, isActive, isDefault, proposedBy, approved, authorizationCertificate, rejectionReason, createdAt, updatedAt)
VALUES 
(
  'cuid-generic',
  'Generic',
  'generic',
  NULL,
  false,
  true,
  true,
  NULL,
  true,
  NULL,
  NULL,
  NOW(),
  NOW()
);
```

### Existing Brands

All existing brands continue to work as before:
- `isDefault` is set to `false` by default
- No behavior changes for them
- Backward compatible

## Query Examples

### Get all default brands
```sql
SELECT * FROM brands WHERE "isDefault" = true;
```

### Get all brands available for a seller
```sql
SELECT * FROM brands
WHERE 
  ("proposedBy" = 'seller-123' OR "approved" = true OR "isDefault" = true)
  AND "isActive" = true
ORDER BY "isDefault" DESC, "approved" DESC, "createdAt" DESC;
```

### Get only seller's own brands
```sql
SELECT * FROM brands WHERE "proposedBy" = 'seller-123';
```

### Check if a brand is default
```sql
SELECT "isDefault" FROM brands WHERE slug = 'generic';
-- Returns: true
```

## Indexes

Current indexes on the `brands` table:
```sql
CREATE INDEX brands_proposedBy_idx ON brands (proposedBy);
CREATE INDEX brands_approved_idx ON brands (approved);
```

### Recommended Additional Index (Optional)

If performance is a concern with many sellers querying available brands:

```sql
CREATE INDEX brands_available_idx ON brands ("isActive", "isDefault", "approved", "proposedBy");
```

This would optimize the query:
```sql
WHERE ("proposedBy" = ? OR "approved" = true OR "isDefault" = true) AND "isActive" = true
```

## Usage Patterns

### When a seller creates a product with Generic brand:

1. **Validation** (in `createProduct()`):
   ```typescript
   const brandRecord = await prisma.brand.findUnique({ 
     where: { slug: 'generic' } 
   });
   const isDefaultBrand = brandRecord?.isDefault === true;
   
   if (!isDefaultBrand && !dto.brandAuthorizationCertificate?.trim()) {
     throw new BadRequestException('Brand authorization certificate is required');
   }
   ```

2. **Brand Resolution** (in `resolveBrandForProductListing()`):
   ```typescript
   const isDefaultBrand = existing.isDefault === true;
   if (ownsIt || globallyApproved || isDefaultBrand) {
     return 'standard'; // No dealer docs needed
   }
   ```

3. **Product Created** with:
   - `status: PENDING` (not `PENDING_BRAND_AUTHORIZATION`)
   - No additional brand verification needed

## Cascading Effects

- **No** cascading deletes on `isDefault` field
- Generic brand can be soft-deleted by setting `isActive = false` if needed
- Products using Generic brand are **not affected** by brand status

## Audit Trail

### Viewing brand changes:
```sql
-- When was Generic brand created?
SELECT * FROM brands WHERE slug = 'generic';

-- Check if any brand was modified after Generic creation:
SELECT * FROM brands WHERE "updatedAt" > (SELECT "createdAt" FROM brands WHERE slug = 'generic');
```

## Performance Considerations

1. **Small table**: Brands table is typically small (< 100 rows)
2. **No additional indexes needed** initially
3. **Existing indexes sufficient** for current queries
4. **Consider index optimization** if seller counts exceed 100k

## Backward Compatibility

✓ Old code continues to work:
- `isDefault` defaults to `false`
- Existing brands maintain current behavior
- No required field changes
- Safe migration with `IF NOT EXISTS`

## Future Enhancements

Potential improvements down the road:

1. **Add `disallowOtherSellers` flag**: Prevent other sellers from using a brand
2. **Add `category` field**: Restrict brand to specific categories
3. **Add `seller_brand` junction table**: Better many-to-many relationship if needed

---

## Troubleshooting

### Generic brand not showing in available brands?

```sql
-- Check if it exists
SELECT * FROM brands WHERE slug = 'generic';

-- Check if it's active
SELECT * FROM brands WHERE slug = 'generic' AND "isActive" = true;
```

### Generic brand not appearing in seller UI?

1. Verify migration was applied: `npx prisma migrate status`
2. Verify seed data was run: Check `brands` table for `name = 'Generic'`
3. Check if `isDefault = true` was set
4. Verify `isActive = true`

### Migrate adds column but seed doesn't create brand?

Seeds are idempotent. Run:
```bash
npx prisma db seed
# or specifically
npx prisma db seed -- --only ecommerce
```

