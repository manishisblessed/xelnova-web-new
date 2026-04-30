# Seller Inventory - Product Detail Panel

## Overview

Added a **slide-out product detail panel** on the seller inventory page that displays when sellers click on any product in the list. This gives sellers quick access to:

- 📦 **Product Overview** - Name, brand, category, images
- 💰 **Pricing & Stock** - Current price, MRP, available stock
- 📊 **Variant Details** - Expandable table showing all variants with details
- ⚡ **Quick Actions** - Edit, activate/hold, delete

## User Flow

### Step 1: View Inventory
```
Seller navigates to: seller.xelnova.in/inventory
↓
Sees list of products with columns:
- Product (with image)
- Price
- Stock
- Status
- Brand
- Category
- Variants (shows count)
- Created date
```

### Step 2: Click Product
```
Seller clicks on ANY product row (specifically the product name/image area)
↓
Right slide-out panel opens with:
- Product image
- Key details (price, stock, status, SKU)
- Expandable variants table
- Quick action buttons
```

### Step 3: View Variants
```
In the detail panel, variants section:
- Click "Expand" to see full variant table
- View all variant details without opening edit modal
- See: Images, variant names, SKUs, prices, MRP, stock, status
```

### Step 4: Take Action
```
From the detail panel, seller can:
- ✏️ Edit Product → Opens full edit modal
- ⏸️ Put On Hold → Pauses product listing
- ▶️ Activate → Re-activates paused product
- 🗑️ Delete Product → Removes from catalog
- ❌ Close → Returns to inventory list
```

## Visual Structure

### Desktop Layout

```
INVENTORY LIST                          | PRODUCT DETAIL PANEL
─────────────────────────────────────  | ──────────────────────────
Product | Price | Stock | Status       | ╭─ Product Name
Row 1   | ₹999  |  45   | ACTIVE       | │  Brand: X | Category: Y
Row 2   | ₹1499 |   3   | ACTIVE   ← Click
Row 3   | ₹599  |  67   | ACTIVE       | ├─ [Product Image]
Row 4   | ₹899  |  12   | ON_HOLD      | │
                                       | ├─ Price Grid (4 cols)
                                       | │  Price  │  Stock
                                       | │  ₹1,499 │  3 units (Low)
                                       | │  Status │  SKU
                                       | │  ACTIVE │ PROD-SKU-001
                                       | │
                                       | ├─ Variants Section
                                       | │  📦 Related to 6 variations [2 groups]
                                       | │     Expand ▼
                                       | │
                                       | ├─ Quick Actions
                                       | │  [✏️ Edit Product]
                                       | │  [⏸️ Put On Hold]
                                       | │  [🗑️ Delete Product]
                                       | │
                                       | └─ [❌ Close]
```

### Expanded Variants View

```
PRODUCT DETAIL PANEL (Variants Expanded)
──────────────────────────────────────────────────────
Product Name
Brand: X | Category: Y

[Product Image]

Price Grid
┌─────────┬────────┐
│ ₹1,499  │ Stock  │
│ (Price) │ 3 units│
└─────────┴────────┘

Variants Section
📦 Related to 6 variations [INFO: 2 groups] Collapse ▲

┌──────────────────────────────────────────────────────┐
│ Image │ Variant    │ SKU     │ Price  │ Stock │Status│
├──────────────────────────────────────────────────────┤
│ [IMG] │ Red / S    │ SKU-001 │ ₹1,499 │   45  │ ✅   │
│ [IMG] │ Red / M    │ SKU-002 │ ₹1,499 │    3🔴│ ✅   │
│ [IMG] │ Blue / S   │ SKU-003 │ ₹1,599 │   23  │ ✅   │
│ [IMG] │ Blue / M   │ SKU-004 │ ₹1,599 │   67  │ ✅   │
│ [IMG] │ Green / S  │ SKU-005 │ ₹1,549 │   12  │ ✅   │
│ [IMG] │ Green / M  │ SKU-006 │ ₹1,549 │   34  │ ✅   │
└──────────────────────────────────────────────────────┘

Quick Actions
┌────────────────────────────────┐
│ ✏️ Edit Product               │
├────────────────────────────────┤
│ ⏸️ Put On Hold                 │
├────────────────────────────────┤
│ 🗑️ Delete Product             │
├────────────────────────────────┤
│ Close                          │
└────────────────────────────────┘
```

## Features

### Product Overview Card
- Product name (large, bold)
- Brand and category (small text)
- Close button (X) in top-right

### Product Image
- Shows first product image
- Full width in panel
- Rounded corners with border

### Info Grid (2x2)
| Item | Details |
|------|---------|
| **Price** | Selling price (bold) + MRP (strikethrough if different) |
| **Stock** | Quantity + low stock warning if ≤5 |
| **Status** | Status badge (ACTIVE, ON_HOLD, PENDING, etc.) |
| **SKU** | Base product SKU in monospace code format |

### Variants Section
- **Component**: `ProductVariantsExpansion` (reusable)
- **Default**: Collapsed state showing summary
- **Expanded**: Full table of all variants with:
  - Thumbnail images
  - Variant attributes combined (e.g., "Red / Large")
  - SKU codes
  - Individual prices (if different from base)
  - Individual stock levels
  - Availability status badges
  - Low stock warnings (red if ≤5)

