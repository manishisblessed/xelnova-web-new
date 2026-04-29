# Seller Cancellation & Rescheduling Feature - Implementation Summary

## What Was Added

This implementation enables sellers to:
1. ✅ **Cancel orders** in PENDING, PROCESSING, or CONFIRMED status
2. ✅ **Cancel shipments** in PENDING, BOOKED, or PICKUP_SCHEDULED status  
3. ✅ **Reschedule shipments** to a future pickup date

## Key Features

### Automatic Workflows
- **Stock Restoration**: When order cancelled, seller's product stock is automatically restored
- **Refund Processing**: Cancelled orders automatically refund to original payment method
- **Shipment Cascading**: When order cancelled, associated shipment is also cancelled
- **Audit Trail**: All cancellations logged with timestamps and reasons
- **Customer Notifications**: Customers receive email updates about cancellations/rescheduling

### Permissions
- New `shipments` section added to RBAC with `cancel` and `reschedule` actions
- Extended `orders` section now includes `cancel` action for sellers
- Updated role templates: Seller, Order Manager, Customer Support

## API Endpoints

```
POST   /seller/orders/:id/cancel              - Cancel order
POST   /seller/shipments/:shipmentId/cancel   - Cancel shipment
POST   /seller/shipments/:shipmentId/reschedule - Reschedule shipment
```

## Database & Files Modified

### Backend Services
- **seller-dashboard.service.ts** - Added 3 new methods:
  - `cancelOrder()`
  - `cancelShipment()`
  - `rescheduleShipment()`

- **seller-dashboard.controller.ts** - Added 3 new endpoints

- **notification.service.ts** - Added 3 new methods:
  - `sendOrderCancelledNotification()`
  - `sendShipmentCancelledNotification()`
  - `sendShipmentRescheduledNotification()`

- **email.service.ts** - Added 3 new email templates

### RBAC & Permissions
- **permissions.service.ts** - Updated permission templates with shipments section
- **seed-rbac.ts** - Updated role templates including new "Seller" template

### DTOs
- **seller-dashboard.dto.ts** - Added 3 new DTOs:
  - `CancelOrderDto`
  - `CancelShipmentDto`
  - `RescheduleShipmentDto`

## Status Validations

### Orders - Can be cancelled from:
- PENDING
- PROCESSING  
- CONFIRMED

### Shipments - Can be cancelled from:
- PENDING
- BOOKED
- PICKUP_SCHEDULED

### Shipments - Can be rescheduled from:
- PENDING
- BOOKED
- PICKUP_SCHEDULED

## Error Handling

All operations include proper validation:
- Order/Shipment exists check
- Seller ownership verification
- Status compatibility validation
- Date validation for reschedule (must be future date)
- Refund processing error handling

## Customer Impact

### Email Notifications Sent
1. Order Cancelled - With reason and refund status
2. Shipment Cancelled - With reason and next steps
3. Shipment Rescheduled - With new pickup date and reason

### In-App Notifications
All events logged to notification system with types:
- `ORDER_CANCELLED`
- `SHIPMENT_CANCELLED`
- `SHIPMENT_RESCHEDULED`

## To Deploy

1. **Database**: Run RBAC seed to update permissions
   ```bash
   npm run prisma:seed
   ```

2. **API**: Deploy backend changes with new endpoints

3. **Frontend**: Add UI buttons for:
   - Cancel order (in order details)
   - Cancel shipment (in shipment list/details)
   - Reschedule shipment (in shipment list/details)

4. **Tests**: Verify permissions are properly enforced

## Permission Structure

### Default Seller Permissions
```javascript
{
  orders: {
    view: true,
    edit: true,
    cancel: true,      // NEW
    refund: false,
    exportData: true
  },
  shipments: {         // NEW SECTION
    view: true,
    cancel: true,
    reschedule: true,
    track: true
  }
}
```

## Documentation

Complete documentation available in:
- `docs/SELLER_ORDER_SHIPMENT_MANAGEMENT.md` - Full feature guide
- API comments in service files - Implementation details
- DTOs - Request/response schemas

---

**Status**: ✅ Implementation Complete
**Testing**: Manual API testing recommended before deployment
**Next Steps**: Frontend UI implementation and thorough QA
