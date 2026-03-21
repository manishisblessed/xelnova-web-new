'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { Eye } from 'lucide-react';
import type { Column } from '@/components/dashboard/data-table';

interface Customer {
  id: string; name: string; email: string; phone: string;
  orders: number; totalSpent: number; status: string; joinedAt: string;
}

const SV: Record<string, 'success' | 'danger' | 'default'> = { Active: 'success', Inactive: 'default', Blocked: 'danger' };

export default function CustomersPage() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'orders', header: 'Orders' },
    { key: 'totalSpent', header: 'Spent', render: (r) => `₹${r.totalSpent.toLocaleString()}` },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={SV[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'joinedAt', header: 'Joined', render: (r) => new Date(r.joinedAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Customer> title="Customers" section="customers" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['name', 'email', 'phone']} filterKey="status" filterOptions={['Active', 'Inactive', 'Blocked']}
        renderActions={(r) => (
          <button onClick={() => { setSelected(r); setDetailOpen(true); }} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Eye size={15} /></button>
        )}
      />
      <ActionModal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected?.name ?? 'Customer'} wide>
        {selected && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-text-muted">Email:</span> {selected.email}</div>
            <div><span className="text-text-muted">Phone:</span> {selected.phone}</div>
            <div><span className="text-text-muted">Orders:</span> {selected.orders}</div>
            <div><span className="text-text-muted">Total Spent:</span> <span className="font-semibold">₹{selected.totalSpent.toLocaleString()}</span></div>
            <div><span className="text-text-muted">Status:</span> <Badge variant={SV[selected.status] ?? 'default'}>{selected.status}</Badge></div>
            <div><span className="text-text-muted">Joined:</span> {new Date(selected.joinedAt).toLocaleDateString()}</div>
          </div>
        )}
      </ActionModal>
    </>
  );
}
