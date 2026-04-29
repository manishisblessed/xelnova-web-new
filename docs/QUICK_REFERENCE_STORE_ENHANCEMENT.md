# Quick Reference - Store Enhancement

## What's New?

### 🆕 Enhanced Product Card
- File: `apps/web/src/app/stores/[slug]/store-product-card-enhanced.tsx`
- Shows product variants at a glance with preview images on hover
- Used in: Store Products, Featured Products, Best Sellers, Deals

### ✨ Better "Visit Store" Button
- Location: Product Detail Page
- Now has gradient styling, tracking params, smooth hover effects
- Links to store with UTM tracking: `?utm_source=pdp&utm_medium=visit-store`

### 📐 Responsive Grid
- Old: 5-column (cramped)
- New: 1-4 responsive columns
- Better spacing and visual hierarchy

---

## Using the Enhanced Card

### Basic Usage
```tsx
import { StoreProductCardEnhanced } from './store-product-card-enhanced';

<StoreProductCardEnhanced 
  product={product} 
  index={0} 
/>
```

### Component Props
```tsx
interface StoreProductCardEnhancedProps {
  product: Product;        // Product data with variants
  index?: number;          // For staggered animation
}
```

### Features
- ✅ Displays variant count badges (e.g., "5 Colours")
- ✅ Shows variant images on hover
- ✅ Product rating and reviews
- ✅ Bestseller/Top Rated badges
- ✅ Discount and free delivery badges
- ✅ Wishlist integration
- ✅ Quick Add to Cart
- ✅ View Details link

---

## Variant Badge System

### Supported Variants
```
color/colour     → "Colours"
size             → "Sizes"
pattern          → "Patterns"
material         → "Materials"
style            → "Styles"
flavor/flavour   → "Flavours"
scent            → "Scents"
storage          → "Storage"
ram              → "RAM Options"
capacity         → "Capacities"
```

### How It Works
1. **Scan** product.variants array
2. **Filter** available options
3. **Count** unique options per axis
4. **Display** badge with count and label
5. **Show** up to 3 variant types

---

## Grid Layouts

### Responsive Breakpoints
```tsx
className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

Breakpoints:
- grid-cols-1      : < 640px (mobile)
- sm:grid-cols-2   : ≥ 640px (tablet)
- lg:grid-cols-3   : ≥ 1024px (desktop)
- xl:grid-cols-4   : ≥ 1280px (large)

Gap: gap-6 (24px) - comfortable spacing
```

---

## Files Changed

### Modified
1. `product-detail.tsx` - Button styling & tracking
2. `store-featured.tsx` - Uses new card component
3. `store-products.tsx` - Uses new card component
4. `store-page.tsx` - Better layout & transitions
5. `header.tsx` - Minor location fixes

### Created
1. `store-product-card-enhanced.tsx` - New card component

---

## Styling Reference

### Buttons
```tsx
// Visit Store Button
className="bg-gradient-to-r from-primary-50 to-primary-100 
           border border-primary-200 
           hover:from-primary-100 hover:to-primary-200
           hover:border-primary-300 
           shadow-sm hover:shadow-md 
           transition-all duration-300"

// View Details Button (on card)
className="bg-gradient-to-r from-primary-50 to-primary-100 
           border border-primary-200 
           hover:from-primary-100 hover:to-primary-200 
           transition-all"
```

### Variant Badges
```tsx
className="from-purple-50 to-pink-50 
           border border-purple-100 
           hover:from-purple-100 hover:to-pink-100 
           text-purple-700
           inline-flex items-center gap-1"
```

### Cards
```tsx
className="rounded-2xl border border-white/80 
           bg-white 
           shadow-lg hover:shadow-2xl 
           transition-all duration-300 
           ring-1 ring-primary-100/30 
           hover:ring-primary-200/50"
```

---

## Animations

### Staggered Entry
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ 
  duration: 0.4, 
  delay: index * 0.05,  // Stagger by 50ms
  ease: [0.16, 1, 0.3, 1] 
}}
```

### Hover Effects
- Image: scale-110 (slight zoom)
- Icon: scale-110 (on hover)
- Button: translate-y-0 (from translate-y-4)

---

## Analytics

### Tracking Parameters
```
URL: /stores/[slug]?utm_source=pdp&utm_medium=visit-store

utm_source = pdp        // Product Detail Page
utm_medium = visit-store // Interaction type
```

### Usage
```tsx
href={`/stores/${slug}?utm_source=pdp&utm_medium=visit-store`}
```

---

## Performance Tips

### Do's ✅
- Use memoization: `memo(StoreProductCardEnhanced)`
- Lazy load images: `loading={index < 4 ? 'eager' : 'lazy'}`
- Stagger animations: `delay: index * 0.05`
- Filter data efficiently: `.filter((o) => o?.available !== false)`

### Don'ts ❌
- Don't re-render full card on hover state changes
- Don't load all variant images at once
- Don't animate without delays
- Don't pass new objects as props

---

## Common Tasks

### Add Variant Badge Support for New Type
1. Add to `VARIANT_LABELS` object:
```tsx
const VARIANT_LABELS: Record<string, string> = {
  // ... existing
  newvariant: 'New Variants',  // Add here
};
```

### Change Grid Columns
```tsx
// Before: xl:grid-cols-5
className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"

// After: xl:grid-cols-4
className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

### Change Card Spacing
```tsx
// Gap between cards
gap-4  // 16px (current: old layout)
gap-6  // 24px (current: new layout)
```

### Modify Badge Colors
```tsx
// Variant badges
from-purple-50 to-pink-50      // Current
from-blue-50 to-indigo-50      // Alternative
from-emerald-50 to-teal-50     // Alternative
```

---

## Testing

### Manual Testing Checklist
- [ ] Product card loads with image
- [ ] Hover shows variant images overlay
- [ ] Variant badges display correctly
- [ ] Wishlist heart works
- [ ] Quick Add button works
- [ ] View Details link works
- [ ] Grid responsive on mobile/tablet/desktop
- [ ] Animations smooth
- [ ] No console errors

### Automated Tests
```bash
# Check for linting errors
npm run lint

# Check for type errors
npm run type-check

# Run tests
npm run test
```

---

## Troubleshooting

### Variant Images Not Showing
1. Check product.variants array structure
2. Ensure images URLs are valid
3. Check browser console for 404s

### Grid Not Responsive
1. Ensure Tailwind breakpoints configured
2. Check media queries are working
3. Verify grid-cols classes applied

### Animations Stuttering
1. Reduce number of animated elements
2. Increase delay between staggered items
3. Check CPU usage in DevTools

### Buttons Not Working
1. Check href props
2. Verify Link component imported
3. Check onClick handlers

---

## Commit History

```
5f91201 - feat: enhance store page with creative product display and variant visibility
```

---

## Support

For questions or issues:
1. Check documentation: `/docs/STORE_PAGE_ENHANCEMENT.md`
2. Review component: `store-product-card-enhanced.tsx`
3. Check example usage: `store-featured.tsx`, `store-products.tsx`

---

**Last Updated**: Apr 29, 2026
**Status**: ✅ Production Ready
