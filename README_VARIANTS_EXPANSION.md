# Product Variants Expansion Feature

## 📦 Overview

A comprehensive Amazon Seller Central-style expandable variant display system for Xelnova's product management interfaces. Allows admins and sellers to view detailed variant information (SKU, price, stock, images, sales data) in a clean, expandable table format.

## ✨ Features

- **Expandable/Collapsible UI**: Click to expand and view all product variants
- **Detailed Variant Information**: SKU, price, MRP, stock, images, availability
- **Sales Data Integration**: Optional units sold and page views (admin only)
- **Responsive Design**: Desktop table view + mobile card layout
- **Low Stock Warnings**: Automatic highlighting for variants with stock ≤ 5
- **Single-SKU Support**: Graceful display for products without variants
- **Type-Safe**: Full TypeScript support
- **Zero Dependencies**: Built with React and Tailwind CSS

## 🚀 Quick Start

### Installation

The components are already integrated into your project:

- **Admin**: `apps/admin/src/components/product-variants-expansion.tsx`
- **Seller**: `apps/seller/src/components/product-variants-expansion.tsx`

### Basic Usage (Seller)

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

### Advanced Usage (Admin with Sales Data)

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
      unitsSold: 128,
      pageViews: 15234,
      salesRank: 42,
    },
    'SKU-002': {
      unitsSold: 89,
      pageViews: 8456,
    },
  }}
/>
```

## 📋 Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | ✅ | Unique product identifier |
| `productName` | `string` | ✅ | Product name |
| `basePrice` | `number` | ❌ | Fallback price for variants |
| `baseStock` | `number` | ❌ | Fallback stock for variants |
| `baseSku` | `string` | ❌ | Base product SKU |
| `variants` | `unknown` | ✅ | Product variants JSON |
| `salesData` | `Record<string, SalesMetrics>` | ❌ | Sales metrics per SKU (admin only) |
| `className` | `string` | ❌ | Additional CSS classes |

## 📂 Project Structure

```
.
├── apps/
│   ├── admin/
│   │   └── src/
│   │       ├── components/
│   │       │   └── product-variants-expansion.tsx  ✨ NEW
│   │       └── app/
│   │           └── (admin-panel)/
│   │               └── products/
│   │                   └── page.tsx  📝 MODIFIED
│   └── seller/
│       └── src/
│           ├── components/
│           │   └── product-variants-expansion.tsx  ✨ NEW
│           └── app/
│               └── (seller-panel)/
│                   └── inventory/
│                       └── page.tsx  📝 MODIFIED
└── docs/
    ├── product-variants-expansion.md        ✨ Component docs
    ├── IMPLEMENTATION_SUMMARY.md            ✨ Implementation guide
    ├── VISUAL_COMPARISON.md                 ✨ Amazon comparison
    └── VISUAL_MOCKUPS.md                    ✨ ASCII mockups
```

## 🎯 Integration Points

### Admin Panel
- **Location**: Product review modal
- **Path**: `/products` → Click "View Details" (eye icon)
- **Context**: Appears after product details for variant verification
- **Features**: Sales data columns (units sold, page views)

### Seller Panel
- **Location**: Product edit modal
- **Path**: `/inventory` → Click "Edit" button
- **Context**: Bottom of edit form for variant review
- **Features**: Price, MRP, stock management

## 🖼️ Visual Examples

### Desktop - Collapsed
```
┌─────────────────────────────────────────────┐
│ 📦 Related to 6 variations [INFO]   Expand ▼│
└─────────────────────────────────────────────┘
```

### Desktop - Expanded
```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Related to 6 variations [INFO: 2 groups]    Collapse ▲  │
├─────────────────────────────────────────────────────────────┤
│ Image | Variant    | SKU     | Price   | Stock | Status   │
│ [IMG] | Red / S    | SKU-001 | ₹1,499  |   45  | ✅ Active │
│ [IMG] | Red / M    | SKU-002 | ₹1,499  |    3🔴| ✅ Active │
│ [IMG] | Blue / S   | SKU-003 | ₹1,599  |   23  | ✅ Active │
│ [IMG] | Blue / M   | SKU-004 | ₹1,599  |   67  | ✅ Active │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Mobile - Card View
```
┌─────────────────────────┐
│ [IMAGE]  Red / Small    │
│          [✅ Active]     │
│                         │
│ SKU:   SKU-001          │
│ Price: ₹1,499           │
│ Stock: 45               │
├─────────────────────────┤
│ [IMAGE]  Red / Medium   │
│          [✅ Active]     │
│                         │
│ SKU:   SKU-002          │
│ Price: ₹1,499           │
│ Stock: 3 (Low) 🔴       │
└─────────────────────────┘
```

## 📖 Documentation

### Quick Links
- 📘 [Full Component Documentation](./docs/product-variants-expansion.md)
- 📊 [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md)
- 🔍 [Visual Comparison with Amazon](./docs/VISUAL_COMPARISON.md)
- 🎨 [Visual Mockups](./docs/VISUAL_MOCKUPS.md)

### Key Concepts

#### Variant Flattening
The component automatically flattens nested variant groups into individual rows:

