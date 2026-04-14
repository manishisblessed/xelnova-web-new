'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ImagePlus, Pencil, Plus, Trash2, X, Crown, Loader2, Layers, GripVertical, Upload, Camera, Ruler, Image as ImageIcon, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DataTable, type Column } from '@/components/dashboard/data-table';
import { Badge, Button, Input, Modal } from '@xelnova/ui';
import {
  apiCreateProduct,
  apiDeleteProduct,
  apiGetProduct,
  apiGetProducts,
  apiUpdateProduct,
  apiUploadImage,
} from '@/lib/api';
import { useSellerProfile } from '@/lib/seller-profile-context';
import { VerificationBanner } from '@/components/dashboard/verification-banner';
import { publicApiBase } from '@/lib/public-api-base';
import {
  formRowsToVariantGroups,
  makeImageId,
  MAX_PRODUCT_IMAGES,
  MAX_VARIANT_IMAGES,
  newFormRow,
  newFormValue,
  newSizeChartColumn,
  productImagesToUrls,
  urlsToProductImages,
  variantGroupsToFormRows,
  type FormVariantRow,
  type FormVariantValue,
  type ProductImage,
  type SizeChartColumn,
} from '@/lib/product-variants';

const API_URL = publicApiBase();

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
  variants?: unknown;
  categoryId?: string;
  category?: { name: string } | null;
  createdAt: string;
  rejectionReason?: string | null;
}

function productStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'ON_HOLD') return 'warning';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  if (status === 'DRAFT') return 'info';
  return 'default';
}

