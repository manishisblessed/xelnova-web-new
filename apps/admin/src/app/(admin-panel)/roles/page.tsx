'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormTextarea, FormSelect } from '@/components/dashboard/form-field';
import { PermissionMatrix, PermissionData } from '@/components/dashboard/permission-matrix';
import { RoleTemplates } from '@/components/dashboard/role-templates';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiCreate, apiUpdate, apiDelete, apiGet } from '@/lib/api';
import type { Column } from '@/components/dashboard/data-table';

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: string;
  permissions: string;
  permissionsData: PermissionData;
  isSystem: boolean;
  isTemplate: boolean;
  users: number;
  createdAt: string;
}

interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
  level: string;
  permissionsData: PermissionData;
}

interface FormState {
  name: string;
  description: string;
  level: string;
  permissionsData: PermissionData;
}

const DEFAULT_PERMISSIONS: PermissionData = {
  products: { view: false, create: false, edit: false, delete: false, approve: false, reject: false, feature: false },
  orders: { view: false, edit: false, cancel: false, refund: false, exportData: false },
  customers: { view: false, edit: false, ban: false, exportData: false },
  brands: { view: false, create: false, edit: false, delete: false, approve: false },
  categories: { view: false, create: false, edit: false, delete: false },
  coupons: { view: false, create: false, edit: false, delete: false },
  reports: { view: false, export: false },
  roles: { view: false, create: false, edit: false, delete: false, assignRoles: false },
  settings: { view: false, edit: false },
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  level: 'VIEWER',
  permissionsData: DEFAULT_PERMISSIONS,
};

const LEVEL_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin (Full Access)' },
  { value: 'MANAGER', label: 'Manager (Most Permissions)' },
  { value: 'EDITOR', label: 'Editor (Limited Permissions)' },
  { value: 'VIEWER', label: 'Viewer (Read-Only)' },
];

export default function RolesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [refreshKey, setRefreshKey] = useState(0);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Load role templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await apiGet<RoleTemplate[]>('admin/roles/templates');
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description || '',
      level: r.level,
      permissionsData: r.permissionsData,
    });
    setModalOpen(true);
  };

  const applyTemplate = (template: RoleTemplate) => {
    setForm({
      name: '',
      description: template.description || '',
      level: template.level,
      permissionsData: JSON.parse(JSON.stringify(template.permissionsData)),
    });
  };

  const handleSubmit = async () => {
    try {
      if (!form.name.trim()) {
        toast.error('Role name is required');
        return;
      }

      const payload = {
        name: form.name,
        description: form.description || null,
        level: form.level,
        permissionsData: form.permissionsData,
      };

      if (editing) {
        await apiUpdate('admin/roles', editing.id, payload);
        toast.success('Role updated');
      } else {
        await apiCreate('admin/roles', payload);
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
      await apiDelete('admin/roles', editing.id);
      toast.success('Role deleted');
      setDeleteOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.name}</span>
          {r.description && <span className="text-xs text-text-muted">{r.description}</span>}
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (r) => {
        const colors: Record<string, string> = {
          SUPER_ADMIN: 'danger',
          MANAGER: 'warning',
          EDITOR: 'info',
          VIEWER: 'success',
        };
        return <Badge variant={colors[r.level] as any}>{r.level}</Badge>;
      },
    },
    {
      key: 'users',
      header: 'Assigned To',
      render: (r) => (
        <span className={r.users > 0 ? 'font-medium' : 'text-text-muted'}>
          {r.users} user{r.users !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <AdminListPage<Role>
        title="Admin Roles"
        section="admin/roles"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name', 'description']}
        onAdd={openAdd}
        addLabel="Create Role"
        refreshTrigger={refreshKey}
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
              title="Edit role"
            >
              <Pencil size={15} />
            </button>
            {!r.isSystem && !r.isTemplate && (
              <button
                onClick={() => {
                  setEditing(r);
                  setDeleteOpen(true);
                }}
                className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"
                title="Delete role"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      />

      {/* Modal for creating/editing roles */}
      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Create Role'}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save changes' : 'Create role'}
        wide
      >
        <div className="space-y-4">
          {/* Show templates on create */}
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Quick Start - Choose a Template
              </label>
              <RoleTemplates
                templates={templates}
                onApply={applyTemplate}
                loading={templatesLoading}
              />
            </div>
          )}

          {/* Basic info */}
          <FormField label="Role Name">
            <FormInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Product Manager, Support Agent"
            />
          </FormField>

          <FormField label="Description">
            <FormTextarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What is this role responsible for?"
              rows={2}
            />
          </FormField>

          <FormField label="Role Level" hint="Determines the hierarchy and inheritance">
            <FormSelect
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          {/* Permission matrix */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Permissions
            </label>
            <PermissionMatrix
              permissions={form.permissionsData}
              onChange={(perms) => setForm((f) => ({ ...f, permissionsData: perms }))}
              disabled={false}
            />
          </div>
        </div>
      </ActionModal>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Role"
        message={`Delete role "${editing?.name}"? This will affect ${editing?.users || 0} assigned user(s).`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
