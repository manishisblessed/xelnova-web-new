'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { Eye, Truck } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiUpdate, apiUpdateShipment } from '@/lib/api';

interface OrderUser {
  name: string;
  email: string;
}

interface OrderItemProduct {
  name: string;
  images: unknown;
}

interface OrderItem {
  product: OrderItemProduct;
  quantity: number;
  price: number;
}

interface Shipment {
  id: string;
  shippingMode: string;
  courierProvider: string | null;
  awbNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: string;
  weight: number | null;
  dimensions: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  user: OrderUser;
  items: OrderItem[];
  shipment?: Shipment | null;
}

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  DELIVERED: 'success',
  SHIPPED: 'info',
  PROCESSING: 'warning',
  PENDING: 'default',
  CONFIRMED: 'info',
  CANCELLED: 'danger',
  RETURNED: 'danger',
  REFUNDED: 'warning',
};

const ORDER_STATUSES = [
  'PENDING',
  'PROCESSING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
] as const;

function firstImageUrl(images: unknown): string | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const first = images[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'url' in first && typeof (first as { url: unknown }).url === 'string') {
    return (first as { url: string }).url;
  }
  return undefined;
}

const SHIPMENT_STATUSES = ['PENDING', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO', 'RTO_DELIVERED', 'CANCELLED'] as const;

export default function OrdersPage() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [updating, setUpdating] = useState(false);

  const [shipAwb, setShipAwb] = useState('');
  const [shipCarrier, setShipCarrier] = useState('');
  const [shipTrackingUrl, setShipTrackingUrl] = useState('');
  const [shipStatus, setShipStatus] = useState('');
  const [shipmentSaving, setShipmentSaving] = useState(false);

  const openDetail = (order: Order) => {
    setSelected(order);
    setNewStatus(order.status);
    setShipAwb(order.shipment?.awbNumber ?? '');
    setShipCarrier(order.shipment?.courierProvider ?? '');
    setShipTrackingUrl(order.shipment?.trackingUrl ?? '');
    setShipStatus(order.shipment?.shipmentStatus ?? '');
    setDetailOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      await apiUpdate('orders', selected.id, { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      setRefreshTrigger((n) => n + 1);
      setDetailOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateShipment = async () => {
    if (!selected) return;
    setShipmentSaving(true);
    try {
      await apiUpdateShipment(selected.id, {
        awbNumber: shipAwb.trim() || undefined,
        courierProvider: shipCarrier.trim() || undefined,
        trackingUrl: shipTrackingUrl.trim() || undefined,
        shipmentStatus: shipStatus || undefined,
      });
      toast.success('Shipment details updated');
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update shipment');
    } finally {
      setShipmentSaving(false);
    }
  };

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (r) => <span className="font-mono font-medium text-primary-600">{r.orderNumber}</span>,
    },
    { key: 'user', header: 'Customer', render: (r) => r.user?.name ?? '—' },
    { key: 'items', header: 'Items', render: (r) => r.items?.length ?? 0 },
    { key: 'total', header: 'Total', render: (r) => `₹${r.total.toLocaleString()}` },
    { key: 'paymentStatus', header: 'Payment' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>
          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    { key: 'createdAt', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Order>
        title="Orders"
        section="orders"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['orderNumber', 'user.name', 'user.email']}
        filterKey="status"
        filterOptions={[...ORDER_STATUSES]}
        refreshTrigger={refreshTrigger}
        renderActions={(r) => (
          <button
            type="button"
            onClick={() => openDetail(r)}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
          >
            <Eye size={15} />
          </button>
        )}
      />
      <ActionModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`Order ${selected?.orderNumber}`}
        wide
        onSubmit={() => void handleUpdateStatus()}
        submitLabel="Save status"
        loading={updating}
      >
        {selected && (
          <div className="space-y-4">
            {/* Order summary header */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-muted mb-0.5">Customer</p>
                <p className="font-semibold text-text-primary">{selected.user?.name ?? '—'}</p>
                <p className="text-text-muted text-xs">{selected.user?.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Order Total</p>
                <p className="text-xl font-bold text-text-primary">₹{selected.total.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Status</p>
                <Badge variant={STATUS_VARIANT[selected.status] ?? 'default'}>
                  {selected.status.charAt(0) + selected.status.slice(1).toLowerCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Payment</p>
                <Badge variant={selected.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                  {selected.paymentStatus}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Date</p>
                <p className="font-medium text-text-primary">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Items</p>
                <p className="font-medium text-text-primary">{selected.items?.length ?? 0} items</p>
              </div>
            </div>

            {/* Line items */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Line Items</h3>
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {(selected.items ?? []).map((line, idx) => {
                  const src = firstImageUrl(line.product?.images);
                  return (
                    <li key={idx} className="flex gap-3 items-center rounded-xl border border-border p-3 text-sm">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover bg-surface-muted shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-surface-muted shrink-0 flex items-center justify-center">
                          <Eye size={16} className="text-text-muted" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary truncate">{line.product?.name ?? 'Product'}</p>
                        <p className="text-text-muted text-xs">Qty {line.quantity} × ₹{line.price.toLocaleString('en-IN')}</p>
                      </div>
                      <p className="font-bold text-text-primary shrink-0">₹{(line.quantity * line.price).toLocaleString('en-IN')}</p>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Update status */}
            <div className="border-t border-border pt-4">
              <FormField label="Order Status">
                <FormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            </div>

            {/* Shipment details (only if shipment exists) */}
            {selected.shipment && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-primary-600" />
                  <h3 className="text-sm font-semibold text-text-primary">Shipment Details</h3>
                  <Badge variant="info" className="text-[10px]">{selected.shipment.shippingMode.replace(/_/g, ' ')}</Badge>
                </div>

                {selected.shipment.weight != null && (
                  <p className="text-xs text-text-muted">
                    Weight: {selected.shipment.weight} kg
                    {selected.shipment.dimensions && ` · Dimensions: ${selected.shipment.dimensions}`}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="AWB Number">
                    <FormInput value={shipAwb} onChange={(e) => setShipAwb(e.target.value)} placeholder="Enter AWB / tracking number" />
                  </FormField>
                  <FormField label="Carrier / Courier">
                    <FormInput value={shipCarrier} onChange={(e) => setShipCarrier(e.target.value)} placeholder="e.g. Delhivery, BlueDart" />
                  </FormField>
                  <FormField label="Tracking URL">
                    <FormInput value={shipTrackingUrl} onChange={(e) => setShipTrackingUrl(e.target.value)} placeholder="https://..." />
                  </FormField>
                  <FormField label="Shipment Status">
                    <FormSelect value={shipStatus} onChange={(e) => setShipStatus(e.target.value)}>
                      {SHIPMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </FormSelect>
                  </FormField>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleUpdateShipment()}
                    disabled={shipmentSaving}
                    className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {shipmentSaving ? 'Saving…' : 'Update Shipment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </ActionModal>
    </>
  );
}
