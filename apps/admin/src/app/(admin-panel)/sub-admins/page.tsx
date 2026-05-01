'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect, FormToggle } from '@/components/dashboard/form-field';
import { Pencil, Trash2, KeyRound, Copy, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import { apiCreate, apiDelete, apiGet, apiPost, apiUpdate } from '@/lib/api';
import { useDashboardAuth } from '@/lib/auth-context';
import type { Column } from '@/components/dashboard/data-table';

interface AdminRole {
  id: string;
  name: string;
  description?: string | null;
  level?: string;
  permissions: string;
  permissionsData?: Record<string, Record<string, boolean>>;
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
  adminRole: { id: string; name: string; description?: string | null; permissions: string; level?: string; permissionsData?: Record<string, Record<string, boolean>>; isSystem: boolean } | null;
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
  const [permissionsPreview, setPermissionsPreview] = useState<{
    open: boolean;
    adminRole: AdminRole | null;
  }>({ open: false, adminRole: null });
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

  const getLevelBadgeColor = (level?: string): string => {
    switch (level) {
      case 'SUPER_ADMIN':
        return 'danger';
      case 'MANAGER':
        return 'warning';
      case 'EDITOR':
        return 'info';
      case 'VIEWER':
        return 'success';
      default:
        return 'default';
    }
  };

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

  const getPermissionCount = (role: AdminRole): { enabled: number; total: number } => {
    if (!role.permissionsData) return { enabled: 0, total: 0 };
    let enabled = 0;
    let total = 0;
    Object.values(role.permissionsData).forEach((section) => {
      Object.values(section).forEach((perm) => {
        total++;
        if (perm) enabled++;
      });
    });
    return { enabled, total };
  };

  const columns: Column<SubAdmin>[] = [
    {
      key: 'name',
      header: 'Sub-admin',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-700">
              {(s.name || s.email || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-text-primary">{s.name || '—'}</span>
            <span className="text-xs text-text-muted">{s.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Access',
      render: (s) => {
        if (s.isSuperAdmin) {
          return (
            <div className="flex flex-col gap-1">
              <Badge variant="info">Super admin</Badge>
              <span className="text-[10px] text-text-muted">Full platform access</span>
            </div>
          );
        }
        if (s.adminRole) {
          const levelLabels: Record<string, string> = {
            SUPER_ADMIN: 'Super Admin',
            MANAGER: 'Manager',
            EDITOR: 'Editor',
            VIEWER: 'Viewer',
          };
          const permCount = s.adminRole.permissionsData
            ? Object.values(s.adminRole.permissionsData).reduce(
                (acc, actions) => acc + Object.values(actions).filter(Boolean).length,
                0,
              )
            : 0;
          return (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Badge variant={getLevelBadgeColor(s.adminRole.level) as any}>
                  {levelLabels[s.adminRole.level || ''] || s.adminRole.level || s.adminRole.name}
                </Badge>
                {permCount > 0 && (
                  <span className="text-[10px] font-medium text-text-muted bg-surface-muted px-1.5 py-0.5 rounded">
                    {permCount} perms
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">{s.adminRole.name}</span>
                {s.adminRole.permissionsData && (
                  <button
                    type="button"
                    onClick={() => setPermissionsPreview({ open: true, adminRole: s.adminRole })}
                    className="text-[10px] text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-0.5"
                  >
                    <Info size={10} />
                    details
                  </button>
                )}
              </div>
            </div>
          );
        }
        return <span className="text-text-muted text-xs italic">No role assigned</span>;
      },
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
      header: 'Last Login',
      render: (s) => (
        <span className="text-sm text-text-muted">
          {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : <span className="italic">Never</span>}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (s) => (
        <span className="text-sm text-text-muted">{new Date(s.createdAt).toLocaleDateString()}</span>
      ),
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

      {/* Create/Edit Modal */}
      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name || editing.email}` : 'Add Sub-admin'}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editing ? 'Save changes' : 'Create sub-admin'}
        wide
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
          label="Role & Permissions"
          hint="Assign a role to control what this sub-admin can view, modify, and delete across all sections."
        >
          {customRoles.length === 0 ? (
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 space-y-2">
              <p className="text-sm font-medium text-warning-800">No roles created yet</p>
              <p className="text-xs text-warning-700">
                You need to create a role first with specific permissions (View, Create, Edit, Delete, Approve, etc.) for different sections (Products, Orders, Customers, Reports, Settings...).
              </p>
              <a
                href="/roles"
                className="inline-flex items-center gap-1.5 mt-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
              >
                <KeyRound size={13} />
                Go to Roles → Create a Role with Permissions
              </a>
            </div>
          ) : (
            <FormSelect
              value={form.adminRoleId}
              onChange={(e) => setForm((f) => ({ ...f, adminRoleId: e.target.value }))}
            >
              <option value="">No role (full super admin access)</option>
              {customRoles.map((r) => {
                const { enabled, total } = getPermissionCount(r);
                return (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.level && `(${r.level})`} — {enabled}/{total} permissions enabled
                  </option>
                );
              })}
            </FormSelect>
          )}
        </FormField>

        {/* Show selected role's permissions preview */}
        {form.adminRoleId && (() => {
          const selectedRole = roles.find((r) => r.id === form.adminRoleId);
          if (!selectedRole?.permissionsData) return null;
          return (
            <div className="rounded-lg border border-border bg-surface-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">
                  Permissions for: {selectedRole.name}
                </p>
                {selectedRole.level && (
                  <Badge variant={getLevelBadgeColor(selectedRole.level) as any} className="text-xs">
                    {selectedRole.level}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(selectedRole.permissionsData).map(([section, actions]) => {
                  const enabledActions = Object.entries(actions).filter(([, v]) => v);
                  if (enabledActions.length === 0) return null;
                  return (
                    <div key={section} className="space-y-1">
                      <p className="text-xs font-semibold text-text-primary capitalize">{section}</p>
                      <div className="flex flex-wrap gap-1">
                        {enabledActions.map(([action]) => (
                          <span
                            key={action}
                            className="text-[10px] bg-primary-50 text-primary-700 border border-primary-200 px-1.5 py-0.5 rounded font-medium"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedRole.description && (
                <p className="text-xs text-text-muted italic">{selectedRole.description}</p>
              )}
            </div>
          );
        })()}

        {!form.adminRoleId && customRoles.length > 0 && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-xs text-blue-800">
              <strong>No role selected</strong> — This sub-admin will have <strong>full super admin access</strong> to all sections. Select a role above to restrict their permissions.
            </p>
          </div>
        )}

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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Remove sub-admin"
        message={`Remove admin access for ${editing?.email}? Their account will be demoted to a regular customer and disabled. Audit history will be preserved.`}
        confirmLabel="Remove access"
      />

      {/* Permissions Preview Modal */}
      <ActionModal
        open={permissionsPreview.open}
        onClose={() => setPermissionsPreview({ open: false, adminRole: null })}
        title={`Permissions - ${permissionsPreview.adminRole?.name}`}
      >
        {permissionsPreview.adminRole?.permissionsData && (
          <div className="space-y-4">
            {Object.entries(permissionsPreview.adminRole.permissionsData).map(([section, actions]) => {
              const enabled = Object.entries(actions).filter(([, perm]) => perm).length;
              if (enabled === 0) return null;
              return (
                <div key={section}>
                  <h4 className="font-medium text-text-primary capitalize mb-2">
                    {section} ({enabled}/{Object.keys(actions).length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(actions)
                      .filter(([, perm]) => perm)
                      .map(([action]) => (
                        <span
                          key={action}
                          className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded"
                        >
                          {action}
                        </span>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ActionModal>

      {/* Temporary Password Modal */}
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
