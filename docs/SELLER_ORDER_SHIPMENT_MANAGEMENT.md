# Seller Order & Shipment Management

## Overview

Sellers now have the ability to **cancel orders** and **cancel/reschedule shipments** directly from their dashboard. This feature gives sellers control over uncertain situations and logistics issues.

## New Permissions

### Shipments Section
New permissions have been added to the RBAC system:

```javascript
shipments: {
  view: true,        // View shipments
  cancel: true,      // Cancel a shipment
  reschedule: true,  // Reschedule shipment pickup
  track: true        // Track shipment status
}
```

### Orders Section (Extended)
- `cancel`: Sellers can now cancel orders in PENDING, PROCESSING, or CONFIRMED status

## New API Endpoints

### 1. Cancel Order
**Endpoint:** `POST /seller/orders/:id/cancel`

**Description:** Cancel an order with a reason

**Request Body:**
```json
{
  "reason": "Out of stock at warehouse"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "orderNumber": "ORD-001",
    "status": "CANCELLED",
    "cancelledAt": "2026-04-29T10:30:00Z",
    "reason": "Out of stock at warehouse"
  },
  "message": "Order cancelled"
}
```

**Allowed Statuses for Cancellation:**
- PENDING
- PROCESSING
- CONFIRMED

### 2. Cancel Shipment
**Endpoint:** `POST /seller/shipments/:shipmentId/cancel`

**Description:** Cancel a pending or booked shipment

**Request Body:**
```json
{
  "reason": "Pickup address incorrect - needs update"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shipmentId": "shipment-456",
    "orderId": "order-123",
    "status": "CANCELLED",
    "cancelledAt": "2026-04-29T10:30:00Z",
    "reason": "Pickup address incorrect - needs update"
  },
  "message": "Shipment cancelled"
}
```

**Allowed Statuses for Cancellation:**
- PENDING
- BOOKED
- PICKUP_SCHEDULED

### 3. Reschedule Shipment
**Endpoint:** `POST /seller/shipments/:shipmentId/reschedule`

**Description:** Reschedule shipment pickup to a new date

**Request Body:**
```json
{
  "newPickupDate": "2026-05-01T10:00:00Z",
  "reason": "Inventory arriving late from supplier"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shipmentId": "shipment-456",
    "orderId": "order-123",
    "pickupDate": "2026-05-01T10:00:00Z",
    "status": "PICKUP_SCHEDULED",
    "rescheduledAt": "2026-04-29T10:30:00Z",
    "reason": "Inventory arriving late from supplier"
  },
  "message": "Shipment rescheduled"
}
```

**Allowed Statuses for Rescheduling:**
- PENDING
- BOOKED
- PICKUP_SCHEDULED

## Automated Workflows

### Order Cancellation Workflow

When a seller cancels an order:

1. ✅ Validates order status (only PENDING, PROCESSING, CONFIRMED can be cancelled)
2. ✅ Checks seller ownership of order items
3. ✅ Restores product stock for seller's items
4. ✅ Processes refund to original payment method (if payment was completed)
5. ✅ Updates order status to CANCELLED
6. ✅ Updates payment status to REFUNDED (if applicable)
7. ✅ Cancels associated shipment (if exists and not already delivered)
8. ✅ Sends notification email to customer with reason
9. ✅ Logs activity for audit trail

### Shipment Cancellation Workflow

When a seller cancels a shipment:

1. ✅ Validates shipment status (only PENDING, BOOKED, PICKUP_SCHEDULED can be cancelled)
2. ✅ Verifies seller ownership of shipment
3. ✅ Updates shipment status to CANCELLED
4. ✅ Logs status change with timestamp and reason
5. ✅ Sends notification email to customer with reason
6. ✅ Logs activity for audit trail

### Shipment Rescheduling Workflow

When a seller reschedules a shipment:

1. ✅ Validates shipment status (only PENDING, BOOKED, PICKUP_SCHEDULED can be rescheduled)
2. ✅ Verifies seller ownership of shipment
3. ✅ Validates new pickup date is in the future
4. ✅ Updates shipment pickup date
5. ✅ Logs status change with new date and reason
6. ✅ Updates shipment status to PICKUP_SCHEDULED
7. ✅ Sends notification email to customer with new date and reason
8. ✅ Logs activity for audit trail

## Notification System

### Customer Notifications

Customers receive email notifications when:

1. **Order Cancelled** 
   - Subject: "Order #XYZ Cancelled - XelNova"
   - Includes: Order number, cancellation reason, refund status

2. **Shipment Cancelled**
   - Subject: "Shipment Cancelled for Order #XYZ - XelNova"
   - Includes: Order number, cancellation reason, refund/reshipment info

3. **Shipment Rescheduled**
   - Subject: "Shipment Rescheduled for Order #XYZ - XelNova"
   - Includes: Order number, new pickup date, reschedule reason

### In-App Notifications

