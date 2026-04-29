# Product Variants Expansion Component

An Amazon Seller Central-style expandable variant display for product management interfaces.

## Features

- **Expandable/Collapsible Interface**: Click to expand and view all product variants in a detailed table
- **Comprehensive Variant Details**: Shows SKU, price, MRP, stock, images, and availability status for each variant
- **Responsive Design**: Desktop table view and mobile-friendly card layout
- **Low Stock Indicators**: Automatically highlights variants with stock ≤ 5
- **Sales Data Integration** (Admin panel): Optional sales metrics (units sold, page views) per variant
- **Single-SKU Support**: Gracefully displays single-SKU products without variants

## Usage

### Admin Panel

```tsx
import { ProductVariantsExpansion } from '@/components/product-variants-expansion';

<ProductVariantsExpansion
  productId={product.id}
  productName={product.name}
  basePrice={product.price}
  baseStock={product.stock}
  baseSku={product.sku}
  variants={product.variants}
  salesData={{
    'SKU-001': {
      unitsSold: 150,
      pageViews: 3420,
      salesRank: 42,
    },
    'SKU-002': {
      unitsSold: 89,
      pageViews: 1876,
    },
  }}
/>
```

### Seller Panel

```tsx
import { ProductVariantsExpansion } from '@/components/product-variants-expansion';

<ProductVariantsExpansion
  productId={product.id}
  productName={product.name}
  basePrice={product.price}
  baseStock={product.stock}
  baseSku={product.sku}
  variants={product.variants}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | Yes | Unique product identifier |
| `productName` | `string` | Yes | Product name for context |
| `basePrice` | `number` | No | Base product price (fallback for variants without price) |
| `baseStock` | `number` | No | Base product stock (fallback for variants without stock) |
| `baseSku` | `string` | No | Base product SKU |
| `variants` | `unknown` | Yes | Product variants JSON (follows the `VariantGroup` structure) |
| `salesData` | `Record<string, SalesMetrics>` | No | Optional sales metrics per SKU (admin only) |
| `className` | `string` | No | Additional CSS classes |

## Variant Data Structure

The component expects variants in the following format:

```typescript
type VariantGroup = {
  type?: string;          // e.g., "color", "size", "other"
  label?: string;         // Display label (e.g., "Colour", "Size")
  defaultLabel?: string;  // Label for base product option
  options?: VariantOption[];
  sizeChart?: SizeChartRow[];
};

type VariantOption = {
  value?: string;         // Slug value
  label?: string;         // Display name
  available?: boolean;    // Availability status
  hex?: string;           // Color hex code (for color variants)
  images?: string[];      // Variant-specific images
  price?: number;         // Override price
  compareAtPrice?: number; // Override MRP
  stock?: number;         // Override stock
  sku?: string;           // Unique SKU
};
```

## Features by View

### Desktop Table View
- Full table with sortable columns
- Thumbnail images (12x12 grid)
- Inline stock indicators
- Status badges
- Sales metrics (if provided)

### Mobile Card View
- Stacked card layout
- Larger images (16x16)
- Key details grid
- Touch-friendly interactions

## Integration Points

### In Admin Product Review Modal
Located in `apps/admin/src/app/(admin-panel)/products/page.tsx`:
- Added after the `VariantsPreview` component
- Shows detailed variant table for product approval workflow

### In Seller Inventory Edit Modal
Located in `apps/seller/src/app/(seller-panel)/inventory/page.tsx`:
- Added at the bottom of the edit form
- Helps sellers review all variant details while editing

## Styling

The component uses Tailwind CSS with your design system tokens:
- `text-text-primary`, `text-text-secondary`, `text-text-muted`
- `bg-surface`, `bg-surface-muted`, `border-border`
- `text-primary-600`, `text-danger-600`, `text-success-600`
- Responsive breakpoints: `lg:` for desktop layouts

## Accessibility

- Semantic HTML table structure
- Clear button labels and ARIA attributes
- Keyboard navigation support
- Screen reader friendly status indicators

## Examples

### Single-SKU Product
If a product has no variants, the component displays:
```
┌─────────────────────────────────────┐
│ 📦 Single-SKU product (no variants) │
│ SKU: PROD-12345                     │
└─────────────────────────────────────┘
```

### Multi-Variant Product (Collapsed)
```
┌──────────────────────────────────────────────────┐
│ 📦 Related to 6 variations [INFO Badge]   Expand│
└──────────────────────────────────────────────────┘
```

### Multi-Variant Product (Expanded)
```
┌──────────────────────────────────────────────────┐
│ 📦 Related to 6 variations [INFO Badge] Collapse│
├──────────────────────────────────────────────────┤
│ Image │ Variant    │ SKU     │ Price  │ Stock... │
├──────────────────────────────────────────────────┤
│ [IMG] │ Red / S    │ SKU-001 │ ₹1,499 │   45 ... │
│ [IMG] │ Red / M    │ SKU-002 │ ₹1,499 │    3 ... │ Low stock
│ [IMG] │ Blue / S   │ SKU-003 │ ₹1,599 │   23 ... │
│ ...                                                │
└──────────────────────────────────────────────────┘
```

## Notes

- **Performance**: The component flattens nested variant groups on each render. For products with 100+ variants, consider memoizing the flattened result.
- **Stock Warnings**: Low stock threshold is hard-coded to 5 units. Adjust `isLowStock` logic if needed.
- **Image Optimization**: Variant images are displayed as-is. Consider adding lazy loading or CDN optimization for large catalogs.

## Future Enhancements

- [ ] Inline variant editing (price, stock updates)
- [ ] Bulk actions (select multiple variants, update stock)
- [ ] Export to CSV/Excel
- [ ] Variant-level sales trends chart
- [ ] Sorting and filtering options
