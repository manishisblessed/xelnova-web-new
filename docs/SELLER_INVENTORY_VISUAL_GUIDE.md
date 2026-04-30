# Seller Inventory Detail Panel - Visual Guide

## Current State (Without Detail Panel)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Inventory                                                                   │
│ Manage your products and stock.                              [+ Add product]│
│                                                                             │
│ ┌─ Search products by name, category or status...                         │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │                    Product List                                          ││
│ ├────────────────────────────────────────────────────────────────────────┤│
│ │ Product     │ Price  │ Stock │ Status   │ Brand    │ Category  │ ... ││
│ ├────────────────────────────────────────────────────────────────────────┤│
│ │[IMG] Wemb...│ ₹12    │ 20    │ ACTIVE   │ Wembley  │ Toys & G..│ 3 ▼││
│ │[IMG] Prod...│ ₹599   │  5    │ ACTIVE   │ Brand 2  │ Clothing │ 2 ▼││
│ │[IMG] Item...│ ₹1,999 │ 15    │ PENDING  │ Brand 3  │ Electron │ 5 ▼││
│ │[IMG] Smart...│ ₹999  │ 45    │ ACTIVE  │ Brand 4  │ Footwear │ 1 ▼││
│ └────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## New State (With Detail Panel Open)

```
┌──────────────────────────────────────────────┬──────────────────────────────┐
│                                              │  Wembley Recharge...         │
│  INVENTORY LIST                              │  Brand: Wembley              │
│  ────────────────────────────────────────   │  Category: Toys & Games      │
│  Product │ Price │ Stock │ Status           │                    [X]       │
│  ────────────────────────────────────────   │                              │
│  [IMG] W...│ ₹12   │ 20   │ ACTIVE          │  [  Product Image (64px H) ]│
│  [IMG] P...│ ₹599  │ 5    │ ACTIVE          │                              │
│  [IMG] I...│ ₹1999 │ 15   │ PENDING         │  ┌────────────┬────────────┐│
│  [IMG] S...│ ₹999  │ 45   │ ACTIVE  ← Open  │  │ ₹12        │ 20 units   ││
│           │       │      │                  │  │ PRICE      │ STOCK      ││
│           │       │      │                  │  ├────────────┼────────────┤│
│           │       │      │                  │  │ ACTIVE     │ PROD-SKU-1 ││
│           │       │      │                  │  │ STATUS     │ SKU        ││
│           │       │      │                  │  └────────────┴────────────┘│
│                                              │                              │
│                                              │  ┌─ Variants ──────────────┐│
│                                              │  │ 📦 Related to 3 vars..  ││
│                                              │  │ [INFO: 1 group] Expand▼ ││
│                                              │  └─────────────────────────┘│
│                                              │                              │
│                                              │  ┌──────────────────────────┐│
│                                              │  │ ✏️ Edit Product          ││
│                                              │  ├──────────────────────────┤│
│                                              │  │ ⏸️ Put On Hold           ││
│                                              │  ├──────────────────────────┤│
│                                              │  │ 🗑️ Delete Product       ││
│                                              │  ├──────────────────────────┤│
│                                              │  │ Close                    ││
│                                              │  └──────────────────────────┘│
│                                              │                              │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

## Expanded Variants View

```
┌──────────────────────────────────────────────┬─────────────────────────────────┐
│                                              │  Wembley Recharge...            │
│  INVENTORY LIST                              │  Brand: Wembley                 │
│  ────────────────────────────────────────   │  Category: Toys & Games         │
│  Product │ Price │ Stock │ Status           │                       [X]       │
│  ────────────────────────────────────────   │                                 │
│                                              │  [  Product Image (64px H) ]   │
│                                              │                                 │
│                                              │  ┌─────────┬─────────────────┐ │
│                                              │  │ ₹12     │ 20 units        │ │
│                                              │  │ PRICE   │ STOCK           │ │
│                                              │  ├─────────┼─────────────────┤ │
│                                              │  │ ACTIVE  │ PROD-SKU-001    │ │
│                                              │  │ STATUS  │ SKU             │ │
│                                              │  └─────────┴─────────────────┘ │
│                                              │                                 │
│                                              │  ┌─ Variants Expanded ────────┐ │
│                                              │  │ 📦 Related to 3 vars...  ▲ │ │
│                                              │  │ [INFO: 1 group] Collapse   │ │
│                                              │  ├────────────────────────────┤ │
│                                              │  │ Image│Variant │SKU  │Price│ │
│                                              │  │ ─────┼────────┼─────┼─────│ │
│                                              │  │[IMG] │Blue/.. │SKU1 │₹12 │ │
│                                              │  │[IMG] │Blue/.. │SKU2 │₹12 │ │
│                                              │  │[IMG] │Blue/.. │SKU3 │₹12 │ │
│                                              │  └────────────────────────────┘ │
│                                              │                                 │
│                                              │  ┌──────────────────────────────┐│
│                                              │  │ ✏️ Edit Product              ││
│                                              │  ├──────────────────────────────┤│
│                                              │  │ ⏸️ Put On Hold               ││
│                                              │  ├──────────────────────────────┤│
│                                              │  │ 🗑️ Delete Product           ││
│                                              │  ├──────────────────────────────┤│
│                                              │  │ Close                        ││
│                                              │  └──────────────────────────────┘│
│                                              │                                 │
└──────────────────────────────────────────────┴─────────────────────────────────┘
```

## Mobile View

```
┌─────────────────────────────────┐
│ Wembley Recharge...       [X]   │ ← Full width panel
│ Brand: Wembley                  │
│ Category: Toys & Games          │
│                                 │
│ [Product Image - Full Width]   │
│                                 │
│ ┌──────────────┬──────────────┐ │
│ │ ₹12          │ 20 units     │ │
│ │ PRICE        │ STOCK        │ │
│ ├──────────────┼──────────────┤ │
│ │ ACTIVE       │ PROD-SKU-001 │ │
│ │ STATUS       │ SKU          │ │
│ └──────────────┴──────────────┘ │
│                                 │
│ 📦 Related to 3 variations [1]  │
│ [INFO: 1 group]         Expand▼│
│                                 │
│ ┌─ Quick Actions ──────────────┐ │
│ │ ✏️ Edit Product              │ │
│ ├──────────────────────────────┤ │
│ │ ⏸️ Put On Hold               │ │
│ ├──────────────────────────────┤ │
│ │ 🗑️ Delete Product           │ │
│ ├──────────────────────────────┤ │
│ │ Close                        │ │
│ └──────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