All events are logged in the notification system with type:
- `ORDER_CANCELLED`
- `SHIPMENT_CANCELLED`
- `SHIPMENT_RESCHEDULED`

## Permission Configuration

### For SELLER Role (Automatic)

Sellers with the "Seller" role template automatically get:

```javascript
{
  orders: {
    view: true,
    edit: true,
    cancel: true,     // NEW
    refund: false,
    exportData: true
  },
  shipments: {        // NEW SECTION
    view: true,
    cancel: true,
    reschedule: true,
    track: true
  }
}
```

### For Order Managers (Admin Role)

Managers managing orders also get full shipment controls:

```javascript
{
  orders: {
    view: true,
    edit: true,
    cancel: true,
    refund: true,
    exportData: true
  },
  shipments: {
    view: true,
    cancel: true,
    reschedule: true,
    track: true
  }
}
```

### For Customer Support (Admin Role)

Support staff can help with both cancellations:

```javascript
{
  orders: { view: true, edit: true, cancel: true, refund: true, exportData: false },
  shipments: { view: true, cancel: true, reschedule: true, track: true }
}
```

## Error Handling

### Common Errors

```
Order Status Error:
"Cannot cancel order in SHIPPED status. Only Pending, Processing, or Confirmed orders can be cancelled."

Shipment Status Error:
"Cannot cancel shipment in DELIVERED status. Only Pending, Booked, or Pickup Scheduled shipments can be cancelled."

Ownership Error:
"This shipment does not belong to you"

Refund Error:
"Failed to process refund. Order cancellation aborted."

Date Error:
"New pickup date must be in the future"
```

## Database Changes

### Shipment statusHistory Enhancement

The `statusHistory` JSON field now tracks:

```json
[
  {
    "status": "CANCELLED",
    "timestamp": "2026-04-29T10:30:00Z",
    "reason": "Out of stock - will restock on May 5th"
  }
]
```

This provides a complete audit trail of shipment status changes.

## Implementation Details

### Files Modified

1. **Backend API**
   - `backend/src/modules/seller-dashboard/seller-dashboard.controller.ts` - New endpoints
   - `backend/src/modules/seller-dashboard/seller-dashboard.service.ts` - Business logic
   - `backend/src/modules/seller-dashboard/dto/seller-dashboard.dto.ts` - DTOs

2. **Notifications**
   - `backend/src/modules/notifications/notification.service.ts` - Notification methods
   - `backend/src/modules/email/email.service.ts` - Email templates

3. **RBAC**
   - `backend/src/modules/admin/permissions.service.ts` - Permission templates
   - `backend/prisma/seed-rbac.ts` - RBAC seeding updated

### Running the Database Seed

To apply the RBAC changes:

```bash
npm run prisma:seed
# or
yarn prisma:seed
# or
cd backend && npx prisma db seed
```

## Testing

### Test Cancel Order

```bash
curl -X POST http://localhost:3001/seller/orders/order-123/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seller-token>" \
  -d '{
    "reason": "Out of stock"
  }'
```

### Test Cancel Shipment

```bash
curl -X POST http://localhost:3001/seller/shipments/shipment-456/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seller-token>" \
  -d '{
    "reason": "Incorrect address"
  }'
```

### Test Reschedule Shipment

```bash
curl -X POST http://localhost:3001/seller/shipments/shipment-456/reschedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seller-token>" \
  -d '{
    "newPickupDate": "2026-05-01T10:00:00Z",
    "reason": "Late inventory arrival"
  }'
```

## UI Implementation Notes

### For Seller Dashboard

The seller should see:

1. **Order List** - Cancel button for PENDING/PROCESSING/CONFIRMED orders
2. **Order Detail** - Cancel order with reason modal
3. **Shipment List** - Cancel and Reschedule buttons
4. **Shipment Detail** - Cancel with reason, Reschedule with new date

### Button Visibility Logic

```typescript
// Show cancel button if:
- order.status in ['PENDING', 'PROCESSING', 'CONFIRMED']
- userHasPermission('orders', 'cancel')

// Show shipment cancel/reschedule if:
- shipment.status in ['PENDING', 'BOOKED', 'PICKUP_SCHEDULED']
- userHasPermission('shipments', 'cancel') or userHasPermission('shipments', 'reschedule')
```

## Best Practices

1. **Always provide a reason** - Helps customers understand why action was taken
2. **Reschedule before cancelling** - Try to reschedule shipment first if just timing issue
3. **Process refunds promptly** - Cancelled orders auto-refund, but verify processing
4. **Check inventory first** - Don't cancel if you can reschedule and restock
5. **Communicate clearly** - Keep reasons concise and helpful to customers

## Future Enhancements

- [ ] Bulk cancel multiple orders
- [ ] Schedule automatic reschedule
- [ ] Integration with courier APIs for carrier-level cancellation
- [ ] Partial shipment cancellation
- [ ] Custom cancellation policies per seller
- [ ] Cancellation analytics dashboard
