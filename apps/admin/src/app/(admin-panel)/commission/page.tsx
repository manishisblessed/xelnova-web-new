'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface CommissionRule {
  id: string; category: string; rate: number; flatFee: number;
  minCommission: number; sellers: number; status: string;
}

export default function CommissionPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionRule | null>(null);
  const [form, setForm] = useState({ rate: '', flatFee: '', minCommission: '', status: 'Active' });

  const openEdit = (r: CommissionRule) => {
    setEditing(r);
    setForm({ rate: String(r.rate), flatFee: String(r.flatFee), minCommission: String(r.minCommission), status: r.status });
    setModalOpen(true);
  };

  const columns: Column<CommissionRule>[] = [
    { key: 'category', header: 'Category', render: (r) => <span className="font-medium">{r.category}</span> },
    { key: 'rate', header: 'Rate', render: (r) => <span className="font-semibold text-primary-600">{r.rate}%</span> },
    { key: 'flatFee', header: 'Flat Fee', render: (r) => `₹${r.flatFee}` },
    { key: 'minCommission', header: 'Min Commission', render: (r) => `₹${r.minCommission}` },
    { key: 'sellers', header: 'Sellers' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Active' ? 'success' : 'default'}>{r.status}</Badge> },
  ];

  return (
    <>
      <AdminListPage<CommissionRule> title="Commission" section="commission" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['category']} filterKey="status" filterOptions={['Active', 'Inactive']}
        renderActions={(r) => (
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={`Edit Commission — ${editing?.category}`}
        onSubmit={() => { toast.success('Commission rule updated'); setModalOpen(false); }}>
        <FormField label="Rate (%)"><FormInput type="number" step="0.1" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></FormField>
        <FormField label="Flat Fee (₹)"><FormInput type="number" value={form.flatFee} onChange={e => setForm(f => ({ ...f, flatFee: e.target.value }))} /></FormField>
        <FormField label="Min Commission (₹)"><FormInput type="number" value={form.minCommission} onChange={e => setForm(f => ({ ...f, minCommission: e.target.value }))} /></FormField>
        <FormField label="Status"><FormSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option>Active</option><option>Inactive</option></FormSelect></FormField>
      </ActionModal>
    </>
  );
}
