'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect, FormToggle } from '@/components/dashboard/form-field';
import { Pencil, Trash2, KeyRound, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiCreate, apiDelete, apiGet, apiPost, apiUpdate } from '@/lib/api';
import { useDashboardAuth } from '@/lib/auth-context';
import type { Column } from '@/components/dashboard/data-table';

interface AdminRole {
  id: string;
  name: string;
  permissions: string;
  isSystem: boolean;
}

interface SubAdmin {
  id: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  isBanned: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  adminRoleId: string | null;
  adminRole: { id: string; name: string; permissions: string; isSystem: boolean } | null;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  adminRoleId: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '', adminRoleId: '', isActive: true };

export default function SubAdminsPage() {
  const { user: currentUser } = useDashboardAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<SubAdmin | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiGet<AdminRole[]>('roles').then(setRoles).catch(() => undefined);
  }, [refreshKey]);

  const customRoles = useMemo(() => roles.filter((r) => !r.isSystem), [roles]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (s: SubAdmin) => {
    setEditing(s);
    setForm({
      name: s.name ?? '',
      email: s.email ?? '',
      password: '',
      adminRoleId: s.adminRoleId ?? '',
      isActive: s.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editing) {
        const patch: Record<string, unknown> = { name: form.name, isActive: form.isActive };
        // Send adminRoleId only when it changed; empty string means "clear role".
        if ((editing.adminRoleId ?? '') !== form.adminRoleId) {
          patch.adminRoleId = form.adminRoleId || null;
        }
        await apiUpdate('sub-admins', editing.id, patch);
        toast.success('Sub-admin updated');
        setModalOpen(false);
      } else {
        const result = await apiCreate<SubAdmin & { tempPassword?: string | null }>('sub-admins', {
          name: form.name,
          email: form.email.trim().toLowerCase(),
          password: form.password.trim() || undefined,
          adminRoleId: form.adminRoleId || undefined,
        });
        toast.success('Sub-admin created');
        setModalOpen(false);
        if (result?.tempPassword) {
          setTempPassword({ email: form.email.trim().toLowerCase(), password: result.tempPassword });
        }
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (s: SubAdmin) => {
    try {
      const res = await apiPost<{ tempPassword: string }>(`sub-admins/${s.id}/reset-password`, {});
      toast.success('Password reset');
      setTempPassword({ email: s.email ?? '', password: res.tempPassword });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await apiDelete('sub-admins', editing.id);
      toast.success('Sub-admin removed');
      setDeleteOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove sub-admin');
    }
  };

  const handleCopyPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const columns: Column<SubAdmin>[] = [
    {
      key: 'name',
      header: 'Sub-admin',
      render: (s) => (
        <div className="flex flex-col">
          <span className="font-medium text-text-primary">{s.name || '—'}</span>
          <span className="text-xs text-text-muted">{s.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Access',
      render: (s) =>
        s.isSuperAdmin ? (
          <Badge variant="info">Super admin</Badge>
        ) : s.adminRole ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-text-primary">{s.adminRole.name}</span>
            <span className="text-xs text-text-muted truncate max-w-[18rem]">
              {s.adminRole.permissions || 'No specific permissions'}
            </span>
          </div>
        ) : (
          <span className="text-text-muted text-sm">No role assigned</span>
        ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (s) =>
        s.isBanned ? (
          <Badge variant="danger">Banned</Badge>
        ) : s.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="warning">Disabled</Badge>
        ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      render: (s) => (s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : 'Never'),
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (s) => new Date(s.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <AdminListPage<SubAdmin>
        title="Sub-admins"
        section="sub-admins"
        columns={columns}
        keyExtractor={(s) => s.id}
        searchKeys={['name', 'email', 'adminRole.name']}
        onAdd={openAdd}
        addLabel="Add Sub-admin"
        refreshTrigger={refreshKey}
        renderActions={(s) => (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => openEdit(s)}
              title="Edit"
              className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => handleResetPassword(s)}
              title="Reset password"
              className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
            >
              <KeyRound size={15} />
            </button>
            {!s.isSuperAdmin && currentUser?.id !== s.id && (
              <button
                onClick={() => {
                  setEditing(s);
                  setDeleteOpen(true);
                }}
                title="Remove"
                className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      />

      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name || editing.email}` : 'Add Sub-admin'}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editing ? 'Save changes' : 'Create sub-admin'}
      >
        <FormField label="Full name">
          <FormInput
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>

        <FormField
          label="Email"
          hint={editing ? 'Email cannot be changed after the account is created.' : null}
        >
          <FormInput
            type="email"
            value={form.email}
            disabled={!!editing}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </FormField>

        <FormField
          label="Role"
          hint={
            customRoles.length === 0
              ? 'No custom roles yet. Create one in the Roles tab to grant scoped access.'
              : 'Determines which sections this sub-admin can access.'
          }
        >
          <FormSelect
            value={form.adminRoleId}
            onChange={(e) => setForm((f) => ({ ...f, adminRoleId: e.target.value }))}
          >
            <option value="">No role (limited access)</option>
            {customRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </FormSelect>
        </FormField>

        {!editing && (
          <FormField
            label="Initial password (optional)"
            hint="Leave blank to auto-generate a strong temporary password — we'll show it to you once."
          >
            <FormInput
              type="text"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </FormField>
        )}

        {editing && (
          <FormToggle
            label={form.isActive ? 'Account active' : 'Account disabled'}
            checked={form.isActive}
            onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
          />
        )}
      </ActionModal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Remove sub-admin"
        message={`Remove admin access for ${editing?.email}? Their account will be demoted to a regular customer and disabled. Audit history will be preserved.`}
        confirmLabel="Remove access"
      />

      <ActionModal
        open={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title="Temporary password generated"
      >
        <p className="text-sm text-text-secondary">
          Share this one-time password with{' '}
          <span className="font-medium text-text-primary">{tempPassword?.email}</span> through a
          secure channel. It will not be shown again.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2.5">
          <code className="flex-1 font-mono text-sm text-text-primary">
            {tempPassword?.password}
          </code>
          <button
            type="button"
            onClick={handleCopyPassword}
            className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-secondary hover:bg-primary-50 hover:text-primary-700"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-text-muted">
          The sub-admin should change their password after first sign-in.
        </p>
      </ActionModal>
    </>
  );
}
