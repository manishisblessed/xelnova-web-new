'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormTextarea } from '@/components/dashboard/form-field';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiCreate, apiUpdate, apiDelete } from '@/lib/api';
import type { Column } from '@/components/dashboard/data-table';

interface Role { id: string; name: string; permissions: string; users: number; isSystem: boolean; createdAt: string; }

export default function RolesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', permissions: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  const openAdd = () => { setEditing(null); setForm({ name: '', permissions: '' }); setModalOpen(true); };
  const openEdit = (r: Role) => { setEditing(r); setForm({ name: r.name, permissions: r.permissions }); setModalOpen(true); };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await apiUpdate('roles', editing.id, form);
        toast.success('Role updated');
      } else {
        await apiCreate('roles', form);
        toast.success('Role created');
      }
      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save role');
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await apiDelete('roles', editing.id);
      toast.success('Role deleted');
      setDeleteOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const columns: Column<Role>[] = [
    { key: 'name', header: 'Role', render: (r) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{r.name}</span>
        {r.isSystem && <Badge variant="info">System</Badge>}
      </div>
    )},
    { key: 'permissions', header: 'Permissions', render: (r) => <span className="text-text-muted text-xs">{r.permissions}</span> },
    { key: 'users', header: 'Users' },
    { key: 'createdAt', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Role> title="Roles" section="roles" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['name']} onAdd={openAdd} addLabel="Create Role" refreshTrigger={refreshKey}
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            {!r.isSystem && (
              <button onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
            )}
          </div>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Role' : 'Create Role'}
        onSubmit={handleSubmit}>
        <FormField label="Name"><FormInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
        <FormField label="Permissions (comma separated)"><FormTextarea value={form.permissions} onChange={e => setForm(f => ({ ...f, permissions: e.target.value }))} placeholder="Products, Orders, Customers..." /></FormField>
      </ActionModal>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Role" message={`Delete role "${editing?.name}"? Users with this role will lose their permissions.`} />
    </>
  );
}