## Step-by-Step User Interaction

### Step 1: Hover Product Row
```
┌────────────────────────────────────────────────┐
│ [IMG] Wembley Recharge... (cursor here) ← Hover
│ Hint text: "Click to view • Preview available"
└────────────────────────────────────────────────┘
     ↓ Opacity change (visual feedback)
```

### Step 2: Click Product
```
┌────────────────────────────────────────────────┐
│ [IMG] Wembley Recharge...  ← Click
└────────────────────────────────────────────────┘
     ↓
Slide-in animation (0.3s)
Right side of screen → Panel enters
```

### Step 3: Panel Opens
```
Panel slides in from right:

    [SLIDE-IN ANIMATION]
    
────────────────────────────────────────────────────
│ BEFORE              │ DURING        │ AFTER      │
│ List visible        │ Panel slides  │ List + Panel
│ Only                │ into view     │ Both visible
│                     │               │             
│                     │    x:'100%'   │ x:'0'      │
│                     │    x:'50%'    │ opacity:1  │
│                     │    opacity:0  │             
│                     │    opacity:0.5│            │
────────────────────────────────────────────────────
```

### Step 4: User Expands Variants
```
User sees:
📦 Related to 3 variations [INFO: 1 group] Expand ▼

Click "Expand" button ↓

Panel content updates (no animation):
- Button text changes to "Collapse ▲"
- Variants table appears
- Content becomes scrollable if needed
```

### Step 5: User Takes Action
```
User clicks one of:

[✏️ Edit Product]     →  Opens edit modal
                          Closes detail panel
                          
[⏸️ Put On Hold]      →  Updates product status
                          Closes detail panel
                          
[🗑️ Delete Product]   →  Shows delete confirmation
                          Closes detail panel
```

### Step 6: Close Panel
```
User clicks:
- [Close] button in panel  → Slide out animation (0.3s)
- Background NOT clickable → Must click Close button

Panel slides out to right:

────────────────────────────────────────
│ OPEN STATE    │ CLOSING         │ CLOSED
│ x:'0'         │ x:'0%' → '100%' │ Only list
│ opacity:1     │ opacity:1 → 0   │ Panel gone
│               │ (0.3s)          │
────────────────────────────────────────

Result: Back to original inventory view
```

## Color & Status Indicators

### Product Status in Panel

```
┌─────────────────────┐
│ Status Badge        │
├─────────────────────┤
│ ✅ ACTIVE           │ Green
│ ⏸️ ON_HOLD          │ Yellow/Orange
│ ⏳ PENDING          │ Yellow/Blue
│ ❌ REJECTED         │ Red
│ 📝 DRAFT            │ Gray
└─────────────────────┘
```

### Stock Level Indicators

```
Stock Field:
┌──────────────────────┐
│ 45 units             │ Normal (green text)
│ 5 units              │ Low stock (red text)
│ 3 units              │ Low stock (red text)
│ 1 unit  🔴           │ Low stock (red text + icon)
│ 0 units  🔴          │ Out of stock
└──────────────────────┘
```

## Animation Details

### Slide-In (Opening)
```css
initial:   {x: '100%', opacity: 0}
animate:   {x: 0,      opacity: 1}
duration:  0.3s
easing:    default (ease-in-out)
```

### Slide-Out (Closing)
```css
exit:      {x: '100%', opacity: 0}
duration:  0.3s
easing:    default (ease-in-out)
```

### Result
- Smooth, professional appearance
- Non-jarring, familiar pattern (like mobile apps)
- Fast enough to feel responsive
- Slow enough to be clear what's happening

## Keyboard Navigation (Future)

Current: Mouse/touch only

Future implementation could add:
- `Escape` key → Close panel
- `Tab` → Navigate through buttons
- `Enter` → Activate focused button
- `Arrow keys` → Scroll variants table

## Accessibility

Current implementation:
- ✅ Semantic HTML structure
- ✅ `aria-label` on close button
- ✅ Button roles and labels clear
- ✅ Color not only indicator (badges + text)
- ❌ Keyboard navigation (future enhancement)
- ❌ Screen reader optimization (future enhancement)

## Performance Considerations

- Panel rendering: O(1) - Static content from already-loaded product
- No additional API calls when opening panel
- Variants table: Only rendered when expanded
- Images: Already cached from list view
- Animations: Hardware-accelerated CSS transforms
- No performance impact on list scrolling

## Browser Compatibility

- Modern browsers only (React 18+, Framer Motion v4+)
- CSS: `position: fixed`, `z-index`
- JavaScript: ES6+ features
- Animation: Will degrade gracefully if JS disabled (static positioning)
