'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { FormField, FormSelect } from '@/components/dashboard/form-field';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface Order {
  id: string; orderNumber: string; customer: string; email: string; items: number;
  total: number; status: string; paymentMethod: string; createdAt: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  Delivered: 'success', Shipped: 'info', Processing: 'warning', Pending: 'default', Cancelled: 'danger', Returned: 'danger',
};

export default function OrdersPage() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const columns: Column<Order>[] = [
    { key: 'orderNumber', header: 'Order #', render: (r) => <span className="font-mono font-medium text-primary-600">{r.orderNumber}</span> },
    { key: 'customer', header: 'Customer' },
    { key: 'items', header: 'Items' },
    { key: 'total', header: 'Total', render: (r) => `₹${r.total.toLocaleString()}` },
    { key: 'paymentMethod', header: 'Payment' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'createdAt', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Order> title="Orders" section="orders" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['orderNumber', 'customer']}
        filterKey="status" filterOptions={['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned']}
        renderActions={(r) => (
          <button onClick={() => { setSelected(r); setNewStatus(r.status); setDetailOpen(true); }} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Eye size={15} /></button>
        )}
      />
      <ActionModal open={detailOpen} onClose={() => setDetailOpen(false)} title={`Order ${selected?.orderNumber}`} wide
        onSubmit={() => { toast.success(`Order updated to ${newStatus}`); setDetailOpen(false); }} submitLabel="Update Status">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-text-muted">Customer:</span> <span className="font-medium">{selected.customer}</span></div>
              <div><span className="text-text-muted">Email:</span> {selected.email}</div>
              <div><span className="text-text-muted">Items:</span> {selected.items}</div>
              <div><span className="text-text-muted">Total:</span> <span className="font-semibold">₹{selected.total.toLocaleString()}</span></div>
              <div><span className="text-text-muted">Payment:</span> {selected.paymentMethod}</div>
              <div><span className="text-text-muted">Date:</span> {new Date(selected.createdAt).toLocaleString()}</div>
            </div>
            <div className="border-t border-border pt-4">
              <FormField label="Update Status">
                <FormSelect value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option>Pending</option><option>Processing</option><option>Shipped</option>
                  <option>Delivered</option><option>Cancelled</option><option>Returned</option>
                </FormSelect>
              </FormField>
            </div>
          </div>
        )}
      </ActionModal>
    </>
  );
}
