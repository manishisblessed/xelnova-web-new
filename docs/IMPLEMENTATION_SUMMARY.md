# Amazon-Style Product Variant Expansion Implementation

## Overview

Implemented a comprehensive expandable variant display system similar to Amazon Seller Central for both admin and seller product management interfaces. This allows users to view detailed variant information (SKU, price, stock, images, etc.) in a clean, expandable table format.

## Components Created

### 1. Admin Component
**Location**: `apps/admin/src/components/product-variants-expansion.tsx`

**Features**:
- Expandable/collapsible variant table
- Displays all variant details: images, SKU, price, MRP, stock, availability
- Optional sales data integration (units sold, page views, sales rank)
- Desktop table view + mobile card layout
- Low stock warnings (stock ≤ 5)
- Shows parent product info for single-SKU products

### 2. Seller Component
**Location**: `apps/seller/src/components/product-variants-expansion.tsx`

**Features**:
- Same core functionality as admin component
- Excludes sales data (seller doesn't have access)
- Optimized for seller workflow
- MRP column included for seller reference

## Integration Points

### Admin Panel Integration
**File**: `apps/admin/src/app/(admin-panel)/products/page.tsx`

**Changes**:
1. Imported `ProductVariantsExpansion` component
2. Added expansion component to product preview modal
3. Positioned after existing `VariantsPreview` component
4. Provides admins with detailed variant view during product approval

```tsx
<ProductVariantsExpansion
  productId={viewing.id}
  productName={viewing.name}
  basePrice={viewing.price}
  baseStock={viewing.stock}
  baseSku={viewing.sku || undefined}
  variants={viewing.variants}
/>
```

### Seller Panel Integration
**File**: `apps/seller/src/app/(seller-panel)/inventory/page.tsx`

**Changes**:
1. Imported `ProductVariantsExpansion` component
2. Added expansion component to product edit modal
3. Positioned at bottom of edit form (after "Low stock threshold" field)
4. Shows sellers all variant details while editing

```tsx
{editProduct && (
  <ProductVariantsExpansion
    productId={editProduct.id}
    productName={editProduct.name}
    basePrice={editProduct.price}
    baseStock={editProduct.stock}
    baseSku={formSku || undefined}
    variants={editProduct.variants}
    className="mt-4"
  />
)}
```

## Visual Design

### Collapsed State
```
┌─────────────────────────────────────────────────────────┐
│ 📦 Related to 6 variations [INFO: 2 groups]    Expand ▼│
└─────────────────────────────────────────────────────────┘
```

### Expanded State (Desktop)
```
┌──────────────────────────────────────────────────────────┐
│ 📦 Related to 6 variations [INFO: 2 groups]  Collapse ▲│
├──────────────────────────────────────────────────────────┤
│┌─────────────────────────────────────────────────────────┐│
││ Image │ Variant    │ SKU     │ Price    │ Stock │ ... ││
│├─────────────────────────────────────────────────────────┤│
││ [IMG] │ Red / S    │ SKU-001 │ ₹1,499   │   45  │ ... ││
││ [IMG] │ Red / M    │ SKU-002 │ ₹1,499   │    3  │ ... ││ ← Low stock warning
││ [IMG] │ Blue / S   │ SKU-003 │ ₹1,599   │   23  │ ... ││
││ [IMG] │ Blue / M   │ SKU-004 │ ₹1,599   │   67  │ ... ││
││ [IMG] │ Green / S  │ SKU-005 │ ₹1,549   │   12  │ ... ││
││ [IMG] │ Green / M  │ SKU-006 │ ₹1,549   │   34  │ ... ││
│└─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Expanded State (Mobile)
```
┌──────────────────────────────┐
│ 📦 Related to 6 variations  │
│    [INFO: 2 groups] Collapse│
├──────────────────────────────┤
│┌────────────────────────────┐│
││  [IMG]   Red / S           ││
││          [ACTIVE Badge]    ││
││                            ││
││  SKU: SKU-001              ││
││  Price: ₹1,499             ││
││  MRP: ₹2,999               ││
││  Stock: 45                 ││
│├────────────────────────────┤│
││  [IMG]   Red / M           ││
││          [ACTIVE Badge]    ││
││                            ││
││  SKU: SKU-002              ││
││  Price: ₹1,499             ││
││  Stock: 3 (Low)            ││ ← Low stock indicator
│└────────────────────────────┘│
└──────────────────────────────┘
```

## Data Structure Support

The component works with the existing variant structure:

```typescript
// Supported variant group format
{
  type: "color",
  label: "Colour",
  options: [
    {
      value: "red",
      label: "Red",
      available: true,
      hex: "#FF0000",
      images: ["url1.jpg", "url2.jpg"],
      price: 1499,
      compareAtPrice: 2999,
      stock: 45,
      sku: "SKU-001"
    }
  ]
}
```

## Key Features

### 1. Smart Flattening
- Automatically flattens nested variant groups into individual rows
- Combines multiple attributes (e.g., "Red / Large")
- Preserves group hierarchy for display

### 2. Fallback Handling
- Uses base product price if variant price is missing
- Uses base stock if variant stock is missing
- Shows "—" for truly missing data

### 3. Visual Indicators
- **Low Stock**: Red text + "Low stock" label for stock ≤ 5
- **Availability**: Green "Active" or red "Unavailable" badges
- **Images**: Shows first variant image or placeholder icon
- **Price Comparison**: Shows strikethrough MRP when different from price

### 4. Responsive Design
- Desktop: Full-width table with all columns
- Mobile: Stacked cards with grid layout
- Smooth transitions on expand/collapse
- Optimized for touch interactions

### 5. Admin-Specific Features
- **Sales Data Columns**: Optional "Units Sold" and "Page Views"
- **Performance Metrics**: Track which variants perform best
- **SKU-based Mapping**: Sales data keyed by SKU

## Benefits

### For Admins
- ✅ Quick variant verification during product approval
- ✅ See all SKUs, prices, and stock levels at a glance
- ✅ Identify variants needing attention (low stock, no images)
- ✅ Sales performance data per variant (if integrated)

### For Sellers
- ✅ Review all variant details while editing
- ✅ Verify pricing consistency across variants
- ✅ Monitor stock levels for replenishment
- ✅ Check image quality and completeness

### For Users (General)
- ✅ Reduces cognitive load (collapsed by default)
- ✅ No more decoding raw JSON
- ✅ Mobile-friendly interface
- ✅ Consistent with Amazon UX patterns

## Testing Checklist

- [x] Single-SKU products show appropriate message
- [x] Multi-variant products expand/collapse correctly
- [x] Low stock warnings display at threshold (5 units)
- [x] Missing images show placeholder icon
- [x] Fallback to base price/stock works correctly
- [x] Mobile card layout renders properly
- [x] Desktop table layout is readable
- [x] Sales data appears in admin view (when provided)
- [x] Component handles malformed variant data gracefully
- [x] No linter errors in both components

## Usage Examples

### Admin: Review Product with Sales Data
```tsx
<ProductVariantsExpansion
  productId="prod_123"
  productName="Smart Insoles for AirTag"
  basePrice={1499}
  baseStock={100}
  baseSku="B0FV7VYCLX"
  variants={product.variants}
  salesData={{
    'B0FV8BP244': { unitsSold: 0, pageViews: 62042 },
    'B0FV7VN4YT': { unitsSold: 8, pageViews: 0 },
  }}
/>
```

### Seller: Edit Product Modal
```tsx
{editProduct && (
  <ProductVariantsExpansion
    productId={editProduct.id}
    productName={editProduct.name}
    basePrice={editProduct.price}
    baseStock={editProduct.stock}
    baseSku={formSku || undefined}
    variants={editProduct.variants}
  />
)}
```

## Performance Notes

- **Flattening**: Happens on each render. For products with 50+ variants, consider `useMemo`
- **Images**: No lazy loading implemented yet. May affect initial render for image-heavy variants
- **Expansion**: Uses React state, no animation library required

## Future Enhancements

1. **Inline Editing**: Click to edit variant price/stock directly in table
2. **Bulk Actions**: Select multiple variants, update stock in batch
3. **Export**: Download variant details as CSV/Excel
4. **Sorting**: Sort by price, stock, SKU, sales metrics
5. **Filtering**: Filter by availability, low stock, etc.
6. **Image Gallery**: Click variant image to open full gallery modal
7. **Sales Charts**: Visualize variant performance over time (admin)

## Documentation

Full documentation available at: `docs/product-variants-expansion.md`

## Files Changed

1. ✅ `apps/admin/src/components/product-variants-expansion.tsx` (NEW)
2. ✅ `apps/admin/src/app/(admin-panel)/products/page.tsx` (MODIFIED)
3. ✅ `apps/seller/src/components/product-variants-expansion.tsx` (NEW)
4. ✅ `apps/seller/src/app/(seller-panel)/inventory/page.tsx` (MODIFIED)
5. ✅ `docs/product-variants-expansion.md` (NEW)

## Ready for Production

✅ No linter errors
✅ TypeScript types defined
✅ Responsive design tested
✅ Integrated into existing workflows
✅ Documentation complete
✅ Follows existing design system
✅ Handles edge cases (no variants, missing data)

---

## Quick Start

### See It in Action (Admin)
1. Go to Admin Panel → Products
2. Click "View Details" (eye icon) on any product with variants
3. Scroll to "Related to X variations" section
4. Click "Expand" to see full variant table

### See It in Action (Seller)
1. Go to Seller Panel → Inventory
2. Click "Edit" on any product with variants
3. Scroll to bottom of edit form
4. See "Related to X variations" section
5. Click "Expand" to review all variant details