### Quick Actions
- **Edit Product**: Opens full edit modal (same as Edit button in table)
- **Activate/Hold**: Toggle product status (if applicable)
- **Delete Product**: Confirmation dialog then delete
- **Close**: Close panel and return to list

## Animation

### Slide-In Animation
- **Direction**: From right
- **Duration**: 0.3 seconds
- **Effect**: Smooth slide with fade-in
- **Library**: Framer Motion (`motion.div`, `AnimatePresence`)

```typescript
initial={{ x: '100%', opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
exit={{ x: '100%', opacity: 0 }}
transition={{ duration: 0.3 }}
```

### Interaction States
- **Hover**: Product row opacity changes
- **Click**: Panel opens with animation
- **Close**: Panel slides out with animation
- **Action**: Quick action buttons trigger appropriate modals

## Mobile Responsiveness

### Mobile Layout
- Panel uses `max-w-2xl` constraint
- On small screens, panel takes full width with slide animation
- Touch-friendly buttons and spacing
- Vertical scrolling for long content

```css
/* Desktop */
max-w-2xl

/* Mobile */
Full width with animation from right
```

## Integration with Existing Features

### Edit Product
```
Click "Edit Product" button in panel
  ↓
Close product detail panel
  ↓
Open edit modal (existing flow)
  ↓
Seller edits and saves
  ↓
Product detail panel auto-refreshes (if reopened)
```

### Activate/Hold Toggle
```
Click "Activate" or "Put On Hold" button
  ↓
API call to update product status
  ↓
Close product detail panel
  ↓
Inventory list updates
  ↓
Seller sees new status in list
```

### Delete Product
```
Click "Delete Product" button
  ↓
Close product detail panel
  ↓
Show delete confirmation modal (existing)
  ↓
Seller confirms
  ↓
Product deleted
  ↓
Inventory list refreshes
```

## State Management

```typescript
// New state variable
const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);

// When user clicks product
setSelectedProduct(row);

// When user closes panel
setSelectedProduct(null);

// When user takes action (edit, delete, etc.)
// Close panel: setSelectedProduct(null)
```

## Code Changes

### File: `apps/seller/src/app/(seller-panel)/inventory/page.tsx`

1. **Added state**:
   ```typescript
   const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
   ```

2. **Updated product name column**:
   - Changed from link to button
   - Clicking now opens detail panel
   - Text says "Click to view" as hint

3. **Added detail panel component**:
   - Uses `AnimatePresence` and `motion.div` from Framer Motion
   - Fixed positioning on right side
   - Conditionally renders when `selectedProduct` is not null
   - Includes all sections: overview, image, grid, variants, actions

4. **No changes to existing modals**:
   - Edit modal still works
   - Delete confirmation still works
   - Create product modal still works

## Benefits for Sellers

✅ **Quick Preview** - See product details without opening full edit modal  
✅ **Variant Overview** - Easily view all variants and their details  
✅ **Fast Actions** - Quick access to edit, hold, or delete without navigating  
✅ **Low Stock Alert** - Immediately see which variants need restocking  
✅ **Better UX** - Familiar slide-out panel pattern (like mobile apps)  
✅ **Non-Intrusive** - Doesn't replace list view, just overlays on the side  

## Known Limitations

- ⚠️ Detail panel doesn't auto-refresh after edit (user closes and reopens to see changes)
- ⚠️ No inline variant editing from detail panel (use full edit modal for changes)
- ⚠️ Images must load from URLs (no preview while uploading)

## Future Enhancements

- [ ] Auto-refresh detail panel after edit/delete operations
- [ ] Inline variant price/stock editing from detail panel
- [ ] Quick stock update input field in detail panel
- [ ] Product performance metrics (views, sales, ratings)
- [ ] Similar products / recommendations section
- [ ] Recent activity log for product
- [ ] Pin/favorite products in panel

## Files Modified

- `apps/seller/src/app/(seller-panel)/inventory/page.tsx`
  - Added `selectedProduct` state (1 line)
  - Updated product name column to open panel on click (~30 lines)
  - Added detail panel JSX with animation, info grid, variants, actions (~150 lines)

## Testing Checklist

- [x] Seller app compiles without errors
- [ ] Click on product row opens detail panel
- [ ] Panel slides in from right smoothly
- [ ] Product image displays correctly
- [ ] Price/stock/status grid shows correct values
- [ ] Low stock warning shows when stock ≤ 5
- [ ] Variants section expandable and displays all variants
- [ ] Edit button opens edit modal
- [ ] Activate/hold button toggles status
- [ ] Delete button shows confirmation
- [ ] Close button closes panel
- [ ] Clicking outside panel does NOT close (only close button)
- [ ] Mobile view: panel takes full width

## Next Steps

1. ✅ Seller app build successful
2. Test the feature in development: `seller.xelnova.in/inventory`
3. Click on any product to see new detail panel
4. Verify all actions work correctly
5. Gather seller feedback on UX
6. Consider mobile testing
