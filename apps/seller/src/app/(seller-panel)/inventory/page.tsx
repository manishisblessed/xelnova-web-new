'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DataTable, type Column } from '@/components/dashboard/data-table';
import { Badge, Button, Input, Modal } from '@xelnova/ui';
import {
  apiCreateProduct,
  apiDeleteProduct,
  apiGetProducts,
  apiUpdateProduct,
  apiUploadImage,
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface CategoryNode {
  id: string;
  name: string;
  children?: { id: string; name: string }[];
}

interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  status: string;
  images?: string[];
  category?: { name: string } | null;
  createdAt: string;
}

function productStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  if (status === 'DRAFT') return 'info';
  return 'default';
}

function flattenCategories(nodes: CategoryNode[]): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const c of nodes) {
    out.push({ id: c.id, name: c.name });
    if (c.children?.length) {
      for (const ch of c.children) {
        out.push({ id: ch.id, name: `${c.name} › ${ch.name}` });
      }
    }
  }
  return out;
}

function normalizeProducts(res: unknown): SellerProduct[] {
  if (Array.isArray(res)) return res as SellerProduct[];
  if (res && typeof res === 'object' && 'items' in res && Array.isArray((res as { items: unknown }).items)) {
    return (res as { items: SellerProduct[] }).items;
  }
  return [];
}

export default function SellerInventoryPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<SellerProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<SellerProduct | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCompare, setFormCompare] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formShort, setFormShort] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadProducts = useCallback(() => {
    setLoading(true);
    apiGetProducts({ limit: '100' })
      .then((res) => {
        setProducts(normalizeProducts(res));
      })
      .catch((err: Error) => {
        toast.error(err.message || 'Failed to load products');
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCategories(flattenCategories(json.data as CategoryNode[]));
        }
      })
      .catch(() => toast.error('Could not load categories'));
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormPrice('');
    setFormCompare('');
    setFormStock('');
    setFormCategoryId('');
    setFormShort('');
    setFormImages([]);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (p: SellerProduct) => {
    setEditProduct(p);
    setFormName(p.name);
    setFormPrice(String(p.price));
    setFormCompare(p.compareAtPrice != null ? String(p.compareAtPrice) : '');
    setFormStock(String(p.stock));
    setFormCategoryId('');
    setFormShort('');
    setFormImages(p.images ?? []);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = 5 - formImages.length;
    if (remaining <= 0) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        const { url } = await apiUploadImage(file);
        urls.push(url);
      }
      setFormImages((prev) => [...prev, ...urls]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submitCreate = async () => {
    const price = Number(formPrice);
    const stock = Number(formStock);
    if (!formName.trim() || !formCategoryId) {
      toast.error('Name and category are required');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }
    setSaving(true);
    try {
      await apiCreateProduct({
        name: formName.trim(),
        price,
        categoryId: formCategoryId,
        stock: Number.isNaN(stock) ? 0 : stock,
        compareAtPrice: formCompare ? Number(formCompare) : undefined,
        shortDescription: formShort.trim() || undefined,
        images: formImages.length ? formImages : undefined,
      });
      toast.success('Product created');
      setCreateOpen(false);
      resetForm();
      loadProducts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editProduct) return;
    const price = Number(formPrice);
    const stock = Number(formStock);
    if (!formName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }
    setSaving(true);
    try {
      await apiUpdateProduct(editProduct.id, {
        name: formName.trim(),
        price,
        stock: Number.isNaN(stock) ? 0 : stock,
        compareAtPrice: formCompare ? Number(formCompare) : undefined,
        shortDescription: formShort.trim() || undefined,
        images: formImages,
        ...(formCategoryId ? { categoryId: formCategoryId } : {}),
      });
      toast.success('Product updated');
      setEditProduct(null);
      resetForm();
      loadProducts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteProduct) return;
    setSaving(true);
    try {
      await apiDeleteProduct(deleteProduct.id);
      toast.success('Product deleted');
      setDeleteProduct(null);
      loadProducts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete product');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<SellerProduct>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-surface-muted overflow-hidden shrink-0">
            {row.images?.[0] ? (
              <img src={row.images[0]} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => `₹${Number(row.price).toLocaleString('en-IN')}`,
    },
    { key: 'stock', header: 'Stock' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={productStatusVariant(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => row.category?.name ?? '—',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[140px]',
      render: (row) => (
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={() => setDeleteProduct(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const formFields = (
    <div className="space-y-4">
      <Input label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Price (₹)"
          type="number"
          min={0}
          step="0.01"
          value={formPrice}
          onChange={(e) => setFormPrice(e.target.value)}
        />
        <Input
          label="Compare at (₹)"
          type="number"
          min={0}
          step="0.01"
          value={formCompare}
          onChange={(e) => setFormCompare(e.target.value)}
        />
      </div>
      <Input label="Stock" type="number" min={0} value={formStock} onChange={(e) => setFormStock(e.target.value)} />

      {/* Image uploader */}
      <div>
        <label className="text-xs text-text-muted block mb-1.5">Product images (up to 5)</label>
        <div className="flex flex-wrap gap-2">
          {formImages.map((url, i) => (
            <div key={url} className="relative group h-20 w-20 rounded-lg overflow-hidden border border-border bg-surface-muted">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
          {formImages.length < 5 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-surface-muted text-text-muted transition-colors hover:border-primary-500 hover:text-primary-500">
              {uploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px]">Upload</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleImageUpload(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      {createOpen && (
        <div>
          <label className="text-xs text-text-muted block mb-1">Category</label>
          <select
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary"
            value={formCategoryId}
            onChange={(e) => setFormCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {editProduct && (
        <div>
          <label className="text-xs text-text-muted block mb-1">Change category (optional)</label>
          <select
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary"
            value={formCategoryId}
            onChange={(e) => setFormCategoryId(e.target.value)}
          >
            <option value="">Keep current</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-xs text-text-muted block mb-1">Short description</label>
        <textarea
          className="w-full min-h-[80px] rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          placeholder="Optional"
          value={formShort}
          onChange={(e) => setFormShort(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <>
      <DashboardHeader title="Inventory" />
      <div className="p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-text-muted">Manage your products and stock.</p>
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add product
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-surface p-6 shadow-card"
        >
          <DataTable
            columns={columns}
            data={products}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage="No products yet"
          />
        </motion.div>
      </div>

      <Modal open={createOpen} onClose={() => !saving && setCreateOpen(false)} title="Add product" size="lg">
        {formFields}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={submitCreate} disabled={saving}>
            {saving ? 'Saving…' : 'Create'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!editProduct} onClose={() => !saving && setEditProduct(null)} title="Edit product" size="lg">
        {formFields}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setEditProduct(null)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={submitEdit} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!deleteProduct} onClose={() => !saving && setDeleteProduct(null)} title="Delete product?" size="sm">
        <p className="text-secondary-300 text-sm">
          This will permanently remove{' '}
          <span className="text-white font-medium">{deleteProduct?.name}</span> from your catalog.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setDeleteProduct(null)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={confirmDelete} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