```typescript
// Input: Nested variant groups
variants = [
  {
    type: 'color',
    label: 'Colour',
    options: [{ label: 'Red' }, { label: 'Blue' }]
  },
  {
    type: 'size',
    label: 'Size',
    options: [{ label: 'Small' }, { label: 'Medium' }]
  }
]

// Output: Flattened rows
[
  { attributePath: 'Red / Small', ... },
  { attributePath: 'Red / Medium', ... },
  { attributePath: 'Blue / Small', ... },
  { attributePath: 'Blue / Medium', ... },
]
```

#### Low Stock Detection
Variants with `stock ≤ 5` are automatically flagged:

```tsx
const isLowStock = variant.stock !== undefined && variant.stock <= 5;

// Visual indicators:
// - Red text color
// - "Low stock" label
// - Alert icon (optional)
```

#### Responsive Breakpoint
- **Desktop** (`lg:` / 1024px+): Table layout
- **Mobile** (< 1024px): Card layout

## 🎨 Styling

Uses Tailwind CSS with design system tokens:

```tsx
// Colors
text-text-primary      // Main text
text-text-secondary    // Subdued text
text-text-muted        // Helper text
bg-surface             // Background
bg-surface-muted       // Muted background
border-border          // Border color
text-primary-600       // Brand primary
text-danger-600        // Danger/error
text-success-600       // Success

// Responsive
lg:block               // Desktop only
lg:hidden              // Mobile only
```

## ✅ Testing

### Manual Testing Checklist
- [x] Single-SKU products show appropriate message
- [x] Multi-variant products expand/collapse correctly
- [x] Low stock warnings display at threshold
- [x] Missing images show placeholder
- [x] Fallback to base price/stock works
- [x] Mobile card layout renders properly
- [x] Desktop table layout is readable
- [x] Sales data appears in admin view
- [x] Component handles malformed data gracefully

### Test Cases

```typescript
// Test 1: Single-SKU product
<ProductVariantsExpansion
  productId="test-1"
  productName="Simple Product"
  variants={null}  // No variants
/>
// Expected: Shows "Single-SKU product (no variants)"

// Test 2: Multi-variant product
<ProductVariantsExpansion
  productId="test-2"
  productName="T-Shirt"
  variants={[
    {
      type: 'color',
      options: [
        { label: 'Red', sku: 'SKU-R', price: 499, stock: 10 },
        { label: 'Blue', sku: 'SKU-B', price: 499, stock: 3 },
      ]
    }
  ]}
/>
// Expected: Shows expandable section with 2 variants
// Expected: Blue variant shows low stock warning

// Test 3: Missing variant data
<ProductVariantsExpansion
  productId="test-3"
  productName="Incomplete Product"
  basePrice={999}
  baseStock={50}
  variants={[
    {
      type: 'size',
      options: [
        { label: 'Small', sku: 'SKU-S' },  // No price/stock
      ]
    }
  ]}
/>
// Expected: Uses basePrice (₹999) and baseStock (50) as fallback
```

## 🚧 Future Enhancements

### Planned Features
1. **Inline Editing**: Click variant to edit price/stock in-place
2. **Bulk Actions**: Select multiple variants for batch updates
3. **Export**: Download variant data as CSV/Excel
4. **Sorting**: Sort by any column (price, stock, sales)
5. **Filtering**: Filter by availability, stock level, etc.
6. **Image Gallery**: Click image to open full-screen gallery
7. **Sales Charts**: Visualize variant performance over time

### Code Improvements
1. **Memoization**: Use `useMemo` for large variant lists (50+)
2. **Virtualization**: Implement virtual scrolling for 100+ variants
3. **Lazy Loading**: Load images on-demand
4. **Skeleton Loading**: Show skeleton UI while loading data
5. **Error Boundaries**: Catch and display variant rendering errors

## 🐛 Troubleshooting

### Issue: Variants not showing
**Cause**: Variants data is malformed or empty
**Solution**: Check that `variants` prop is an array of variant groups

### Issue: Low stock not highlighting
**Cause**: Stock threshold mismatch
**Solution**: Verify `isLowStock` logic uses correct threshold (default: 5)

### Issue: Images not loading
**Cause**: Invalid image URLs or CORS issues
**Solution**: Verify image URLs are accessible and CORS-enabled

### Issue: Sales data not appearing
**Cause**: Missing or mismatched SKUs
**Solution**: Ensure `salesData` keys match variant SKUs exactly

## 🤝 Contributing

### Adding New Columns (Desktop)

```tsx
// 1. Add to table header
<th className="px-4 py-2.5 text-left">New Column</th>

// 2. Add to table body
<td className="px-4 py-3">
  {variant.newField || '—'}
</td>

// 3. Add to mobile card (optional)
<div>
  <p className="text-text-muted">New Field</p>
  <p className="font-medium">{variant.newField}</p>
</div>
```

### Customizing Styles

```tsx
// Pass custom className
<ProductVariantsExpansion
  {...props}
  className="my-8 shadow-xl"
/>

// Or modify component styles directly
// File: apps/admin/src/components/product-variants-expansion.tsx
```

## 📝 License

This component is part of the Xelnova platform and follows the project's licensing.

## 🙋 Support

For questions or issues:
1. Check documentation in `/docs` folder
2. Review implementation examples
3. Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: April 29, 2026  
**Author**: Xelnova Development Team
