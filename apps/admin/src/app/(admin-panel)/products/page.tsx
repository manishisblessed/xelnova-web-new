'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  status: string;
  rating: number;
  sales: number;
  createdAt: string;
}

export default function ProductsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: '', brand: '', price: '', stock: '', status: 'Active' });

  const openAdd = () => { setEditing(null); setForm({ name: '', category: '', brand: '', price: '', stock: '', status: 'Active' }); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, category: p.category, brand: p.brand, price: String(p.price), stock: String(p.stock), status: p.status }); setModalOpen(true); };
  const handleSave = () => { toast.success(editing ? 'Product updated' : 'Product created'); setModalOpen(false); };
  const handleDelete = () => { toast.success('Product deleted'); setDeleteOpen(false); };

  const columns: Column<Product>[] = [
    { key: 'name', header: 'Product', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'category', header: 'Category' },
    { key: 'brand', header: 'Brand' },
    { key: 'price', header: 'Price', render: (r) => `₹${r.price.toLocaleString()}` },
    { key: 'stock', header: 'Stock', render: (r) => <span className={r.stock < 10 ? 'text-danger-500 font-medium' : ''}>{r.stock}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Active' ? 'success' : r.status === 'Draft' ? 'default' : 'danger'}>{r.status}</Badge> },
    { key: 'rating', header: 'Rating', render: (r) => `${r.rating} ★` },
    { key: 'sales', header: 'Sales' },
  ];

  return (
    <>
      <AdminListPage<Product>
        title="Products"
        section="products"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name', 'category', 'brand']}
        filterKey="status"
        filterOptions={['Active', 'Draft', 'Out of Stock']}
        onAdd={openAdd}
        addLabel="Add Product"
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'Add Product'} onSubmit={handleSave} wide>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Product Name"><FormInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" /></FormField>
          <FormField label="Category"><FormInput value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Category" /></FormField>
          <FormField label="Brand"><FormInput value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand" /></FormField>
          <FormField label="Price (₹)"><FormInput type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" /></FormField>
          <FormField label="Stock"><FormInput type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" /></FormField>
          <FormField label="Status">
            <FormSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option>Active</option><option>Draft</option><option>Out of Stock</option>
            </FormSelect>
          </FormField>
        </div>
      </ActionModal>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Product" message={`Delete "${editing?.name}"? This cannot be undone.`} />
    </>
  );
}
