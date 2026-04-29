# Visual Mockups: Product Variants Expansion

## Desktop View - Collapsed State

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Product Details Section (Above)                               ┃
┃  - Images                                                       ┃
┃  - Description                                                  ┃
┃  - Brand info                                                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ┌─────────────────────────────────────────────────────────┐  ┃
┃  │ 📦 Related to 6 variations    [ℹ 2 groups]        Expand│  ┃
┃  │                                                          ▼│  ┃
┃  └─────────────────────────────────────────────────────────┘  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Desktop View - Expanded State

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ┌──────────────────────────────────────────────────────────────────────┐  ┃
┃  │ 📦 Related to 6 variations        [ℹ 2 groups]         Collapse ▲   │  ┃
┃  ├──────────────────────────────────────────────────────────────────────┤  ┃
┃  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  ┃
┃  │ ┃ Image │ Variant     │ SKU       │ Price     │ Stock │ Status   ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━┿━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Red / Small │ SKU-R-S-1 │ ₹1,499.00 │   45  │ ✅ Active┃ │  ┃
┃  │ ┃ 🔴    │ COLOUR      │           │           │       │          ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━┿━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Red / Medium│ SKU-R-M-2 │ ₹1,499.00 │    3  │ ✅ Active┃ │  ┃
┃  │ ┃ 🔴    │ COLOUR      │           │           │  🔴   │          ┃ │  ┃
┃  │ ┃       │             │           │           │ Low   │          ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━┿━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Blue / Small│ SKU-B-S-3 │ ₹1,599.00 │   23  │ ✅ Active┃ │  ┃
┃  │ ┃ 🔵    │ COLOUR      │           │           │       │          ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━┿━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Blue / Med. │ SKU-B-M-4 │ ₹1,599.00 │   67  │ ✅ Active┃ │  ┃
┃  │ ┃ 🔵    │ COLOUR      │           │           │       │          ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━┿━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Green/ Small│ SKU-G-S-5 │ ₹1,549.00 │   12  │ ✅ Active┃ │  ┃
┃  │ ┃ 🟢    │ COLOUR      │           │           │       │          ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━━━┿━━━━━━━┿━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Green/ Med. │ SKU-G-M-6 │ ₹1,549.00 │   34  │ ✅ Active┃ │  ┃
┃  │ ┃ 🟢    │ COLOUR      │           │           │       │          ┃ │  ┃
┃  │ ┗━━━━━━━┷━━━━━━━━━━━━━┷━━━━━━━━━━━┷━━━━━━━━━━━┷━━━━━━━┷━━━━━━━━━━┛ │  ┃
┃  └──────────────────────────────────────────────────────────────────────┘  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Legend:
🔴 Low stock warning (≤5 units)
✅ Active status badge
[IMG] Product image thumbnail
```

## Desktop View - Expanded with Sales Data (Admin Only)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ┌──────────────────────────────────────────────────────────────────────────────────────┐  ┃
┃  │ 📦 Related to 6 variations              [ℹ 2 groups]                  Collapse ▲   │  ┃
┃  ├──────────────────────────────────────────────────────────────────────────────────────┤  ┃
┃  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  ┃
┃  │ ┃ Image │ Variant   │ SKU     │ Price  │ Stock │ Status │ Units │ Page Views ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Red / S   │ SKU-001 │ ₹1,499 │   45  │ Active │   128 │    15,234  ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Red / M   │ SKU-002 │ ₹1,499 │ 3 🔴  │ Active │    89 │     8,456  ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Blue / S  │ SKU-003 │ ₹1,599 │   23  │ Active │   234 │    28,901  ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Blue / M  │ SKU-004 │ ₹1,599 │   67  │ Active │   412 │    42,156  ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Green/ S  │ SKU-005 │ ₹1,549 │   12  │ Active │   178 │    19,234  ┃ │  ┃
┃  │ ┣━━━━━━━┿━━━━━━━━━━━┿━━━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━┿━━━━━━━┿━━━━━━━━━━━━┫ │  ┃
┃  │ ┃ [IMG] │ Green/ M  │ SKU-006 │ ₹1,549 │   34  │ Active │   295 │    33,421  ┃ │  ┃
┃  │ ┗━━━━━━━┷━━━━━━━━━━━┷━━━━━━━━━┷━━━━━━━━┷━━━━━━━┷━━━━━━━━┷━━━━━━━┷━━━━━━━━━━━━┛ │  ┃
┃  └──────────────────────────────────────────────────────────────────────────────────────┘  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Mobile View - Collapsed State

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  (Product Details Above)    ┃
┃  - Images                   ┃
┃  - Description              ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ┌─────────────────────────┐┃
┃  │ 📦 Related to           │┃
┃  │    6 variations         │┃
┃  │    [ℹ 2 groups]         │┃
┃  │                         │┃
┃  │           Expand ▼      │┃
┃  └─────────────────────────┘┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Mobile View - Expanded State

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ┌───────────────────────────────────────┐┃
┃  │ 📦 Related to 6 variations            │┃
┃  │    [ℹ 2 groups]           Collapse ▲ │┃
┃  ├───────────────────────────────────────┤┃
┃  │ ┌───────────────────────────────────┐ │┃
┃  │ │  ┌─────┐   Red / Small            │ │┃
┃  │ │  │     │                           │ │┃
┃  │ │  │ IMG │   [✅ Active]             │ │┃
┃  │ │  │     │                           │ │┃
┃  │ │  └─────┘   COLOUR                  │ │┃
┃  │ │                                    │ │┃
┃  │ │  ┌──────────────┬────────────────┐ │ │┃
┃  │ │  │ SKU:         │ SKU-R-S-1      │ │ │┃
┃  │ │  ├──────────────┼────────────────┤ │ │┃
┃  │ │  │ Price:       │ ₹1,499         │ │ │┃
┃  │ │  ├──────────────┼────────────────┤ │ │┃
┃  │ │  │ MRP:         │ ₹2,999         │ │ │┃
┃  │ │  ├──────────────┼────────────────┤ │ │┃
┃  │ │  │ Stock:       │ 45             │ │ │┃
┃  │ │  └──────────────┴────────────────┘ │ │┃
┃  │ ├───────────────────────────────────┤ │┃
┃  │ │  ┌─────┐   Red / Medium           │ │┃
┃  │ │  │     │                           │ │┃
┃  │ │  │ IMG │   [✅ Active]             │ │┃
┃  │ │  │     │                           │ │┃
┃  │ │  └─────┘   COLOUR                  │ │┃
┃  │ │                                    │ │┃
┃  │ │  ┌──────────────┬────────────────┐ │ │┃
┃  │ │  │ SKU:         │ SKU-R-M-2      │ │ │┃
┃  │ │  ├──────────────┼────────────────┤ │ │┃
┃  │ │  │ Price:       │ ₹1,499         │ │ │┃
┃  │ │  ├──────────────┼────────────────┤ │ │┃
┃  │ │  │ Stock:       │ 3 (Low) 🔴     │ │ │┃
┃  │ │  └──────────────┴────────────────┘ │ │┃
┃  │ ├───────────────────────────────────┤ │┃
┃  │ │  (4 more variants...)             │ │┃
┃  │ └───────────────────────────────────┘ │┃
┃  └───────────────────────────────────────┘┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Single-SKU Product (No Variants)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ┌───────────────────────────────────────┐┃
┃  │ 📦 Single-SKU product (no variants)   │┃
┃  │                                       │┃
┃  │ SKU: PROD-BASE-001                    │┃
┃  └───────────────────────────────────────┘┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Component States

### State 1: Collapsed (Default)
- Minimal height
- Shows variant count
- Shows group count badge
- "Expand" button visible

### State 2: Expanded
- Full table/cards visible
- Scrollable if many variants
- "Collapse" button visible

### State 3: Single-SKU
- No expansion control
- Static message display
- Shows base SKU if available

## Interactive Elements

### Header Section
```
┌─────────────────────────────────────────────────┐
│ [ICON] Related to 6 variations [BADGE] [BUTTON] │
│   📦                           ℹ 2      Expand ▼│
└─────────────────────────────────────────────────┘
     │                            │          │
     │                            │          └─ Click to toggle
     │                            └─ Info badge
     └─ Package icon