function productStatusLabel(status: string): string {
  if (status === 'ON_HOLD') return 'ON HOLD';
  return status;
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

// ─── Image Gallery Component ───

type UploadingImage = {
  id: string;
  file: File;
  preview: string;
  progress: 'uploading' | 'done' | 'error';
};

function ProductImageGallery({
  images,
  onImagesChange,
  uploading,
  setUploading,
}: {
  images: ProductImage[];
  onImagesChange: (imgs: ProductImage[]) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadingImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  const canAdd = images.length + uploadQueue.length < MAX_PRODUCT_IMAGES;

  const handleFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please select image files (JPG, PNG, WebP)');
      return;
    }
    const slotsLeft = MAX_PRODUCT_IMAGES - images.length - uploadQueue.length;
    const batch = imageFiles.slice(0, slotsLeft);
    if (imageFiles.length > slotsLeft) {
      toast.info(`Only ${slotsLeft} more image${slotsLeft === 1 ? '' : 's'} allowed (max ${MAX_PRODUCT_IMAGES})`);
    }
    if (batch.length === 0) return;

    const queueItems: UploadingImage[] = batch.map((file) => ({
      id: makeImageId(),
      file,
      preview: URL.createObjectURL(file),
      progress: 'uploading' as const,
    }));

    setUploadQueue((prev) => [...prev, ...queueItems]);
    setUploading(true);

    const results: ProductImage[] = [];

    for (const item of queueItems) {
      try {
        const { url, publicId } = await apiUploadImage(item.file);
        results.push({ id: item.id, url, publicId });
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 'done' } : q)),
        );
      } catch (e) {
        toast.error(`Failed to upload ${item.file.name}`);
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 'error' } : q)),
        );
      }
    }

    // Small delay so user sees the green checkmarks before they disappear
    await new Promise((r) => setTimeout(r, 400));
    setUploadQueue((prev) => prev.filter((q) => q.progress === 'uploading'));
    if (results.length > 0) {
      onImagesChange([...images, ...results]);
    }
    setUploading(false);
  }, [images, uploadQueue.length, onImagesChange, setUploading]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const removeImage = (id: string) => {
    const filtered = images.filter((img) => img.id !== id);
    onImagesChange(filtered);
    setPreviewIdx((p) => Math.min(p, Math.max(0, filtered.length - 1)));
  };

  const promoteToMain = (idx: number) => {
    if (idx === 0 || idx >= images.length) return;
    const next = [...images];
    const [promoted] = next.splice(idx, 1);
    next.unshift(promoted);
    onImagesChange(next);
    setPreviewIdx(0);
  };

  const previewImage = images[previewIdx] || images[0];

  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-primary-500" />
            Product Gallery
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            The first image is the hero. Drag to reorder. Up to {MAX_PRODUCT_IMAGES} images.
          </p>
        </div>
        <span className="text-[11px] font-medium tabular-nums text-text-muted bg-surface rounded-full px-2 py-0.5 border border-border">
          {images.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>

      {/* Hero preview */}
      <div
        className={`relative aspect-[4/3] max-h-56 w-full overflow-hidden rounded-xl border-2 transition-all duration-200 ${
          dragOver
            ? 'border-primary-500 bg-primary-50/50 ring-4 ring-primary-500/10'
            : 'border-border bg-surface'
        } flex items-center justify-center`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {previewImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt=""
              className="max-h-full max-w-full object-contain p-2 transition-opacity"
            />
            {previewIdx === 0 && (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-white shadow-lg shadow-amber-500/25">
                <Crown className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Main</span>
              </div>
            )}
          </>
        ) : dragOver ? (
          <div className="flex flex-col items-center gap-2 p-6 text-primary-600 animate-pulse">
            <Upload className="h-10 w-10" />
            <span className="text-sm font-medium">Drop images here</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 p-8 text-text-muted hover:text-primary-600 transition-colors group"
          >
            <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-current flex items-center justify-center group-hover:border-primary-500 transition-colors">
              <ImagePlus className="h-7 w-7" />
            </div>
            <div className="text-center">
              <span className="text-sm font-medium block">Click to add images</span>
              <span className="text-[11px] opacity-70">or drag & drop files here</span>
            </div>
          </button>
        )}
      </div>

      {/* Thumbnails row — reorderable */}
      {(images.length > 0 || uploadQueue.length > 0) && (
        <div className="space-y-2">
          <Reorder.Group
            axis="x"
            values={images}
            onReorder={onImagesChange}
            className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin"
          >
            {images.map((img, i) => (
              <Reorder.Item
                key={img.id}
                value={img}
                className="relative shrink-0"
                whileDrag={{ scale: 1.08, zIndex: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
              >
                <div
                  className={`group relative h-[72px] w-[72px] overflow-hidden rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all duration-150 ${
                    previewIdx === i
                      ? 'border-primary-500 ring-2 ring-primary-500/20'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewIdx(i)}
                    className="block h-full w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>

                  {/* Main badge */}
                  {i === 0 && (
                    <div className="absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-white shadow">
                      <Crown className="h-2.5 w-2.5" />
                    </div>
                  )}

                  {/* Promote to main (hover) */}
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); promoteToMain(i); }}
                      className="absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-white/90 text-amber-600 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500 hover:text-white"
                      title="Set as main image"
                    >
                      <Crown className="h-2.5 w-2.5" />
                    </button>
                  )}

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>

                  {/* Drag handle */}
                  <div className="absolute bottom-0 inset-x-0 flex justify-center pb-0.5 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
                    <GripVertical className="h-3 w-3 text-white drop-shadow" />
                  </div>

                  {/* Position number */}
                  <div className="absolute bottom-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded bg-black/50 px-0.5 text-[9px] font-bold text-white tabular-nums">
                    {i + 1}
                  </div>
                </div>
              </Reorder.Item>
            ))}

            {/* Upload queue (non-draggable) */}
            <AnimatePresence>
              {uploadQueue.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt="" className="h-full w-full object-cover opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.progress === 'uploading' && (
                      <div className="flex flex-col items-center gap-0.5">
                        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                        <span className="text-[8px] font-bold text-primary-700 uppercase tracking-wider">Uploading</span>
                      </div>
                    )}
                    {item.progress === 'done' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center shadow"
                      >
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                    )}
                    {item.progress === 'error' && (
                      <div className="h-7 w-7 rounded-full bg-red-500 flex items-center justify-center">
                        <X className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add more button */}
            {canAdd && !uploading && images.length > 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-text-muted hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[9px] font-semibold">Add</span>
              </button>
            )}
          </Reorder.Group>

          <p className="text-[10px] text-text-muted flex items-center gap-1">
            <GripVertical className="h-3 w-3 inline" />
            Drag thumbnails to reorder. First image = main listing photo.
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) handleFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ─── Main Page ───

export default function SellerInventoryPage() {
  const { isApproved } = useSellerProfile();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<SellerProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<SellerProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCompare, setFormCompare] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formShort, setFormShort] = useState('');
  const [formImages, setFormImages] = useState<ProductImage[]>([]);
  const [formVariantRows, setFormVariantRows] = useState<FormVariantRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDesc, setFormMetaDesc] = useState('');
  const [formHsnCode, setFormHsnCode] = useState('');
  const [formGstRate, setFormGstRate] = useState('');
  const [formLowStock, setFormLowStock] = useState('5');
  const [formWeight, setFormWeight] = useState('');
  const [formDimensions, setFormDimensions] = useState('');
  
  // Return/Cancellation/Replacement policy
  const [formIsCancellable, setFormIsCancellable] = useState(true);
  const [formIsReturnable, setFormIsReturnable] = useState(true);
  const [formIsReplaceable, setFormIsReplaceable] = useState(false);
  const [formReturnWindow, setFormReturnWindow] = useState('7');
  const [formCancellationWindow, setFormCancellationWindow] = useState('0');

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
    setFormVariantRows([]);
    setFormMetaTitle('');
    setFormMetaDesc('');
    setFormHsnCode('');
    setFormGstRate('');
    setFormLowStock('5');
    setFormWeight('');
    setFormDimensions('');
    setFormIsCancellable(true);
    setFormIsReturnable(true);
    setFormIsReplaceable(false);
    setFormReturnWindow('7');
    setFormCancellationWindow('0');
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
    setFormImages(urlsToProductImages(p.images));
    setFormVariantRows(variantGroupsToFormRows(p.variants));
    setEditLoading(true);
    apiGetProduct(p.id)
      .then((fullUnknown) => {
        const full = fullUnknown as Record<string, unknown>;
        setFormName(String(full.name ?? p.name));
        setFormPrice(String(full.price ?? p.price));
        setFormCompare(full.compareAtPrice != null ? String(full.compareAtPrice) : '');
        setFormStock(String(full.stock ?? p.stock));
        setFormCategoryId(String(full.categoryId ?? ''));
        setFormShort(String(full.shortDescription ?? ''));
        setFormImages(urlsToProductImages(full.images as string[] | undefined));
        setFormVariantRows(variantGroupsToFormRows(full.variants));
        setFormMetaTitle(String(full.metaTitle ?? ''));
        setFormMetaDesc(String(full.metaDescription ?? ''));
        setFormHsnCode(String(full.hsnCode ?? ''));
        setFormGstRate(full.gstRate != null ? String(full.gstRate) : '');
        setFormLowStock(String(full.lowStockThreshold ?? '5'));
        setFormWeight(full.weight != null ? String(full.weight) : '');
        setFormDimensions(String(full.dimensions ?? ''));
        setFormIsCancellable(full.isCancellable ?? true);
        setFormIsReturnable(full.isReturnable ?? true);
        setFormIsReplaceable(full.isReplaceable ?? false);
        setFormReturnWindow(String(full.returnWindow ?? '7'));
        setFormCancellationWindow(String(full.cancellationWindow ?? '0'));
      })
      .catch((err: Error) => {
        toast.error(err.message || 'Could not load product details');
      })
      .finally(() => setEditLoading(false));
  };

  const addVariantRow = () => {
    setFormVariantRows((prev) => [...prev, newFormRow()]);
  };

  const updateVariantRow = (id: string, patch: Partial<FormVariantRow>) => {
    setFormVariantRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeVariantRow = (id: string) => {
    setFormVariantRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addVariantValue = (rowId: string) => {
    setFormVariantRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, values: [...r.values, newFormValue()] } : r)),
    );
  };

  const updateVariantValue = (rowId: string, valId: string, patch: Partial<FormVariantValue>) => {
    setFormVariantRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, values: r.values.map((v) => (v.id === valId ? { ...v, ...patch } : v)) }
          : r,
      ),
    );
  };

  const removeVariantValue = (rowId: string, valId: string) => {
    setFormVariantRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, values: r.values.filter((v) => v.id !== valId) } : r)),
    );
  };

  const toggleSizeChart = (rowId: string) => {
    setFormVariantRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const enabled = !r.sizeChartEnabled;
        return {
          ...r,
          sizeChartEnabled: enabled,
          sizeChartColumns: enabled && r.sizeChartColumns.length === 0
            ? [newSizeChartColumn()]
            : r.sizeChartColumns,
        };
      }),
    );
  };

  const addSizeChartColumn = (rowId: string) => {
    setFormVariantRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, sizeChartColumns: [...r.sizeChartColumns, newSizeChartColumn()] }
          : r,
      ),
    );
  };

  const updateSizeChartColumn = (rowId: string, colId: string, header: string) => {
    setFormVariantRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, sizeChartColumns: r.sizeChartColumns.map((c) => (c.id === colId ? { ...c, header } : c)) }
          : r,
      ),
    );
  };

  const removeSizeChartColumn = (rowId: string, colId: string) => {
    setFormVariantRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const cols = r.sizeChartColumns.filter((c) => c.id !== colId);
        const data = { ...r.sizeChartData };
        for (const key of Object.keys(data)) {
          const cellData = { ...data[key] };
          delete cellData[colId];
          data[key] = cellData;
        }
        return { ...r, sizeChartColumns: cols, sizeChartData: data };
      }),
    );
  };

  const updateSizeChartCell = (rowId: string, valId: string, colId: string, cellValue: string) => {
    setFormVariantRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const data = { ...r.sizeChartData };
        data[valId] = { ...(data[valId] ?? {}), [colId]: cellValue };
        return { ...r, sizeChartData: data };
      }),
    );
  };

  const handleVariantImageUpload = async (rowId: string, valId: string, files: FileList) => {
    const currentImages = formVariantRows
      .find((r) => r.id === rowId)
      ?.values.find((v) => v.id === valId)?.images ?? [];
    const slotsLeft = MAX_VARIANT_IMAGES - currentImages.length;
    if (slotsLeft <= 0) return;

    const valid = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, slotsLeft);
    if (valid.length === 0) {
      toast.error('Please select image files');
      return;
    }

    const uploadPromises = valid.map((f) =>
      apiUploadImage(f).then(({ url }) => url).catch(() => null),
    );
    const urls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
    if (urls.length === 0) {
      toast.error('Failed to upload images');
      return;
    }

    setFormVariantRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              values: r.values.map((v) =>
                v.id === valId ? { ...v, images: [...v.images, ...urls].slice(0, MAX_VARIANT_IMAGES) } : v,
              ),
            }
          : r,
      ),
    );
    if (urls.length < valid.length) {
      toast.error(`${valid.length - urls.length} image(s) failed to upload`);
    }
  };

  const removeVariantImage = (rowId: string, valId: string, imgIdx: number) => {
    setFormVariantRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              values: r.values.map((v) =>
                v.id === valId ? { ...v, images: v.images.filter((_, i) => i !== imgIdx) } : v,
              ),
            }
          : r,
      ),
    );
  };

  const promoteVariantImage = (rowId: string, valId: string, imgIdx: number) => {
    if (imgIdx === 0) return;
    setFormVariantRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              values: r.values.map((v) => {
                if (v.id !== valId) return v;
                const next = [...v.images];
                const [promoted] = next.splice(imgIdx, 1);
                next.unshift(promoted);
                return { ...v, images: next };
              }),
            }
          : r,
      ),
    );
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
    const imgs = productImagesToUrls(formImages);
    const variantPayload = formRowsToVariantGroups(formVariantRows);
    setSaving(true);
    try {
      await apiCreateProduct({
        name: formName.trim(),
        price,
        categoryId: formCategoryId,
        stock: Number.isNaN(stock) ? 0 : stock,
        compareAtPrice: formCompare ? Number(formCompare) : undefined,
        shortDescription: formShort.trim() || undefined,
        images: imgs.length ? imgs : undefined,
        variants: variantPayload.length ? variantPayload : undefined,
        metaTitle: formMetaTitle.trim() || undefined,
        metaDescription: formMetaDesc.trim() || undefined,
        hsnCode: formHsnCode.trim() || undefined,
        gstRate: formGstRate ? Number(formGstRate) : undefined,
        lowStockThreshold: formLowStock ? Number(formLowStock) : undefined,
        weight: formWeight ? Number(formWeight) : undefined,
        dimensions: formDimensions.trim() || undefined,
        isCancellable: formIsCancellable,
        isReturnable: formIsReturnable,
        isReplaceable: formIsReplaceable,
        returnWindow: formReturnWindow ? Number(formReturnWindow) : 7,
        cancellationWindow: formCancellationWindow ? Number(formCancellationWindow) : 0,
      });
      toast.success('Product created and submitted for approval', { 
        description: 'Your product will be reviewed by our team and go live once approved.' 
      });
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
    const imgs = productImagesToUrls(formImages);
    const variantPayload = formRowsToVariantGroups(formVariantRows);
    setSaving(true);
    try {
      await apiUpdateProduct(editProduct.id, {
        name: formName.trim(),
        price,
        stock: Number.isNaN(stock) ? 0 : stock,
        compareAtPrice: formCompare ? Number(formCompare) : undefined,
        shortDescription: formShort.trim() || undefined,
        images: imgs,
        variants: variantPayload.length ? variantPayload : [],
        ...(formCategoryId ? { categoryId: formCategoryId } : {}),
        metaTitle: formMetaTitle.trim() || undefined,
        metaDescription: formMetaDesc.trim() || undefined,
        hsnCode: formHsnCode.trim() || undefined,
        gstRate: formGstRate ? Number(formGstRate) : undefined,
        lowStockThreshold: formLowStock ? Number(formLowStock) : undefined,
        weight: formWeight ? Number(formWeight) : undefined,
        dimensions: formDimensions.trim() || undefined,
        isCancellable: formIsCancellable,
        isReturnable: formIsReturnable,
        isReplaceable: formIsReplaceable,
        returnWindow: formReturnWindow ? Number(formReturnWindow) : 7,
        cancellationWindow: formCancellationWindow ? Number(formCancellationWindow) : 0,
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

  const toggleHold = async (product: SellerProduct) => {
    if (product.status === 'PENDING' || product.status === 'REJECTED') {
      toast.error('Cannot change status of pending or rejected products');
      return;
    }
    const newStatus = product.status === 'ON_HOLD' ? 'ACTIVE' : 'ON_HOLD';
    try {
      await apiUpdateProduct(product.id, { status: newStatus });
      toast.success(newStatus === 'ON_HOLD' ? 'Product put on hold' : 'Product activated');
      loadProducts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const canToggleHold = (product: SellerProduct) => {
    return product.status === 'ACTIVE' || product.status === 'ON_HOLD';
  };

  const columns: Column<SellerProduct>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-surface-muted overflow-hidden shrink-0">
            {row.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
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
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant={productStatusVariant(row.status)}>{productStatusLabel(row.status)}</Badge>
          {row.status === 'PENDING' && (
            <span className="text-[10px] text-warning-600">Awaiting admin review</span>
          )}
          {row.status === 'REJECTED' && row.rejectionReason && (
            <span className="text-[10px] text-danger-600 max-w-[140px] truncate" title={row.rejectionReason}>
              {row.rejectionReason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => row.category?.name ?? '—',
    },
    {
      key: 'variants',
      header: 'Variants',
      render: (row) =>
        Array.isArray(row.variants) && row.variants.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            <Layers className="h-3 w-3" />
            {row.variants.length}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[180px]',
      render: (row) => (
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {canToggleHold(row) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleHold(row)}
              title={row.status === 'ON_HOLD' ? 'Activate' : 'Put on hold'}
              className={row.status === 'ON_HOLD' ? 'border-primary-300 text-primary-600 hover:bg-primary-50' : 'border-warning-300 text-warning-600 hover:bg-warning-50'}
            >
              {row.status === 'ON_HOLD' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button type="button" variant="danger" size="sm" onClick={() => setDeleteProduct(row)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const formFields = (
    <div className="space-y-5 relative">
      {editProduct && editLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-surface/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-text-muted">Loading product…</p>
        </div>
      )}

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

      <ProductImageGallery
        images={formImages}
        onImagesChange={setFormImages}
        uploading={uploading}
        setUploading={setUploading}
      />

      <div className="rounded-xl border border-border bg-surface-muted/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-text-primary">Variants</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Each option value can have its own price, stock, and SKU. Leave blank to use the product defaults.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addVariantRow}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add option group
          </Button>
        </div>
        {formVariantRows.length === 0 ? (
          <p className="text-xs text-text-muted py-2">No variants — this is a single-SKU product.</p>
        ) : (
          <div className="space-y-4">
            {formVariantRows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-surface p-3 space-y-3"
              >
                <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_140px_auto] items-end gap-2">
                  <div>
                    <label className="text-xs text-text-muted block mb-1 whitespace-nowrap">Option name</label>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateVariantRow(row.id, { label: e.target.value })}
                      placeholder="e.g. Color, Size"
                      className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Type</label>
                    <select
                      className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary"
                      value={row.kind}
                      onChange={(e) => {
                        const kind = e.target.value as FormVariantRow['kind'];
                        const autoLabels: Record<string, string> = { color: 'Colour', size: 'Size' };
                        const patch: Partial<FormVariantRow> = { kind };
                        if (autoLabels[kind] && !row.label.trim()) {
                          patch.label = autoLabels[kind];
                        }
                        updateVariantRow(row.id, patch);
                      }}
                    >
                      <option value="color">Color (swatches)</option>
                      <option value="size">Size</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeVariantRow(row.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div>
                  <label className="text-xs text-text-muted block mb-1">Main product label <span className="opacity-60">(shown on web as the default option alongside variants)</span></label>
                  <input
                    type="text"
                    value={row.defaultLabel}
                    onChange={(e) => updateVariantRow(row.id, { defaultLabel: e.target.value })}
                    placeholder="e.g. Classic Black, Default"
                    className="w-full sm:w-1/2 rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all"
                  />
                </div>

                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-text-muted border-b border-border">
                        <th className="pb-1.5 pr-2 font-medium min-w-[110px]">Label</th>
                        {row.kind === 'color' && <th className="pb-1.5 pr-2 font-medium w-[80px]">Hex</th>}
                        <th className="pb-1.5 pr-2 font-medium min-w-[170px]" title="1 main + up to 4 supporting images">Images</th>
                        <th className="pb-1.5 pr-2 font-medium w-[90px]">Price (₹)</th>
                        <th className="pb-1.5 pr-2 font-medium w-[90px]">Compare</th>
                        <th className="pb-1.5 pr-2 font-medium w-[70px]">Stock</th>
                        <th className="pb-1.5 pr-2 font-medium w-[90px]">SKU</th>
                        <th className="pb-1.5 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {row.values.map((val) => (
                        <tr key={val.id} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 pr-2">
                            <input
                              type="text"
                              value={val.label}
                              onChange={(e) => updateVariantValue(row.id, val.id, { label: e.target.value })}
                              placeholder="e.g. Red"
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          {row.kind === 'color' && (
                            <td className="py-1.5 pr-2">
                              <div className="flex items-center gap-1">
                                {val.hex.trim() && (
                                  <span
                                    className="inline-block h-4 w-4 rounded border border-border shrink-0"
                                    style={{ background: val.hex.startsWith('#') ? val.hex : `#${val.hex}` }}
                                  />
                                )}
                                <input
                                  type="text"
                                  value={val.hex}
                                  onChange={(e) => updateVariantValue(row.id, val.id, { hex: e.target.value })}
                                  placeholder="#000"
                                  className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                                />
                              </div>
                            </td>
                          )}
                          <td className="py-1.5 pr-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              {val.images.map((img, imgIdx) => (
                                <div key={imgIdx} className={`relative group/vi h-8 w-8 shrink-0 rounded overflow-hidden border ${imgIdx === 0 ? 'border-primary-400 ring-1 ring-primary-200' : 'border-border'}`}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={img} alt="" className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center gap-0.5 bg-black/50 opacity-0 group-hover/vi:opacity-100 transition-opacity">
                                    {imgIdx !== 0 && (
                                      <button type="button" onClick={() => promoteVariantImage(row.id, val.id, imgIdx)} className="text-white" title="Set as main">
                                        <Crown className="h-2.5 w-2.5" />
                                      </button>
                                    )}
                                    <button type="button" onClick={() => removeVariantImage(row.id, val.id, imgIdx)} className="text-white">
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                  {imgIdx === 0 && <span className="absolute top-0 left-0 bg-primary-500 text-[6px] text-white px-0.5 leading-tight rounded-br">M</span>}
                                </div>
                              ))}
                              {val.images.length < MAX_VARIANT_IMAGES && (
                                <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded border-2 border-dashed border-border text-text-muted hover:border-primary-400 hover:text-primary-500 transition-colors" title={`Add images (${val.images.length}/${MAX_VARIANT_IMAGES})`}>
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { const fl = e.target.files; if (fl && fl.length > 0) handleVariantImageUpload(row.id, val.id, fl); e.target.value = ''; }} />
                                </label>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={val.price}
                              onChange={(e) => updateVariantValue(row.id, val.id, { price: e.target.value })}
                              placeholder={formPrice || 'base'}
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={val.compareAtPrice}
                              onChange={(e) => updateVariantValue(row.id, val.id, { compareAtPrice: e.target.value })}
                              placeholder={formCompare || '—'}
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={val.stock}
                              onChange={(e) => updateVariantValue(row.id, val.id, { stock: e.target.value })}
                              placeholder={formStock || 'base'}
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              type="text"
                              value={val.sku}
                              onChange={(e) => updateVariantValue(row.id, val.id, { sku: e.target.value })}
                              placeholder="optional"
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          <td className="py-1.5">
                            <button
                              type="button"
                              onClick={() => removeVariantValue(row.id, val.id)}
                              className="rounded p-1 text-text-muted hover:text-danger-600 hover:bg-danger-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Size chart editor */}
                {row.kind === 'size' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleSizeChart(row.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        row.sizeChartEnabled
                          ? 'text-primary-600'
                          : 'text-text-muted hover:text-primary-600'
                      }`}
                    >
                      <Ruler className="h-3.5 w-3.5" />
                      {row.sizeChartEnabled ? 'Size chart enabled' : 'Add size chart'}
                      <span className={`inline-block h-3 w-6 rounded-full transition-colors relative ${
                        row.sizeChartEnabled ? 'bg-primary-500' : 'bg-gray-300'
                      }`}>
                        <span className={`absolute top-0.5 h-2 w-2 rounded-full bg-white transition-transform ${
                          row.sizeChartEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`} />
                      </span>
                    </button>

                    {row.sizeChartEnabled && (
                      <div className="rounded-lg border border-primary-200 bg-primary-50/30 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-medium text-primary-700">
                            Measurement columns
                          </p>
                          <Button type="button" variant="outline" size="sm" onClick={() => addSizeChartColumn(row.id)}>
                            <Plus className="h-3 w-3 mr-1" />
                            Column
                          </Button>
                        </div>

                        {row.sizeChartColumns.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {row.sizeChartColumns.map((col) => (
                              <div key={col.id} className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={col.header}
                                  onChange={(e) => updateSizeChartColumn(row.id, col.id, e.target.value)}
                                  placeholder='e.g. "Chest (in)"'
                                  className="w-32 rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-primary outline-none focus:border-primary-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSizeChartColumn(row.id, col.id)}
                                  className="rounded p-0.5 text-text-muted hover:text-danger-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {row.sizeChartColumns.length > 0 && row.values.some((v) => v.label.trim()) && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-text-muted border-b border-primary-200">
                                  <th className="pb-1 pr-2 font-medium">Size</th>
                                  {row.sizeChartColumns.map((col) => (
                                    <th key={col.id} className="pb-1 pr-2 font-medium min-w-[80px]">
                                      {col.header || '—'}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {row.values.filter((v) => v.label.trim()).map((val) => (
                                  <tr key={val.id} className="border-b border-primary-100 last:border-0">
                                    <td className="py-1 pr-2 font-medium text-text-primary">{val.label}</td>
                                    {row.sizeChartColumns.map((col) => (
                                      <td key={col.id} className="py-1 pr-2">
                                        <input
                                          type="text"
                                          value={row.sizeChartData[val.id]?.[col.id] ?? ''}
                                          onChange={(e) => updateSizeChartCell(row.id, val.id, col.id, e.target.value)}
                                          placeholder="—"
                                          className="w-full rounded border border-border bg-white px-1.5 py-1 text-xs text-text-primary outline-none focus:border-primary-500"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Button type="button" variant="outline" size="sm" onClick={() => addVariantValue(row.id)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add value
                </Button>
              </div>
            ))}
          </div>
        )}
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

      {/* Shipping Details */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs font-semibold text-text-primary mb-3">Shipping Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Weight (kg) *</label>
            <Input type="number" step="0.01" min="0" placeholder="e.g. 0.5" value={formWeight} onChange={(e) => setFormWeight(e.target.value)} />
            <p className="text-[10px] text-text-muted mt-0.5">Package weight for shipping calculations</p>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Dimensions (L×W×H in cm) *</label>
            <Input placeholder="e.g. 30x20x15" value={formDimensions} onChange={(e) => setFormDimensions(e.target.value)} />
            <p className="text-[10px] text-text-muted mt-0.5">Length × Width × Height for shipping</p>
          </div>
        </div>
      </div>

      {/* Return/Cancellation Policy */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs font-semibold text-text-primary mb-3">Return & Cancellation Policy</p>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsCancellable}
                onChange={(e) => setFormIsCancellable(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-xs text-text-primary">Cancellable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsReturnable}
                onChange={(e) => setFormIsReturnable(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-xs text-text-primary">Returnable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsReplaceable}
                onChange={(e) => setFormIsReplaceable(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-xs text-text-primary">Replaceable</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Return Window (days)</label>
              <Input
                type="number"
                min="0"
                placeholder="7"
                value={formReturnWindow}
                onChange={(e) => setFormReturnWindow(e.target.value)}
                disabled={!formIsReturnable}
              />
              <p className="text-[10px] text-text-muted mt-0.5">Days after delivery for returns</p>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Cancellation Window (hours)</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formCancellationWindow}
                onChange={(e) => setFormCancellationWindow(e.target.value)}
                disabled={!formIsCancellable}
              />
              <p className="text-[10px] text-text-muted mt-0.5">0 = cancellable until shipped</p>
            </div>
          </div>
        </div>
      </div>

      {/* SEO & Tax Fields */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs font-semibold text-text-primary mb-3">SEO & Tax</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Meta Title</label>
            <Input placeholder="SEO title (optional)" value={formMetaTitle} onChange={(e) => setFormMetaTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">HSN Code</label>
            <Input placeholder="e.g. 6109" value={formHsnCode} onChange={(e) => setFormHsnCode(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-text-muted block mb-1">Meta Description</label>
            <Input placeholder="SEO description (optional)" value={formMetaDesc} onChange={(e) => setFormMetaDesc(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">GST Rate (%)</label>
            <Input type="number" placeholder="e.g. 18" value={formGstRate} onChange={(e) => setFormGstRate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Low Stock Threshold</label>
            <Input type="number" placeholder="5" value={formLowStock} onChange={(e) => setFormLowStock(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <DashboardHeader title="Inventory" />
      <VerificationBanner />
      <div className="p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-text-muted">Manage your products and stock.</p>
          <Button
            type="button"
            onClick={openCreate}
            disabled={!isApproved}
            title={!isApproved ? 'Account verification required' : undefined}
          >
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

      <Modal
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Add product"
        size="lg"
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
      >
        {formFields}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button type="button" onClick={submitCreate} disabled={saving || uploading}>
            {saving ? 'Saving…' : 'Create'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editProduct}
        onClose={() => !saving && !editLoading && setEditProduct(null)}
        title="Edit product"
        size="lg"
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
      >
        {formFields}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setEditProduct(null)} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button type="button" onClick={submitEdit} disabled={saving || uploading || editLoading}>
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
