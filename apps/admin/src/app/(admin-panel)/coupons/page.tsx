'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { Pencil, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface Coupon {
  id: string; code: string; type: 'Percentage' | 'Flat'; value: number;
  minOrder: number; maxDiscount: number; usageCount: number; usageLimit: number; status: string; validUntil: string;
}

const SV: Record<string, 'success' | 'danger' | 'default'> = { Active: 'success', Expired: 'danger', Disabled: 'default' };

export default function CouponsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ code: '', type: 'Percentage' as 'Percentage' | 'Flat', value: '', minOrder: '', maxDiscount: '', usageLimit: '' });

  const openAdd = () => { setEditing(null); setForm({ code: '', type: 'Percentage', value: '', minOrder: '', maxDiscount: '', usageLimit: '' }); setModalOpen(true); };
  const openEdit = (c: Coupon) => { setEditing(c); setForm({ code: c.code, type: c.type, value: String(c.value), minOrder: String(c.minOrder), maxDiscount: String(c.maxDiscount), usageLimit: String(c.usageLimit) }); setModalOpen(true); };
  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success(`Copied "${code}"`); };

  const columns: Column<Coupon>[] = [
    { key: 'code', header: 'Code', render: (r) => (
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-primary-600">{r.code}</span>
        <button onClick={() => copyCode(r.code)} className="p-0.5 rounded hover:bg-surface-muted"><Copy size={13} /></button>
      </div>
    )},
    { key: 'type', header: 'Type' },
    { key: 'value', header: 'Value', render: (r) => r.type === 'Percentage' ? `${r.value}%` : `₹${r.value}` },
    { key: 'minOrder', header: 'Min Order', render: (r) => `₹${r.minOrder.toLocaleString()}` },
    { key: 'usageCount', header: 'Used', render: (r) => `${r.usageCount}/${r.usageLimit}` },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={SV[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'validUntil', header: 'Expires', render: (r) => new Date(r.validUntil).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Coupon> title="Coupons" section="coupons" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['code']} filterKey="status" filterOptions={['Active', 'Expired', 'Disabled']}
        onAdd={openAdd} addLabel="Create Coupon"
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Coupon' : 'Create Coupon'} onSubmit={() => { toast.success(editing ? 'Coupon updated' : 'Coupon created'); setModalOpen(false); }} wide>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code"><FormInput value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE10" /></FormField>
          <FormField label="Type"><FormSelect value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'Percentage' | 'Flat' }))}><option>Percentage</option><option>Flat</option></FormSelect></FormField>
          <FormField label="Value"><FormInput type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></FormField>
          <FormField label="Min Order (₹)"><FormInput type="number" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} /></FormField>
          <FormField label="Max Discount (₹)"><FormInput type="number" value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} /></FormField>
          <FormField label="Usage Limit"><FormInput type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} /></FormField>
        </div>
      </ActionModal>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => { toast.success('Coupon deleted'); setDeleteOpen(false); }} title="Delete Coupon" message={`Delete coupon "${editing?.code}"?`} />
    </>
  );
}
