# Seller Order & Shipment Management - UI Implementation Guide

## Overview

This guide shows how to implement the UI for sellers to cancel orders and shipments, and reschedule shipments.

## UI Components to Add

### 1. Cancel Order Modal

**Location**: Order Details Page / Order List Row Actions

```typescript
interface CancelOrderModalProps {
  orderId: string;
  orderNumber: string;
  onCancel: (reason: string) => Promise<void>;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function CancelOrderModal({
  orderId,
  orderNumber,
  onCancel,
  onSuccess,
  onError,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await onCancel(reason);
      onSuccess();
    } catch (error) {
      onError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Order #{orderNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
            <p className="text-yellow-800">
              ⚠️ This will cancel the order and refund the customer to their original payment method.
            </p>
          </div>

          <div>
            <Label htmlFor="reason">Cancellation Reason</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Out of stock at warehouse, Customer request, Payment issue..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This reason will be sent to the customer via email.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setReason('')}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || loading}
            loading={loading}
          >
            {loading ? 'Cancelling...' : 'Cancel Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Shipment Actions Menu

**Location**: Shipment List Item / Shipment Details

```typescript
interface ShipmentActionsProps {
  shipmentId: string;
  shipmentStatus: string;
  onCancel: (reason: string) => Promise<void>;
  onReschedule: (newDate: Date, reason?: string) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function ShipmentActions({
  shipmentId,
  shipmentStatus,
  onCancel,
  onReschedule,
  onSuccess,
  onError,
}: ShipmentActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const canCancel = ['PENDING', 'BOOKED', 'PICKUP_SCHEDULED'].includes(shipmentStatus);
  const canReschedule = ['PENDING', 'BOOKED', 'PICKUP_SCHEDULED'].includes(shipmentStatus);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {canReschedule && (
            <DropdownMenuItem onClick={() => setRescheduleOpen(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Reschedule Pickup
            </DropdownMenuItem>
          )}
          {canCancel && (
            <DropdownMenuItem onClick={() => setCancelOpen(true)} className="text-red-600">
              <X className="w-4 h-4 mr-2" />
              Cancel Shipment
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelShipmentModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        shipmentId={shipmentId}
        onCancel={onCancel}
        onSuccess={onSuccess}
        onError={onError}
      />

      <RescheduleShipmentModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        shipmentId={shipmentId}
        onReschedule={onReschedule}
        onSuccess={onSuccess}
        onError={onError}
      />
    </>
  );
}
```

### 3. Cancel Shipment Modal

```typescript
export function CancelShipmentModal({
  open,
  onOpenChange,
  shipmentId,
  onCancel,
  onSuccess,
  onError,
}: CancelShipmentModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await onCancel(reason);
      onSuccess?.();
      onOpenChange(false);
      setReason('');
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Shipment</DialogTitle>
          <DialogDescription>
            This will cancel the shipment. The customer will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-3 rounded text-sm">
            <p className="text-red-800">
              ⚠️ Make sure you have a valid reason before cancelling. The customer will be notified about this action.
            </p>
          </div>

          <div>
            <Label htmlFor="cancel-reason">Cancellation Reason</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Wrong address provided, Inventory issue, Delivery partner unavailable..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Keep Shipment
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || loading}
            loading={loading}
          >
            Cancel Shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Reschedule Shipment Modal

```typescript
export function RescheduleShipmentModal({
  open,
  onOpenChange,
  shipmentId,
  onReschedule,
  onSuccess,
  onError,
}: RescheduleShipmentModalProps) {
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const handleSubmit = async () => {
    if (!newDate) {
      onError?.(new Error('Please select a date'));
      return;
    }

    try {
      setLoading(true);
      await onReschedule(newDate, reason);
      onSuccess?.();
      onOpenChange(false);
      setNewDate(null);
      setReason('');
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Shipment Pickup</DialogTitle>
          <DialogDescription>
            Select a new pickup date for this shipment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pickup-date">New Pickup Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={newDate || undefined}
                  onSelect={setNewDate}
                  disabled={(date) => date < tomorrow}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="reschedule-reason">Reason (Optional)</Label>
            <Textarea
              id="reschedule-reason"
              placeholder="e.g., Inventory arriving late, Pickup location access issue..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
            <p className="text-blue-800">
              ℹ️ The customer will be notified about the new pickup date via email.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Keep Current Date
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newDate || loading}
            loading={loading}
          >
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Integration with Existing Pages

### Orders Page

```typescript
export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string, reason: string) => {
    const response = await fetch(`/api/seller/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel order');
    }

    // Refresh orders
    const newOrders = await fetchOrders();
    setOrders(newOrders);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-4">
      <table>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.orderNumber}</td>
              <td>{order.status}</td>
              <td className="text-right">
                {['PENDING', 'PROCESSING', 'CONFIRMED'].includes(order.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrder(order.id)}
                  >
                    Cancel
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedOrder && (
        <CancelOrderModal
          orderId={selectedOrder}
          orderNumber={orders.find((o) => o.id === selectedOrder)?.orderNumber}
          onCancel={(reason) => handleCancelOrder(selectedOrder, reason)}
          onSuccess={() => {
            toast.success('Order cancelled successfully');
            setSelectedOrder(null);
          }}
          onError={(error) => {
            toast.error(error.message);
          }}
        />
      )}
    </div>
  );
}
```

### Shipments/Order Details Page

```typescript
export function OrderDetailsPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<any>(null);

  const handleCancelShipment = async (shipmentId: string, reason: string) => {
    const response = await fetch(`/api/seller/shipments/${shipmentId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel shipment');
    }

    // Refresh order
    const updated = await fetchOrder(orderId);
    setOrder(updated);
  };

  const handleRescheduleShipment = async (
    shipmentId: string,
    newDate: Date,
    reason?: string
  ) => {
    const response = await fetch(`/api/seller/shipments/${shipmentId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newPickupDate: newDate.toISOString(),
        reason,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to reschedule shipment');
    }

    // Refresh order
    const updated = await fetchOrder(orderId);
    setOrder(updated);
  };

  if (!order?.shipment) return null;

  return (
    <div>
      {/* Order details */}
      <div className="mt-6 border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Shipment Details</h3>
        <ShipmentActions
          shipmentId={order.shipment.id}
          shipmentStatus={order.shipment.shipmentStatus}
          onCancel={(reason) => handleCancelShipment(order.shipment.id, reason)}
          onReschedule={(newDate, reason) =>
            handleRescheduleShipment(order.shipment.id, newDate, reason)
          }
          onSuccess={() => {
            toast.success('Shipment updated successfully');
          }}
          onError={(error) => {
            toast.error(error.message);
          }}
        />
      </div>
    </div>
  );
}
```

## Error Handling

```typescript
interface ApiError {
  success: false;
  message: string;
}

function handleApiError(error: Error): string {
  if (error.message.includes('Cannot cancel order')) {
    return 'This order cannot be cancelled in its current status';
  }
  if (error.message.includes('Cannot cancel shipment')) {
    return 'This shipment cannot be cancelled in its current status';
  }
  if (error.message.includes('does not belong to you')) {
    return 'You do not have permission to modify this shipment';
  }
  return error.message || 'An unexpected error occurred';
}
```

## Permission Checks

Add permission checks before showing buttons:

```typescript
interface ShipmentActionsProps {
  shipmentId: string;
  shipmentStatus: string;
  userPermissions?: {
    canCancelShipments: boolean;
    canRescheduleShipments: boolean;
  };
}

export function ShipmentActions({
  shipmentId,
  shipmentStatus,
  userPermissions,
}: ShipmentActionsProps) {
  const canCancel =
    userPermissions?.canCancelShipments &&
    ['PENDING', 'BOOKED', 'PICKUP_SCHEDULED'].includes(shipmentStatus);

  const canReschedule =
    userPermissions?.canRescheduleShipments &&
    ['PENDING', 'BOOKED', 'PICKUP_SCHEDULED'].includes(shipmentStatus);

  // ... rest of component
}
```

## Testing Checklist

- [ ] Cancel order button appears only for PENDING/PROCESSING/CONFIRMED orders
- [ ] Cancel shipment button appears only for PENDING/BOOKED/PICKUP_SCHEDULED shipments
- [ ] Reschedule button appears only for PENDING/BOOKED/PICKUP_SCHEDULED shipments
- [ ] Reason field is required for all operations
- [ ] Future date validation works for reschedule
- [ ] Success toast shows after operation
- [ ] Error messages display properly
- [ ] Loading state shows during API call
- [ ] Modals close after successful operation
- [ ] Permission checks hide buttons if user doesn't have permission
- [ ] Multiple concurrent requests don't cause issues

---

**Note**: Adjust the component imports and styling based on your actual UI library (Shadcn, Material-UI, etc.)