```

### Table Row (Desktop)
```
┌──────┬───────────┬─────────┬────────┬───────┬────────┐
│ [IMG]│ Red / S   │ SKU-001 │ ₹1,499 │   45  │ Active │
│  📷  │           │         │        │       │   ✅   │
└──────┴───────────┴─────────┴────────┴───────┴────────┘
   │        │          │         │        │       │
   │        │          │         │        │       └─ Status badge
   │        │          │         │        └─ Stock (number)
   │        │          │         └─ Price (formatted)
   │        │          └─ SKU (code-styled)
   │        └─ Variant attributes
   └─ Image thumbnail (clickable)
```

### Card Layout (Mobile)
```
┌──────────────────────────────┐
│  [IMAGE]   Variant Name      │
│   (64px)   [STATUS BADGE]    │
│            Group Label       │
│                              │
│  ┌────────────┬────────────┐ │
│  │ Label      │ Value      │ │
│  ├────────────┼────────────┤ │
│  │ Label      │ Value      │ │
│  └────────────┴────────────┘ │
└──────────────────────────────┘
```

## Color Coding

### Status Colors
- ✅ **Green**: Active/Available variant
- ⛔ **Red**: Unavailable variant
- 🔴 **Red text**: Low stock warning (≤5)

### Visual Hierarchy
```
Primary:   Variant name, SKU, Price
Secondary: Group labels, Stock numbers
Tertiary:  Status badges, Column headers
Muted:     Helper text, Placeholders
```

## Hover States

### Desktop Table Row
```
Normal:    bg-white
Hover:     bg-gray-50 (subtle highlight)
Active:    (no special state, not clickable)
```

### Expand/Collapse Button
```
Normal:    text-gray-600
Hover:     bg-gray-100, text-primary-600
Click:     (immediate expand/collapse)
```

## Loading State (Future Enhancement)

```
┌─────────────────────────────────────────┐
│ 📦 Related to 6 variations     Expand ▼ │
├─────────────────────────────────────────┤
│                                         │
│           [SPINNER]                     │
│      Loading variants...                │
│                                         │
└─────────────────────────────────────────┘
```

## Error State (Future Enhancement)

```
┌─────────────────────────────────────────┐
│ 📦 Related to 6 variations     Expand ▼ │
├─────────────────────────────────────────┤
│                                         │
│           ⚠️ Failed to load variants    │
│           [Retry Button]                │
│                                         │
└─────────────────────────────────────────┘
```

## Empty State

```
┌─────────────────────────────────────────┐
│ 📦 Related to 0 variations              │
│                                         │
│ No variants configured for this product│
└─────────────────────────────────────────┘
```

## Responsive Breakpoints

- **Desktop**: `lg:` breakpoint (1024px+)
  - Table layout
  - All columns visible
  - Horizontal scroll if needed

- **Mobile**: Below `lg:` breakpoint
  - Card layout
  - Vertical stack
  - Larger touch targets
  - No horizontal scroll

## Accessibility Features

### Keyboard Navigation
```
Tab:       Focus on Expand button
Enter:     Toggle expansion
Escape:    Collapse (if expanded)
```

### Screen Reader Support
- Table headers announced
- Status badges have aria-labels
- Image alt text provided
- Button labels clear ("Expand variants", "Collapse variants")

### Focus Management
- Focus on expand button after collapse
- Logical tab order through table cells
- Clear focus indicators (ring outline)

---

## Usage Context

### In Admin Product Review Modal
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Product Preview Modal                    ┃
┃ ─────────────────────────────────────── ┃
┃                                          ┃
┃ [Images Section]                         ┃
┃ [Brand Authorization]                    ┃
┃ [Product Description]                    ┃
┃ [Features & Specs]                       ┃
┃                                          ┃
┃ ┌────────────────────────────────────┐  ┃
┃ │ 📦 Related to 6 variations  Expand │  ┃  ← Component
┃ └────────────────────────────────────┘  ┃
┃                                          ┃
┃ [Approve Button] [Reject Button]         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### In Seller Edit Modal
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Edit Product Modal                       ┃
┃ ─────────────────────────────────────── ┃
┃                                          ┃
┃ [Product Name]                           ┃
┃ [Brand]                                  ┃
┃ [Category]                               ┃
┃ [Price & Stock]                          ┃
┃ [Images]                                 ┃
┃ [Description]                            ┃
┃ ...                                      ┃
┃                                          ┃
┃ ┌────────────────────────────────────┐  ┃
┃ │ 📦 Related to 6 variations  Expand │  ┃  ← Component
┃ └────────────────────────────────────┘  ┃
┃                                          ┃
┃ [Cancel] [Save Changes]                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

These mockups demonstrate the actual visual structure and behavior of the implemented component!
