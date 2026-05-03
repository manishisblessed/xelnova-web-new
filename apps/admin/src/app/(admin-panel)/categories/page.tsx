'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/dashboard/form-field';
import { Pencil, Trash2, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiCreate, apiUpdate, apiDelete, apiGet } from '@/lib/api';
import { CategorySelector } from '@/components/category-selector';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children?: Category[];
  _count?: { products: number };
}

type CategoryRow = Category & { parentDisplay: string };

function flattenCategoryTree(nodes: Category[]): Category[] {
  const flat: Category[] = [];
  function walk(list: Category[]) {
    for (const n of list) {
      flat.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return flat;
}

function normalizeCategories(rows: Category[]): CategoryRow[] {
  const flat = flattenCategoryTree(rows);
  
  // Build a map to get the full parent path for each category
  const getParentPath = (categoryId: string, nameById: Map<string, string>, parentById: Map<string, string>): string => {
    const path: string[] = [];
    let currentId: string | undefined = categoryId;
    
    while (currentId) {
      const parentId = parentById.get(currentId);
      if (!parentId) break;
      const parentName = nameById.get(parentId);
      if (parentName) {
        path.unshift(parentName);
      }
      currentId = parentId;
    }
    
    return path.length > 0 ? path.join(' › ') : '—';
  };
  
  const nameById = new Map(flat.map((c) => [c.id, c.name]));
  const parentById = new Map(flat.map((c) => [c.id, c.parentId]).filter(([, p]) => p !== null) as [string, string][]);
  
  return flat.map((c) => ({
    ...c,
    parentDisplay: c.parentId ? getParentPath(c.id, nameById, parentById) : '—',
  }));
}

function descendantIdSet(tree: Category[], targetId: string): Set<string> {
  const blocked = new Set<string>();
  function find(nodes: Category[]): Category | null {
    for (const n of nodes) {
      if (n.id === targetId) return n;
      const d = find(n.children ?? []);
      if (d) return d;
    }
    return null;
  }
  const node = find(tree);
  function collect(n: Category) {
    blocked.add(n.id);
    for (const ch of n.children ?? []) collect(ch);
  }
  if (node) collect(node);
  return blocked;
}

export default function CategoriesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState({ name: '', description: '', image: '', parentId: '' });
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);

  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    apiGet<Category[]>('categories')
      .then((data) => {
        if (!cancelled) setCategoryTree(data);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load categories'));
    return () => {
      cancelled = true;
    };
  }, [modalOpen]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', image: '', parentId: '' });
    setModalOpen(true);
  };

  const openEdit = (c: CategoryRow) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description ?? '',
      image: c.image ?? '',
      parentId: c.parentId ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const description = form.description.trim();
      const image = form.image.trim();
      if (editing) {
        await apiUpdate('categories', editing.id, {
          name,
          ...(description ? { description } : { description: '' }),
          ...(image ? { image } : { image: '' }),
          parentId: form.parentId || '',
        });
        toast.success('Category updated');
      } else {
        await apiCreate('categories', {
          name,
          ...(description ? { description } : {}),
          ...(image ? { image } : {}),
          ...(form.parentId ? { parentId: form.parentId } : {}),
        });
        toast.success('Category created');
      }
      setRefreshTrigger((n) => n + 1);
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await apiDelete('categories', editing.id);
      toast.success('Category deleted');
      setRefreshTrigger((n) => n + 1);
      setDeleteOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const parentOptions = useMemo(() => {
    const exclude = editing ? descendantIdSet(categoryTree, editing.id) : new Set<string>();
    
    // Filter out the editing category and its descendants from the tree
    const filterTree = (nodes: Category[]): Category[] => {
      return nodes
        .filter((c) => !exclude.has(c.id))
        .map((c) => ({
          ...c,
          children: c.children ? filterTree(c.children) : undefined,
        }));
    };
    
    return filterTree(categoryTree);
  }, [categoryTree, editing]);

  const columns: Column<CategoryRow>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="font-mono text-xs text-text-muted">{r.slug}</span> },
    {
      key: 'description',
      header: 'Description',
      render: (r) => (
        <span className="line-clamp-2 text-sm text-text-secondary max-w-[240px]">{r.description ?? '—'}</span>
      ),
    },
    { key: 'parentDisplay', header: 'Parent', render: (r) => <span className="text-sm">{r.parentDisplay}</span> },
    {
      key: '_count',
      header: 'Products',
      render: (r) => <span className="font-medium">{r._count?.products ?? 0}</span>,
    },
  ];

  return (
    <>
      <AdminListPage<CategoryRow>
        title="Categories"
        section="categories"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name', 'slug']}
        onAdd={openAdd}
        addLabel="Add Category"
        refreshTrigger={refreshTrigger}
        normalizeItems={normalizeCategories}
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(r);
                setDeleteOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      />
      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Category' : 'Add Category'}
        onSubmit={handleSave}
        loading={saving}
      >
        <div className="space-y-4">
          <FormField label="Parent (optional)">
            <CategorySelector
              categories={parentOptions}
              value={form.parentId}
              onChange={(id) => setForm((f) => ({ ...f, parentId: id }))}
              placeholder="None — this will be a root category"
              allowParentSelection
            />
          </FormField>

          {form.parentId && (
            <div className="rounded-lg bg-primary-50 border border-primary-100 px-3 py-2 flex items-center gap-2">
              <FolderTree size={14} className="text-primary-600 shrink-0" />
              <p className="text-xs text-primary-700">
                This will be created as a <strong>subcategory</strong> under the selected parent.
              </p>
            </div>
          )}

          <FormField label="Name *">
            <FormInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={form.parentId ? 'e.g., Mobile Phones, Accessories' : 'e.g., Electronics, Fashion, Books'}
            />
            {form.name.trim() && (
              <p className="mt-1 text-xs text-text-muted">
                URL: <span className="font-mono text-primary-600">/category/{form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}</span>
              </p>
            )}
          </FormField>

          {editing && (
            <FormField label="Slug">
              <FormInput value={editing.slug} readOnly className="bg-surface-muted font-mono text-xs" />
            </FormField>
          )}

          <FormField label="Description (optional)">
            <FormTextarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What products will customers find in this category?"
              rows={2}
            />
          </FormField>
        </div>
      </ActionModal>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${editing?.name}"?`}
        loading={deleting}
      />
    </>
  );
}
