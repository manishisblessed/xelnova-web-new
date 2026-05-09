# Generic Brand - Deployment Checklist

## Pre-Deployment

- [ ] Review all changes in this PR
- [ ] Test locally with `npm run dev`
- [ ] Run database migration: `npx prisma migrate dev`
- [ ] Verify Generic brand appears in database
- [ ] Check no linter errors: `npm run lint`

## Files Modified

### Backend

1. **`backend/prisma/schema.prisma`**
   - Added `isDefault` field to Brand model
   - Status: ✓ Ready

2. **`backend/prisma/seed-ecommerce.ts`**
   - Added Generic brand to seed data
   - Updated upsert logic
   - Status: ✓ Ready

3. **`backend/prisma/migrations/20260509000000_add_is_default_to_brands/migration.sql`**
   - New migration file
   - Status: ✓ Ready

4. **`backend/src/modules/seller-dashboard/seller-dashboard.service.ts`**
   - Modified `createProduct()` - conditional certificate check
   - Updated `resolveBrandForProductListing()` - added isDefault check
   - Updated `getBrandListingHint()` - added isDefault check
   - Added `getAvailableBrandsForSeller()` - NEW method
   - Status: ✓ Ready

5. **`backend/src/modules/seller-dashboard/seller-dashboard.controller.ts`**
   - Added `getAvailableBrands()` endpoint - NEW
   - Status: ✓ Ready

### Frontend

- No changes required (guides provided for frontend team)
- Existing product form will work as-is
- Recommended: Update UI to call `GET /seller/brands/available`

## Deployment Steps

### 1. Development Environment
```bash
# Apply migrations
cd backend
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start dev server
npm run dev
```

### 2. Staging Environment
```bash
# Deploy code
git push origin feature/generic-brand

# SSH into staging server
cd /app/backend

# Apply migrations
npx prisma migrate deploy

# Seed database (if empty)
npx prisma db seed

# Restart services
systemctl restart xelnova-backend
```

### 3. Production Environment
```bash
# Ensure backup is taken
# (Your backup procedures)

# Deploy code through CI/CD pipeline
git merge --ff-only feature/generic-brand

# SSH into production
cd /app/backend

# Apply migrations (do not rollback in production!)
npx prisma migrate deploy

# Verify Generic brand exists
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SELECT * FROM brands WHERE slug = 'generic';
EOF

# Restart services
systemctl restart xelnova-backend

# Verify services are up
curl http://localhost:3000/health
```

## Verification Steps

### 1. Database Verification
```bash
# Connect to database
psql -h localhost -U postgres -d xelnova

# Check if column exists
\d brands
# Should show: isDefault | boolean | not null | default false

# Check Generic brand
SELECT id, name, slug, isActive, isDefault, approved FROM brands 
WHERE slug = 'generic';
# Should show: isDefault = true, isActive = true, approved = true
```

### 2. API Verification
```bash
# Get available brands for a seller
curl -H "Authorization: Bearer <seller-token>" \
  http://localhost:3000/api/seller/brands/available

# Should include Generic brand first

# Create product with Generic brand
curl -X POST \
  -H "Authorization: Bearer <seller-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Generic Product",
    "brand": "Generic",
    "price": 299,
    "categoryId": "...",
    "hsnCode": "1234567890",
    "gstRate": 18
  }' \
  http://localhost:3000/api/seller/products

# Should succeed without brandAuthorizationCertificate
```

### 3. Frontend Verification
- [ ] Brand dropdown shows Generic first
- [ ] Certificate field is hidden when Generic selected
- [ ] Certificate field is required for other brands
- [ ] Product creation works with Generic brand
- [ ] Bulk upload works with Generic brand in CSV

## Rollback Plan

### If Generic brand breaks production:

```bash
# 1. Disable Generic brand temporarily
UPDATE brands SET "isActive" = false WHERE slug = 'generic';

# 2. Alert sellers to use other brands
# (Send notification email)

# 3. Revert code changes
git revert <commit-hash>

# 4. Restart services
systemctl restart xelnova-backend

# 5. Once fixed, re-enable
UPDATE brands SET "isActive" = true WHERE slug = 'generic';
```

### Complete rollback (if needed):

```bash
# 1. Revert migration
npx prisma migrate resolve --rolled-back 20260509000000

# 2. Revert code
git revert <commit-hash>

# 3. Restart services
systemctl restart xelnova-backend

# 4. Notify sellers
# Send announcement about the rollback
```

## Monitoring Post-Deployment

### Watch for:

1. **Error Rate**: Spike in 4xx/5xx responses
   - Monitor `/seller/products` endpoint
   - Monitor `/seller/brands/available` endpoint

2. **Database Queries**: Check slow query logs
   - Generic brand lookup queries
   - Available brands queries

3. **Seller Feedback**: Monitor support tickets
   - Check if sellers can find Generic brand
   - Verify certificate requirement behavior

### Metrics to Track:

```
- Products created with Generic brand (daily)
- Products created with other brands (daily)
- Average product creation time
- Error rate on product creation
- Users accessing brand endpoints
```

## Communication

### Pre-Deployment (to sellers):
```
📢 Announcement: Generic Brand is Now Available!

We're excited to introduce a new "Generic" brand option. 
This allows you to add and sell products without needing brand 
authorization certificates.

What's new:
✓ Select "Generic" brand for any product
✓ No authorization documents needed
✓ Standard approval process
✓ Perfect for generic/unbranded products

Get started:
1. Go to "Add Product"
2. Select "Generic" from the brand dropdown
3. Fill in product details
4. Submit for review

Questions? Contact support@xelnova.com
```

### Post-Deployment (team):
```
✅ Generic Brand Feature Deployed

Status: Live in Production
Deployed by: [Name]
Deployed at: [Time]

Changes:
- Added isDefault field to brands table
- Generic brand available for all sellers
- Certificate optional for Generic brand
- New API endpoint: GET /seller/brands/available

Monitoring: [Link to dashboard]
```

## Documentation

- [x] Implementation guide created: `GENERIC_BRAND_IMPLEMENTATION.md`
- [x] Frontend guide created: `GENERIC_BRAND_FRONTEND_GUIDE.md`
- [x] Database docs created: `GENERIC_BRAND_DATABASE_DOCS.md`
- [ ] Update API documentation
- [ ] Update seller help docs
- [ ] Notify customer success team

## Support

### Common Issues

**Q: Generic brand not showing in my brand list?**
A: Refresh your page. If still missing, contact support.

**Q: Can I use Generic brand for all my products?**
A: Yes! Generic brand works for any product type.

**Q: Can I switch my product from another brand to Generic?**
A: Yes, edit the product and change the brand to Generic.

**Q: Do I still need certificates for my own brand?**
A: No, but you can upload them for verification purposes.

---

## Sign-Off

- [ ] QA Lead: Verified all test cases pass
- [ ] Backend Lead: Code review complete
- [ ] DevOps: Deployment plan confirmed
- [ ] Product: Feature acceptance confirmed
- [ ] Customer Success: Ready to communicate with sellers
