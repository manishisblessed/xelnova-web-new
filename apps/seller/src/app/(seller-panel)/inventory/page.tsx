'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { ImagePlus, Pencil, Plus, Trash2, X, Crown, Loader2, Layers, GripVertical, Upload, Camera, Ruler, Image as ImageIcon, Pause, Play, Search, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, ChevronDown, ExternalLink, Film, Package2 } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DataTable, type Column } from '@/components/dashboard/data-table';
import { Badge, Button, Input, Modal } from '@xelnova/ui';
import {
  apiCreateProduct,
  apiDeleteProduct,
  apiGetBrandListingHint,
  apiGetProduct,
  apiGetProductAttributePresets,
  apiGetProducts,
  apiGetSellerBrands,
  apiUpdateProduct,
  apiUploadImage,
  apiUploadImages,
  apiUploadVideo,
  apiDeleteVideo,
  type BrandListingHint,
} from '@/lib/api';
import { useSellerProfile } from '@/lib/seller-profile-context';
import { VerificationBanner } from '@/components/dashboard/verification-banner';
import { publicApiBase } from '@/lib/public-api-base';
import { resolveStorefrontPreviewUrl } from '@/lib/storefront-url';
import { ProductVariantsExpansion } from '@/components/product-variants-expansion';
import { CategorySelector } from '@/components/category-selector';
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
import {
  BUNDLED_PRODUCT_ATTRIBUTE_PRESETS,
  CUSTOM_ATTRIBUTE_PENDING,
  CUSTOM_VALUE_PENDING,
  OTHER_VALUE_LABEL,
  getValueOptionsForKey,
  type AttributePreset,
  type ProductAttributePresetsBundle,
} from '@/lib/product-attribute-presets';
import { DEFAULT_GST_PERCENT } from '@xelnova/utils';

const API_URL = publicApiBase();

// Pricing contract: the value typed by the seller IS the GST-inclusive price
// stored in the database and shown to buyers everywhere. No conversion happens
// at the form boundary — see `packages/utils/src/index.ts`.
/** Whole non-negative integers for stock fields. */
function parseNonNegativeIntString(s: string): { ok: true; n: number } | { ok: false } {
  if (!s.trim()) return { ok: false };
  const n = Number(s);
  if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) return { ok: false };
  return { ok: true, n };
}

function validateMainProductCommerce(
  formPrice: string,
  formCompare: string,
  formStock: string,
  formSku: string,
): string | null {
  const price = Number(formPrice);
  if (Number.isNaN(price) || price < 0) {
    return 'Enter a valid selling price (₹), inclusive of GST.';
  }
  if (!formCompare.trim()) {
    return 'MRP (₹) is required. Enter a valid amount, inclusive of GST.';
  }
  const mrp = Number(formCompare);
  if (Number.isNaN(mrp) || mrp < 0) {
    return 'Enter a valid MRP (₹), inclusive of GST.';
  }
  const st = parseNonNegativeIntString(formStock);
  if (!st.ok) {
    return 'Enter a valid stock quantity (whole number, 0 or more).';
  }
  if (!formSku.trim()) {
    return 'SKU is required for this product.';
  }
  return null;
}

function validateVariantRowsCommerce(rows: FormVariantRow[]): string | null {
  for (const row of rows) {
    for (const val of row.values) {
      if (!val.label.trim()) continue;
      const name = val.label.trim();
      if (!val.price.trim()) {
        return `Variant "${name}": Price (₹) is required.`;
      }
      const p = Number(val.price);
      if (Number.isNaN(p) || p < 0) {
        return `Variant "${name}": Enter a valid Price (₹).`;
      }
      if (!val.compareAtPrice.trim()) {
        return `Variant "${name}": MRP (₹) is required.`;
      }
      const mrp = Number(val.compareAtPrice);
      if (Number.isNaN(mrp) || mrp < 0) {
        return `Variant "${name}": Enter a valid MRP (₹).`;
      }
      if (!val.stock.trim()) {
        return `Variant "${name}": Stock is required.`;
      }
      const st = parseNonNegativeIntString(val.stock);
      if (!st.ok) {
        return `Variant "${name}": Enter a valid stock quantity (whole number).`;
      }
      if (!val.sku.trim()) {
        return `Variant "${name}": SKU is required.`;
      }
    }
  }
  const payload = formRowsToVariantGroups(rows);
  for (const row of rows) {
    if (row.label.trim() && !row.values.some((v) => v.label.trim())) {
      return `Variant group "${row.label.trim()}" needs at least one value with label, price, MRP, stock, and SKU.`;
    }
  }
  if (rows.length > 0 && payload.length === 0) {
    return 'Complete each variant group: option name, at least one value, and price, MRP, stock, and SKU for every value.';
  }
  return null;
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  /** GST-inclusive selling price exactly as the seller entered it. Same value the buyer sees. */
  price: number;
  compareAtPrice?: number | null;
  /** GST percent (e.g. 18). Used for invoice/tax reporting only — `price` is already inclusive. */
  gstRate?: number | null;
  stock: number;
  status: string;
  images?: string[];
  video?: string | null;
  videoPublicId?: string | null;
  variants?: unknown;
  categoryId?: string;
  category?: { name: string } | null;
  /** Brand name set during product creation — surfaced on listing per testing observation #26. */
  brand?: string | null;
  createdAt: string;
  rejectionReason?: string | null;
  xelnovaProductId?: string | null;
  hasPendingChanges?: boolean;
  pendingChangesData?: Record<string, unknown> | null;
}

/**
 * Minimal brand shape the Add/Edit product form needs — enough to render the
 * picker and reuse the authorization certificate already on file. Mirrors the
 * payload from `GET /seller/brands`.
 */
interface SellerBrandSummary {
  id: string;
  name: string;
  slug: string;
  approved: boolean;
  authorizationCertificate?: string | null;
}

/**
 * Mirrors the backend's brand slug algorithm (see seller-dashboard.service.ts)
 * so we can match the brand currently on a product against the seller's
 * registered brands when opening the edit form.
 */
function slugifyBrandName(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const PRODUCT_DRAFT_KEY = 'xelnova:seller:product-draft:v1';

/**
 * Banner shown above the product list when an auto-saved draft exists in
 * localStorage (testing observation #12). Survives session expiry, tab
 * crashes, accidental refreshes — sellers can resume the work or discard it.
 */
function DraftBanner({
  isApproved,
  onResume,
  onDiscard,
}: {
  isApproved: boolean;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const [draft, setDraft] = useState<{ savedAt: number; name: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => {
      try {
        const raw = window.localStorage.getItem(PRODUCT_DRAFT_KEY);
        if (!raw) { setDraft(null); return; }
        const parsed = JSON.parse(raw) as { savedAt?: number; data?: Record<string, unknown> };
        const data = parsed?.data ?? (parsed as Record<string, unknown>);
        const name = (data && typeof (data as Record<string, unknown>).formName === 'string')
          ? ((data as Record<string, unknown>).formName as string).trim()
          : '';
        setDraft({ savedAt: parsed?.savedAt ?? 0, name: name || 'Untitled product' });
      } catch {
        setDraft(null);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === PRODUCT_DRAFT_KEY) read(); };
    window.addEventListener('storage', onStorage);
    const interval = window.setInterval(read, 4000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(interval);
    };
  }, []);

  if (!draft) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3"
    >
      <div className="rounded-xl bg-amber-100 p-2 shrink-0">
        <Pencil className="h-4 w-4 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          You have an unsaved product draft &mdash; <span className="font-bold">{draft.name}</span>
        </p>
        <p className="text-xs text-amber-700/90 mt-0.5">
          {draft.savedAt
            ? `Auto-saved ${new Date(draft.savedAt).toLocaleString()}`
            : 'Auto-saved earlier'}{' '}
          &mdash; resume right where you left off.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={onResume}
          disabled={!isApproved}
          title={!isApproved ? 'Account verification required' : 'Resume editing the saved draft'}
        >
          Resume
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => { onDiscard(); setDraft(null); }}
        >
          Discard
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Compact "Variants" cell for the product list. Per testing observation
 * #14 — clicking the badge opens a dropdown listing every option (e.g.
 * Color: Red / Blue / Green / Black) so the seller can see all four
 * variants without opening the editor.
 */
function VariantsCell({ variants }: { variants: unknown }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Position the popover using fixed coordinates derived from the trigger button.
  // Rendering into a portal + fixed positioning avoids the popover being clipped
  // by the table's overflow container (which was visually disturbing the row).
  const updatePosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const POPOVER_WIDTH = 260;
    const POPOVER_MAX_HEIGHT = 280;
    const GAP = 6;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const spaceBelow = viewportH - rect.bottom;
    const placeAbove = spaceBelow < POPOVER_MAX_HEIGHT && rect.top > spaceBelow;

    let left = rect.left;
    if (left + POPOVER_WIDTH > viewportW - 8) left = viewportW - POPOVER_WIDTH - 8;
    if (left < 8) left = 8;

    const top = placeAbove ? rect.top - GAP : rect.bottom + GAP;
    setCoords({ top, left, placeAbove });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, updatePosition]);

  if (!Array.isArray(variants) || variants.length === 0) {
    return <span className="text-text-muted">—</span>;
  }

  const groups = variants as Array<{ label?: string; type?: string; options?: Array<{ label?: string; hex?: string }> }>;
  const totalOptions = groups.reduce((sum, g) => sum + (g.options?.length ?? 0), 0);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
        title="Click to view variants"
      >
        <Layers className="h-3 w-3" />
        {totalOptions || groups.length}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: 260,
              maxHeight: 280,
              transform: coords.placeAbove ? 'translateY(-100%)' : undefined,
              zIndex: 1000,
            }}
            className="overflow-y-auto rounded-xl border border-border bg-white p-2.5 shadow-lg"
          >
            <div className="space-y-2">
              {groups.map((g, i) => (
                <div key={i}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    {g.label || g.type || `Group ${i + 1}`}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(g.options ?? []).map((opt, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[11px] text-text-primary"
                      >
                        {opt.hex && (
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/10"
                            style={{ backgroundColor: opt.hex }}
                          />
                        )}
                        {opt.label || '—'}
                      </span>
                    ))}
                    {(!g.options || g.options.length === 0) && (
                      <span className="text-[11px] text-text-muted">No options</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function productStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'ON_HOLD') return 'warning';
  if (status === 'PENDING') return 'warning';
  if (status === 'PENDING_BRAND_AUTHORIZATION') return 'warning';
  if (status === 'REJECTED') return 'danger';
  if (status === 'DRAFT') return 'info';
  return 'default';
}

function productStatusLabel(status: string): string {
  if (status === 'ON_HOLD') return 'ON HOLD';
  if (status === 'PENDING_BRAND_AUTHORIZATION') return 'PENDING · BRAND';
  return status;
}


function normalizeProducts(res: unknown): SellerProduct[] {
  if (Array.isArray(res)) return res as SellerProduct[];
  if (res && typeof res === 'object' && 'items' in res && Array.isArray((res as { items: unknown }).items)) {
    return (res as { items: SellerProduct[] }).items;
  }
  return [];
}

function objectToKeyValueArray(obj: Record<string, string> | null | undefined): { key: string; value: string }[] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
}

function keyValueArrayToObject(arr: { key: string; value: string }[]): Record<string, string> | undefined {
  const filtered = arr.filter(
    (item) =>
      item.key.trim() &&
      item.key.trim() !== CUSTOM_ATTRIBUTE_PENDING &&
      item.value.trim() &&
      item.value.trim() !== CUSTOM_VALUE_PENDING,
  );
  if (filtered.length === 0) return undefined;
  return Object.fromEntries(filtered.map((item) => [item.key.trim(), item.value.trim()]));
}

function specificationsToFormRows(raw: unknown): { id: string; key: string; value: string }[] {
  const mkId = () => `sp-${Math.random().toString(36).slice(2, 11)}`;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((r) => r && typeof r === 'object')
      .map((r) => {
        const o = r as Record<string, unknown>;
        return { id: mkId(), key: String(o.key ?? '').trim(), value: String(o.value ?? '').trim() };
      })
      .filter((r) => r.key || r.value);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      id: mkId(),
      key: String(key),
      value: String(value ?? ''),
    }));
  }
  return [];
}

function listingSpecsPayload(rows: { key: string; value: string }[]): { key: string; value: string }[] | undefined {
  const out = rows
    .map((r) => ({ key: r.key.trim(), value: r.value.trim() }))
    .filter((r) => r.key && r.value);
  return out.length ? out : undefined;
}

function hasListingSpecs(rows: { key: string; value: string }[]): boolean {
  return rows.some((r) => r.key.trim() && r.value.trim());
}

/**
 * Compact inline expansion panel shown below a product row.
 * Amazon Seller Central-style: editable variant rows with price/stock/MRP/status.
 */
function InlineProductExpansion({
  product,
  onEdit,
  onToggleHold,
  onDelete,
  canHold,
  onStockUpdate,
}: {
  product: SellerProduct;
  onEdit: () => void;
  onToggleHold: () => void;
  onDelete: () => void;
  canHold: boolean;
  onStockUpdate: (id: string, stock: number, price: number) => void;
}) {
  const [savingInline, setSavingInline] = useState(false);
  const [inlinePrice, setInlinePrice] = useState(String(product.price));
  const [inlineStock, setInlineStock] = useState(String(product.stock));

  const variants = product.variants;
  const hasVariants = Array.isArray(variants) && variants.length > 0;

  const flatVariants = hasVariants
    ? (variants as Array<{ type?: string; label?: string; options?: Array<{ label?: string; value?: string; sku?: string; price?: number; compareAtPrice?: number; stock?: number; images?: string[]; available?: boolean }> }>).flatMap((group, groupIndex) =>
        (group.options ?? []).map((opt, optionIndex) => ({
          variant: opt.label || opt.value || '—',
          groupLabel: group.label || group.type || 'Option',
          sku: opt.sku || '—',
          price: opt.price,
          mrp: opt.compareAtPrice,
          stock: opt.stock,
          image: opt.images?.[0],
          active: opt.available !== false,
          groupIndex,
          optionIndex,
        })),
      )
    : [];

  const handleVariantUpdate = async (groupIndex: number, optionIndex: number, updates: { price?: number; stock?: number; available?: boolean }) => {
    // Clone the variants array and update the specific option
    const updatedVariants = JSON.parse(JSON.stringify(variants)) as Array<{ type?: string; label?: string; options?: Array<{ label?: string; value?: string; sku?: string; price?: number; compareAtPrice?: number; stock?: number; images?: string[]; available?: boolean }> }>;
    const group = updatedVariants[groupIndex];
    if (group?.options?.[optionIndex]) {
      if (updates.price !== undefined) group.options[optionIndex].price = updates.price;
      if (updates.stock !== undefined) group.options[optionIndex].stock = updates.stock;
      if (updates.available !== undefined) group.options[optionIndex].available = updates.available;
    }
    await apiUpdateProduct(product.id, { variants: updatedVariants });
  };

  const handleSaveMainProduct = async () => {
    const stockN = parseInt(inlineStock, 10);
    const priceN = parseFloat(inlinePrice);
    if (isNaN(stockN) || stockN < 0 || isNaN(priceN) || priceN < 0) {
      toast.error('Enter valid price and stock values');
      return;
    }
    setSavingInline(true);
    try {
      await apiUpdateProduct(product.id, { stock: stockN, price: priceN });
      onStockUpdate(product.id, stockN, priceN);
      toast.success('Updated successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSavingInline(false);
    }
  };

  const priceChanged = String(product.price) !== inlinePrice;
  const stockChanged = String(product.stock) !== inlineStock;
  const hasChanges = priceChanged || stockChanged;

  const publicProductUrl = product.slug ? resolveStorefrontPreviewUrl(`/products/${product.slug}`) : null;
  const canPreview = !!publicProductUrl && product.status === 'ACTIVE';
  const handleShare = async () => {
    if (!publicProductUrl) return;
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as Navigator & { share: (data: { title?: string; text?: string; url?: string }) => Promise<void> }).share({
          title: product.name,
          text: `Check out ${product.name} on Xelnova`,
          url: publicProductUrl,
        });
        return;
      }
    } catch {
      // user cancelled or share failed — fall back to copy
    }
    try {
      await navigator.clipboard.writeText(publicProductUrl);
      toast.success('Product link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white" onClick={(e) => e.stopPropagation()}>
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">SKU:</span>
          <code className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{product.slug || '—'}</code>
          {product.gstRate != null && (
            <>
              <span className="text-gray-300 mx-1">|</span>
              <span className="font-medium text-gray-700">GST:</span>
              <span>{product.gstRate}%</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {publicProductUrl && (
            <a
              href={publicProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={canPreview ? 'Open this product page in a new tab' : 'This listing is not live yet — preview only'}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                canPreview
                  ? 'border-primary-300 bg-white text-primary-600 hover:bg-primary-50'
                  : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ExternalLink size={12} /> View on store
            </a>
          )}
          {canPreview && (
            <button
              type="button"
              onClick={handleShare}
              title="Share product link"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <Upload size={12} /> Share
            </button>
          )}
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            <Pencil size={12} /> Edit
          </button>
          {canHold && (
            <button
              type="button"
              onClick={onToggleHold}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                product.status === 'ON_HOLD'
                  ? 'border-primary-300 bg-white text-primary-600 hover:bg-primary-50'
                  : 'border-amber-300 bg-white text-amber-600 hover:bg-amber-50'
              }`}
            >
              {product.status === 'ON_HOLD' ? <><Play size={12} /> Activate</> : <><Pause size={12} /> Hold</>}
            </button>
          )}
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 shadow-sm transition-colors">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Main product detail row — Amazon SC style: image | details | inventory | pricing */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-0 border-b border-gray-200">
        {/* Product image */}
        <div className="flex items-start p-3 border-r border-gray-100">
          <div className="h-16 w-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Package2 size={20} className="text-gray-300" />
              </div>
            )}
          </div>
        </div>

        {/* Product details */}
        <div className="p-3 border-r border-gray-100 min-w-0">
          <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">{product.name}</p>
          <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-500">
            {product.brand && (
              <p>Brand: <span className="text-gray-700 font-medium">{product.brand}</span></p>
            )}
            {product.category?.name && (
              <p>Category: <span className="text-gray-700 font-medium">{product.category.name}</span></p>
            )}
          </div>
        </div>

        {/* Inventory section */}
        <div className="p-3 border-r border-gray-100 min-w-[140px]">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Inventory</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-500">Available</span>
              <input
                type="number"
                value={inlineStock}
                onChange={(e) => setInlineStock(e.target.value)}
                className={`w-16 rounded border text-center px-2 py-1 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 ${stockChanged ? 'border-primary-300 bg-primary-50' : 'border-gray-300 bg-white'}`}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-500">Status</span>
              <Badge variant={productStatusVariant(product.status)} className="text-[10px]">
                {productStatusLabel(product.status)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Pricing section */}
        <div className="p-3 min-w-[180px]">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Pricing</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-500">Price</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-400">₹</span>
                <input
                  type="number"
                  value={inlinePrice}
                  onChange={(e) => setInlinePrice(e.target.value)}
                  className={`w-20 rounded border text-right px-2 py-1 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 ${priceChanged ? 'border-primary-300 bg-primary-50' : 'border-gray-300 bg-white'}`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-500">MRP</span>
              <span className="text-xs text-gray-600 tabular-nums pr-1">₹{product.compareAtPrice != null ? product.compareAtPrice.toLocaleString('en-IN') : '—'}</span>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSaveMainProduct}
                disabled={savingInline || !hasChanges}
                className={`w-full rounded-md py-1.5 text-xs font-semibold transition-all ${
                  hasChanges
                    ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                } disabled:opacity-50`}
              >
                {savingInline ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Variant rows — each variant gets its own full detail row */}
      {hasVariants && (
        <>
          <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <Layers size={13} className="text-primary-600" />
              <span className="text-xs font-semibold text-gray-700">
                Related to {flatVariants.length} variation{flatVariants.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {flatVariants.map((v, idx) => (
            <VariantDetailRow
              key={idx}
              variant={v}
              fallbackPrice={product.price}
              fallbackStock={product.stock}
              isLast={idx === flatVariants.length - 1}
              productId={product.id}
              groupIndex={v.groupIndex}
              optionIndex={v.optionIndex}
              onVariantUpdate={handleVariantUpdate}
            />
          ))}
        </>
      )}
    </div>
  );
}

function VariantDetailRow({
  variant,
  fallbackPrice,
  fallbackStock,
  isLast,
  productId,
  groupIndex,
  optionIndex,
  onVariantUpdate,
}: {
  variant: { variant: string; groupLabel: string; sku: string; price?: number; mrp?: number; stock?: number; image?: string; active: boolean };
  fallbackPrice: number;
  fallbackStock: number;
  isLast: boolean;
  productId: string;
  groupIndex: number;
  optionIndex: number;
  onVariantUpdate: (groupIndex: number, optionIndex: number, updates: { price?: number; stock?: number; available?: boolean }) => Promise<void>;
}) {
  const initialPrice = variant.price ?? fallbackPrice;
  const initialStock = variant.stock ?? fallbackStock;
  const initialActive = variant.active;

  /**
   * Track the last successfully-saved snapshot separately from the prop so
   * the "Save changes" button reliably resets after a save even when the
   * parent product object hasn't been refetched yet. Previously we compared
   * against `variant.price` (a stale prop) and the button stayed active
   * after a successful save, which made sellers click it a second time.
   */
  const [savedPrice, setSavedPrice] = useState(String(initialPrice));
  const [savedStock, setSavedStock] = useState(String(initialStock));
  const [savedActive, setSavedActive] = useState(initialActive);

  const [price, setPrice] = useState(String(initialPrice));
  const [stock, setStock] = useState(String(initialStock));
  const [active, setActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);

  // If the parent finally hands us a fresh prop (e.g. after a full refetch),
  // adopt it as the new baseline.
  useEffect(() => {
    const next = String(variant.price ?? fallbackPrice);
    if (next !== savedPrice) {
      setSavedPrice(next);
      setPrice(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.price, fallbackPrice]);
  useEffect(() => {
    const next = String(variant.stock ?? fallbackStock);
    if (next !== savedStock) {
      setSavedStock(next);
      setStock(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.stock, fallbackStock]);
  useEffect(() => {
    if (variant.active !== savedActive) {
      setSavedActive(variant.active);
      setActive(variant.active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.active]);

  const priceChanged = savedPrice !== price;
  const stockChanged = savedStock !== stock;
  const activeChanged = savedActive !== active;
  const hasChanges = priceChanged || stockChanged || activeChanged;

  const handleSave = async () => {
    const stockN = parseInt(stock, 10);
    const priceN = parseFloat(price);
    if (isNaN(stockN) || stockN < 0 || isNaN(priceN) || priceN < 0) {
      toast.error('Enter valid price and stock values');
      return;
    }
    setSaving(true);
    try {
      await onVariantUpdate(groupIndex, optionIndex, {
        price: priceN,
        stock: stockN,
        available: active,
      });
      // Adopt the just-saved values as the new baseline so the Save button
      // returns to the disabled state and the seller gets clear feedback
      // that the change persisted (no need to click twice).
      setSavedPrice(String(priceN));
      setSavedStock(String(stockN));
      setSavedActive(active);
      const willNeedReview = priceChanged; // only price triggers re-approval
      toast.success(
        willNeedReview
          ? 'Variant updated — price change submitted for admin approval'
          : 'Variant updated',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 ${!isLast ? 'border-b border-gray-100' : ''} ${!active ? 'opacity-50' : ''}`}>
      {/* Variant image */}
      <div className="flex items-start p-3 border-r border-gray-50">
        <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
          {variant.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={variant.image} alt={variant.variant} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Package2 size={16} className="text-gray-300" />
            </div>
          )}
        </div>
      </div>

      {/* Variant details */}
      <div className="p-3 border-r border-gray-50 min-w-0">
        <p className="text-xs font-semibold text-gray-900">{variant.variant}</p>
        <div className="mt-1 space-y-0.5 text-[11px] text-gray-500">
          <p>{variant.groupLabel}</p>
          {variant.sku !== '—' && (
            <p>SKU: <code className="font-mono text-gray-600">{variant.sku}</code></p>
          )}
        </div>
      </div>

      {/* Variant inventory */}
      <div className="p-3 border-r border-gray-50 min-w-[140px]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-500">Available</span>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className={`w-16 rounded border text-center px-2 py-1 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 ${stockChanged ? 'border-primary-300 bg-primary-50' : 'border-gray-300 bg-white'}`}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-500">Status</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActive(!active); }}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                active
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              } ${activeChanged ? 'ring-2 ring-primary-300' : ''}`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </div>

      {/* Variant pricing */}
      <div className="p-3 border-r border-gray-50 min-w-[140px]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-500">Price</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400">₹</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={`w-20 rounded border text-right px-2 py-1 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 ${priceChanged ? 'border-primary-300 bg-primary-50' : 'border-gray-300 bg-white'}`}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-500">MRP</span>
            <span className="text-xs text-gray-600 tabular-nums pr-1">₹{variant.mrp != null ? variant.mrp.toLocaleString('en-IN') : '—'}</span>
          </div>
        </div>
      </div>

      {/* Save button column */}
      <div className="p-3 min-w-[100px] flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleSave(); }}
          disabled={saving || !hasChanges}
          className={`w-full rounded-md py-1.5 px-2 text-xs font-semibold transition-all ${
            hasChanges
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function splitMetaKeywords(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,+]/)
        .map((k) => k.trim())
        .filter(Boolean),
    ),
  );
}

/**
 * Split a "30x20x15" / "30 × 20 × 15" / "30 X 20 X 15 cm" style string into
 * its three numeric parts. Empty / unparseable parts become "".
 */
function parseDimensionsString(raw: string | undefined | null): { l: string; w: string; h: string } {
  const empty = { l: '', w: '', h: '' };
  if (!raw) return empty;
  const parts = String(raw)
    .replace(/cm|mm|in|inch(es)?/gi, '')
    .split(/[x×*]/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return {
    l: parts[0] ?? '',
    w: parts[1] ?? '',
    h: parts[2] ?? '',
  };
}

/** Compose 3 dim parts back into a single "L x W x H" string (in cm). */
function composeDimensionsString(l: string, w: string, h: string): string {
  const parts = [l, w, h].map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) return '';
  return parts.join(' x ');
}

// ─── Image Gallery Component ───

type UploadingImage = {
  id: string;
  file: File;
  preview: string;
  progress: 'uploading' | 'done' | 'error';
};

function GalleryThumbnailItem({
  img,
  index,
  total,
  previewIdx,
  onSelectPreview,
  onRemove,
  onPromoteToMain,
  onSwap,
}: {
  img: ProductImage;
  index: number;
  total: number;
  previewIdx: number;
  onSelectPreview: (i: number) => void;
  onRemove: (id: string) => void;
  onPromoteToMain: (i: number) => void;
  onSwap: (from: number, to: number) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={img}
      dragListener={false}
      dragControls={dragControls}
      className="relative shrink-0 list-none"
      whileDrag={{ scale: 1.08, zIndex: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
    >
      <div
        className={`group relative h-[72px] w-[72px] overflow-hidden rounded-xl border-2 transition-all duration-150 ${
          previewIdx === index
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-border hover:border-gray-300'
        }`}
      >
        {/* Draggable + click-to-preview (not a <button> — buttons block Reorder drag) */}
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectPreview(index);
            }
          }}
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() => onSelectPreview(index)}
          className="block h-full w-full cursor-grab touch-none active:cursor-grabbing select-none outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" draggable={false} className="h-full w-full object-cover pointer-events-none" />
        </div>

        {index === 0 && (
          <div className="absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-white shadow pointer-events-none">
            <Crown className="h-2.5 w-2.5" />
          </div>
        )}

        {index > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPromoteToMain(index);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-white/90 text-amber-600 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500 hover:text-white z-10"
            title="Set as main image"
          >
            <Crown className="h-2.5 w-2.5" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(img.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
          aria-label="Remove image"
        >
          <X className="h-2.5 w-2.5" />
        </button>

        {/* Explicit swap controls — drag-drop is fragile on touch / older browsers,
            so give sellers reliable arrow buttons (testing observation #11). */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-0.5 pb-0.5 z-10">
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => { e.stopPropagation(); onSwap(index, index - 1); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex h-4 w-4 items-center justify-center rounded bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-600 disabled:opacity-20 disabled:cursor-not-allowed"
            title="Move left"
            aria-label="Swap with previous image"
          >
            <ChevronLeftIcon className="h-2.5 w-2.5" />
          </button>
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded bg-black/50 px-0.5 text-[9px] font-bold text-white tabular-nums pointer-events-none">
            {index + 1}
          </span>
          <button
            type="button"
            disabled={index >= total - 1}
            onClick={(e) => { e.stopPropagation(); onSwap(index, index + 1); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex h-4 w-4 items-center justify-center rounded bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-600 disabled:opacity-20 disabled:cursor-not-allowed"
            title="Move right"
            aria-label="Swap with next image"
          >
            <ChevronRightIcon className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}

function ProductVideoUpload({
  videoUrl,
  videoPublicId,
  onVideoChange,
  onVideoPublicIdChange,
  uploading,
  setUploading,
}: {
  videoUrl: string;
  videoPublicId: string;
  onVideoChange: (url: string) => void;
  onVideoPublicIdChange: (id: string) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file (MP4, WebM, MOV)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Video file must be less than 15MB');
      return;
    }

    setUploading(true);
    try {
      const result = await apiUploadVideo(file);
      onVideoChange(result.url);
      onVideoPublicIdChange(result.publicId);
      toast.success('Video uploaded successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleRemove = async () => {
    if (videoPublicId) {
      try {
        await apiDeleteVideo(videoPublicId);
      } catch (error) {
        console.error('Failed to delete video:', error);
      }
    }
    onVideoChange('');
    onVideoPublicIdChange('');
  };

  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-primary-500" />
            Product Video <span className="text-text-muted font-normal">(Optional)</span>
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Upload a product video (MP4, WebM, MOV). Max 15MB. Video helps customers understand your product better.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileSelect}
        className="hidden"
      />

      {videoUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-surface">
          <video
            src={videoUrl}
            controls
            className="w-full max-h-64 object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
            title="Remove video"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-all ${
            dragOver ? 'border-primary-500 bg-primary-50/50' : 'border-border bg-surface hover:border-primary-300'
          } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              <p className="text-sm text-text-muted">Uploading video...</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-primary-50 border border-primary-200">
                <Film className="h-6 w-6 text-primary-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">Click to upload or drag & drop</p>
                <p className="text-xs text-text-muted mt-1">MP4, WebM, or MOV (max 15MB)</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const oversizedFiles = imageFiles.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length} file(s) exceed 5MB limit: ${oversizedFiles.map((f) => f.name).join(', ')}`);
    }
    const validFiles = imageFiles.filter((f) => f.size <= MAX_FILE_SIZE);
    if (validFiles.length === 0) return;

    const slotsLeft = MAX_PRODUCT_IMAGES - images.length - uploadQueue.length;
    const batch = validFiles.slice(0, slotsLeft);
    if (validFiles.length > slotsLeft) {
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

    try {
      if (batch.length === 1) {
        const { url, publicId } = await apiUploadImage(batch[0]);
        results.push({ id: queueItems[0].id, url, publicId });
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === queueItems[0].id ? { ...q, progress: 'done' } : q)),
        );
      } else {
        const uploadedResults = await apiUploadImages(batch);
        uploadedResults.forEach((res, i) => {
          results.push({ id: queueItems[i].id, url: res.url, publicId: res.publicId });
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === queueItems[i].id ? { ...q, progress: 'done' } : q)),
          );
        });
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Upload failed';
      toast.error(`Failed to upload images: ${errorMsg}`);
      setUploadQueue((prev) =>
        prev.map((q) => (queueItems.some((qi) => qi.id === q.id) ? { ...q, progress: 'error' } : q)),
      );
    }

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

  // Swap two images by index — used by the up/down arrow buttons in each thumbnail.
  // Functional swap that doesn't depend on stale `images` closure.
  const swapImages = useCallback((from: number, to: number) => {
    if (from === to) return;
    if (from < 0 || to < 0) return;
    if (from >= images.length || to >= images.length) return;
    const next = [...images];
    [next[from], next[to]] = [next[to], next[from]];
    onImagesChange(next);
    setPreviewIdx((p) => (p === from ? to : p === to ? from : p));
  }, [images, onImagesChange]);

  const promoteToMain = (idx: number) => {
    if (idx === 0 || idx >= images.length) return;
    const next = [...images];
    const [promoted] = next.splice(idx, 1);
    next.unshift(promoted);
    onImagesChange(next);
    setPreviewIdx(0);
  };

  const handleReorder = (newOrder: ProductImage[]) => {
    const curId = images[previewIdx]?.id;
    onImagesChange(newOrder);
    if (curId !== undefined) {
      const ni = newOrder.findIndex((x) => x.id === curId);
      if (ni >= 0) setPreviewIdx(ni);
    }
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
            The first image is the hero. Use the arrows on each thumbnail to reorder. You can pick multiple images at once. Up to {MAX_PRODUCT_IMAGES} images.
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
              <span className="text-[11px] opacity-70">Pick multiple files at once, or drag &amp; drop here</span>
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
            onReorder={handleReorder}
            className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin"
          >
            {images.map((img, i) => (
              <GalleryThumbnailItem
                key={img.id}
                img={img}
                index={i}
                total={images.length}
                previewIdx={previewIdx}
                onSelectPreview={setPreviewIdx}
                onRemove={removeImage}
                onPromoteToMain={promoteToMain}
                onSwap={swapImages}
              />
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

// ─── Preset Key-Value Editor (dropdowns, not free-text) ───

const OTHER_KEY_TOKEN = '__other_key__';
const OTHER_VALUE_TOKEN = '__other_value__';

// ─── Bullets + description editor ─────────────────────────────────────────────
//
// Used for the long-form "Product description" and "Safety & product resources"
// sections. Sellers see a structured list of up to 5 bullet rows plus an
// optional free-form paragraph. We serialise everything back into a single
// plain string for storage so the backend / storefront contract is unchanged:
//
//   • First bullet
//   • Second bullet
//
//   Optional paragraph text below the bullets.
//
// On load we parse leading "• "/"- "/"* " lines into the bullets list and put
// the remaining text into the paragraph field.

const MAX_BULLETS = 5;
const BULLET_LINE_RE = /^\s*[•\-*]\s+/;

function parseBulletString(raw: string): { bullets: string[]; rest: string } {
  if (!raw) return { bullets: [], rest: '' };
  const lines = raw.split(/\r?\n/);
  const bullets: string[] = [];
  let i = 0;
  while (i < lines.length && bullets.length < MAX_BULLETS) {
    const line = lines[i];
    if (BULLET_LINE_RE.test(line)) {
      bullets.push(line.replace(BULLET_LINE_RE, '').trim());
      i += 1;
      continue;
    }
    if (line.trim() === '' && bullets.length > 0) {
      i += 1;
      continue;
    }
    break;
  }
  const rest = lines.slice(i).join('\n').replace(/^\s+/, '');
  return { bullets, rest };
}

function composeBulletString(bullets: string[], rest: string): string {
  const cleanBullets = bullets.map((b) => b.trim()).filter(Boolean);
  const bulletBlock = cleanBullets.map((b) => `• ${b}`).join('\n');
  const cleanRest = rest.trim();
  if (bulletBlock && cleanRest) return `${bulletBlock}\n\n${cleanRest}`;
  return bulletBlock || cleanRest;
}

interface BulletListEditorProps {
  label: string;
  description?: string;
  bulletPlaceholder?: string;
  paragraphPlaceholder?: string;
  paragraphLabel?: string;
  paragraphRows?: number;
  value: string;
  onChange: (next: string) => void;
}

function BulletListEditor({
  label,
  description,
  bulletPlaceholder = 'Highlight a key feature or benefit',
  paragraphPlaceholder = 'Optional supporting paragraph (visible after the bullet points).',
  paragraphLabel = 'Additional details',
  paragraphRows = 4,
  value,
  onChange,
}: BulletListEditorProps) {
  // We keep an internal mirror of the parsed structure so typing in either
  // field doesn't cause cursor jumps from re-parsing the joined string.
  const initial = useMemo(() => parseBulletString(value), [value]);
  const [bullets, setBullets] = useState<string[]>(initial.bullets);
  const [paragraph, setParagraph] = useState<string>(initial.rest);
  const lastEmittedRef = useRef<string>(value);

  // If the parent value changes from outside (edit modal hydration, autosave
  // restore, reset form), re-sync the local state. We compare against the last
  // string we emitted to avoid clobbering in-progress edits.
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    const parsed = parseBulletString(value);
    setBullets(parsed.bullets);
    setParagraph(parsed.rest);
    lastEmittedRef.current = value;
  }, [value]);

  const emit = useCallback(
    (nextBullets: string[], nextParagraph: string) => {
      const composed = composeBulletString(nextBullets, nextParagraph);
      lastEmittedRef.current = composed;
      onChange(composed);
    },
    [onChange],
  );

  const updateBullet = (index: number, next: string) => {
    setBullets((prev) => {
      const updated = prev.map((b, i) => (i === index ? next : b));
      emit(updated, paragraph);
      return updated;
    });
  };

  const addBullet = () => {
    setBullets((prev) => {
      if (prev.length >= MAX_BULLETS) return prev;
      const updated = [...prev, ''];
      emit(updated, paragraph);
      return updated;
    });
  };

  const removeBullet = (index: number) => {
    setBullets((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      emit(updated, paragraph);
      return updated;
    });
  };

  const updateParagraph = (next: string) => {
    setParagraph(next);
    emit(bullets, next);
  };

  const canAdd = bullets.length < MAX_BULLETS;

  return (
    <div className="rounded-xl border border-border bg-surface-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
          {description && <p className="mt-0.5 text-[11px] text-text-muted">{description}</p>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBullet}
          disabled={!canAdd}
          title={canAdd ? `Add a bullet (up to ${MAX_BULLETS})` : `Maximum ${MAX_BULLETS} bullets reached`}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add bullet
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {bullets.length === 0 ? (
          <p className="text-[11px] text-text-muted">
            No bullets yet. Click <span className="font-medium">“Add bullet”</span> to highlight up to {MAX_BULLETS} key
            points — they show up as a clean bulleted list on the product page.
          </p>
        ) : (
          bullets.map((bullet, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-lg border border-border bg-surface-raised px-2 py-1.5"
            >
              <span
                aria-hidden
                className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500"
              />
              <input
                type="text"
                value={bullet}
                onChange={(e) => updateBullet(index, e.target.value)}
                placeholder={bulletPlaceholder}
                maxLength={200}
                className="flex-1 bg-transparent px-1 py-1 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <button
                type="button"
                onClick={() => removeBullet(index)}
                className="rounded p-1 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                aria-label={`Remove bullet ${index + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span>Tip: keep each bullet to one line for the cleanest look.</span>
          <span>{bullets.length}/{MAX_BULLETS}</span>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-[11px] font-medium text-text-muted">{paragraphLabel}</label>
        <textarea
          value={paragraph}
          onChange={(e) => updateParagraph(e.target.value)}
          placeholder={paragraphPlaceholder}
          rows={paragraphRows}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 resize-y"
        />
      </div>
    </div>
  );
}

interface PresetKeyValueEditorProps {
  label: string;
  description?: string;
  preset: AttributePreset;
  items: { key: string; value: string }[];
  onChange: (items: { key: string; value: string }[]) => void;
}

function PresetKeyValueEditor({ label, description, preset, items, onChange }: PresetKeyValueEditorProps) {
  const addItem = () => onChange([...items, { key: '', value: '' }]);

  const setRow = (index: number, next: { key: string; value: string }) => {
    onChange(items.map((item, i) => (i === index ? next : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-muted/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-medium text-text-primary">{label}</p>
          {description && <p className="text-[10px] text-text-muted">{description}</p>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted py-2">No items added yet. Click &quot;Add&quot; to add entries.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const keyIsPreset = Boolean(item.key && preset.keys.includes(item.key));
            const keyIsPendingCustom = item.key === CUSTOM_ATTRIBUTE_PENDING;
            const keyIsCustom = Boolean(item.key) && !keyIsPreset; // includes pending sentinel
            const keySelectValue = keyIsPreset ? item.key : keyIsCustom ? OTHER_KEY_TOKEN : '';

            const rawValueOpts =
              item.key && item.key !== CUSTOM_ATTRIBUTE_PENDING ? getValueOptionsForKey(preset, item.key) : [];
            // Hide the literal "Other (specify)" entry from the dropdown — the
            // dedicated "Custom value…" option below already handles that case
            // and actually shows an input. Listing both was confusing because
            // picking the preset OTHER label silently selected a useless value.
            const valueOpts = rawValueOpts.filter((v) => v !== OTHER_VALUE_LABEL);
            const valueIsListed = Boolean(item.value && valueOpts.includes(item.value));
            const valueIsPendingCustom = item.value === CUSTOM_VALUE_PENDING;
            const valueIsCustom = Boolean(item.value) && !valueIsListed; // includes pending
            const valueSelectValue = valueIsListed ? item.value : valueIsCustom ? OTHER_VALUE_TOKEN : '';
            const showKeyCustom = Boolean(keySelectValue === OTHER_KEY_TOKEN);
            const showValueCustom =
              Boolean(item.key && item.key !== CUSTOM_ATTRIBUTE_PENDING) && valueIsCustom;

            return (
              <div key={index} className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <label className="text-[10px] text-text-muted">Attribute</label>
                    <select
                      value={keySelectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                          setRow(index, { key: '', value: '' });
                          return;
                        }
                        if (v === OTHER_KEY_TOKEN) {
                          setRow(index, { key: CUSTOM_ATTRIBUTE_PENDING, value: '' });
                          return;
                        }
                        // Don't auto-pick a value when the seller chooses an
                        // attribute — they should pick it themselves. Picking
                        // the first option used to silently land on
                        // "Other (specify)" for keys whose only option was OTHER.
                        setRow(index, { key: v, value: '' });
                      }}
                      className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                    >
                      <option value="">Select attribute…</option>
                      {preset.keys.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                      <option value={OTHER_KEY_TOKEN}>Custom attribute…</option>
                    </select>
                    {showKeyCustom && (
                      <input
                        type="text"
                        value={keyIsPendingCustom ? '' : item.key}
                        onChange={(e) => {
                          // Preserve spaces as the seller types — we only trim on submit.
                          const raw = e.target.value;
                          const isBlank = raw.trim().length === 0;
                          setRow(index, { key: isBlank ? CUSTOM_ATTRIBUTE_PENDING : raw, value: item.value });
                        }}
                        placeholder="Type attribute name"
                        className="w-full rounded-lg border border-dashed border-primary-300 bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <label className="text-[10px] text-text-muted">Value</label>
                    {!item.key || item.key === CUSTOM_ATTRIBUTE_PENDING ? (
                      <p className="text-[10px] text-text-muted py-1.5">
                        {item.key === CUSTOM_ATTRIBUTE_PENDING ? 'Name your custom attribute above, then pick a value' : 'Choose an attribute first'}
                      </p>
                    ) : (
                      <>
                        <select
                          value={valueSelectValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') {
                              setRow(index, { ...item, value: '' });
                              return;
                            }
                            // Both the dedicated "Custom value…" option and the
                            // legacy "Other (specify)" preset value should drop
                            // the seller into a free-form input.
                            if (v === OTHER_VALUE_TOKEN || v === OTHER_VALUE_LABEL) {
                              setRow(index, { ...item, value: CUSTOM_VALUE_PENDING });
                              return;
                            }
                            setRow(index, { ...item, value: v });
                          }}
                          className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                        >
                          <option value="">Select value…</option>
                          {valueOpts.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                          <option value={OTHER_VALUE_TOKEN}>Custom value…</option>
                        </select>
                        {showValueCustom && (
                          <input
                            type="text"
                            value={valueIsPendingCustom ? '' : item.value}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const isBlank = raw.trim().length === 0;
                              setRow(index, { ...item, value: isBlank ? CUSTOM_VALUE_PENDING : raw });
                            }}
                            placeholder="Type value"
                            className="w-full rounded-lg border border-dashed border-primary-300 bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                          />
                        )}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded p-1.5 text-text-muted hover:text-danger-600 hover:bg-danger-50 self-end sm:self-center shrink-0"
                    aria-label="Remove row"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* Add button for quick addition of next row */}
                {index === items.length - 1 && (
                  <button
                    type="button"
                    onClick={addItem}
                    className="self-start inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 hover:border-primary-400 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add custom attribute
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function SellerInventoryPage() {
  const { isApproved } = useSellerProfile();
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') ?? '';
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const haystack = [p.name, p.category?.name ?? '', p.status]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [products, search]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<SellerProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<SellerProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [togglingHoldId, setTogglingHoldId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCompare, setFormCompare] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formShort, setFormShort] = useState('');
  const [formImages, setFormImages] = useState<ProductImage[]>([]);
  const [formVideo, setFormVideo] = useState('');
  const [formVideoPublicId, setFormVideoPublicId] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [formVariantRows, setFormVariantRows] = useState<FormVariantRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaKeywords, setFormMetaKeywords] = useState<string[]>([]);
  const [metaKeywordInput, setMetaKeywordInput] = useState('');
  const [formMetaDesc, setFormMetaDesc] = useState('');
  const [formHsnCode, setFormHsnCode] = useState('');
  const [formGstRate, setFormGstRate] = useState('');
  const [formBrandCertificate, setFormBrandCertificate] = useState('');
  const [uploadingBrandCertificate, setUploadingBrandCertificate] = useState(false);
  /** Extra document URLs when listing under another seller's brand (admin must approve). */
  const [formBrandAuthExtraUrls, setFormBrandAuthExtraUrls] = useState<string[]>(['']);
  const [brandListingHint, setBrandListingHint] = useState<BrandListingHint | null>(null);
  const [brandHintLoading, setBrandHintLoading] = useState(false);
  const brandHintDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Brands the seller has already registered — used to offer a picker so they
  // don't have to retype the brand name / re-upload the authorization
  // certificate on every new listing.
  const [sellerBrands, setSellerBrands] = useState<SellerBrandSummary[]>([]);
  /** '' = seller wants to add a new brand; otherwise the picked brand's id. */
  const [selectedSellerBrandId, setSelectedSellerBrandId] = useState<string>('');
  const [formLowStock, setFormLowStock] = useState('5');
  const [formWeight, setFormWeight] = useState('');
  // Dimensions are persisted as a single "L x W x H" string for backwards
  // compatibility but edited as three separate inputs in the UI.
  const [formDimensions, setFormDimensions] = useState('');
  const [formDimL, setFormDimL] = useState('');
  const [formDimW, setFormDimW] = useState('');
  const [formDimH, setFormDimH] = useState('');
  // Recompose the canonical dimensions string whenever any of the parts
  // change, so existing submit / autosave code keeps working without changes.
  useEffect(() => {
    setFormDimensions(composeDimensionsString(formDimL, formDimW, formDimH));
  }, [formDimL, formDimW, formDimH]);

  const [formProductDimL, setFormProductDimL] = useState('');
  const [formProductDimW, setFormProductDimW] = useState('');
  const [formProductDimH, setFormProductDimH] = useState('');
  const [formProductWeight, setFormProductWeight] = useState('');
  const [formListingSpecs, setFormListingSpecs] = useState<{ id: string; key: string; value: string }[]>([]);
  const [displayXelnovaId, setDisplayXelnovaId] = useState<string | null>(null);

  // Amazon-style product information
  const [formFeaturesAndSpecs, setFormFeaturesAndSpecs] = useState<{ key: string; value: string }[]>([]);
  const [formMaterialsAndCare, setFormMaterialsAndCare] = useState<{ key: string; value: string }[]>([]);
  const [formItemDetails, setFormItemDetails] = useState<{ key: string; value: string }[]>([]);
  const [formAdditionalDetails, setFormAdditionalDetails] = useState<{ key: string; value: string }[]>([]);
  const [formProductDescription, setFormProductDescription] = useState('');
  const [formSafetyInfo, setFormSafetyInfo] = useState('');
  const [formRegulatoryInfo, setFormRegulatoryInfo] = useState('');
  const [formWarrantyInfo, setFormWarrantyInfo] = useState('');
  const [formWarrantyDurationValue, setFormWarrantyDurationValue] = useState('');
  const [formWarrantyDurationUnit, setFormWarrantyDurationUnit] = useState<'DAYS' | 'MONTHS' | 'YEARS' | ''>('');
  const brandCertificateInputRef = useRef<HTMLInputElement>(null);
  const [showBrandCertUrlField, setShowBrandCertUrlField] = useState(false);
  const [brandCertLinkDraft, setBrandCertLinkDraft] = useState('');
  const [brandCertImageError, setBrandCertImageError] = useState(false);
  const dealerAuthorizationRequired = brandListingHint?.mode === 'dealer_authorization_required';

  useEffect(() => {
    setBrandCertImageError(false);
  }, [formBrandCertificate]);

  // Fetch listing rules when the seller types a brand (new brand vs. authorized dealer, etc.)
  useEffect(() => {
    if (!createOpen && !editProduct) return;
    if (brandHintDebounceRef.current) {
      clearTimeout(brandHintDebounceRef.current);
    }
    const name = formBrand.trim();
    if (!name) {
      setBrandListingHint({ mode: 'empty' });
      setBrandHintLoading(false);
      return;
    }
    setBrandHintLoading(true);
    brandHintDebounceRef.current = setTimeout(() => {
      void apiGetBrandListingHint(name)
        .then((h) => setBrandListingHint(h))
        .catch(() => setBrandListingHint({ mode: 'empty' }))
        .finally(() => setBrandHintLoading(false));
    }, 400);
    return () => {
      if (brandHintDebounceRef.current) clearTimeout(brandHintDebounceRef.current);
    };
  }, [formBrand, createOpen, editProduct]);

  // Load the seller's registered brands whenever the Add/Edit modal opens so
  // they can pick an existing brand (and reuse its certificate) instead of
  // retyping the name and re-uploading the same document every time.
  useEffect(() => {
    if (!createOpen && !editProduct) return;
    let cancelled = false;
    apiGetSellerBrands()
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setSellerBrands(data as SellerBrandSummary[]);
        }
      })
      .catch(() => {
        // Non-fatal — the picker simply won't render and the seller can type
        // the brand by hand as before.
      });
    return () => {
      cancelled = true;
    };
  }, [createOpen, editProduct]);

  // When we land in the form with a brand already filled in (editing an
  // existing product, or restoring an autosaved draft), try to match it to
  // one of the seller's registered brands so the picker pre-selects it and
  // the certificate section switches to the read-only "on file" view.
  useEffect(() => {
    if (!createOpen && !editProduct) return;
    if (selectedSellerBrandId) return;
    if (sellerBrands.length === 0) return;
    const name = formBrand.trim();
    if (!name) return;
    const slug = slugifyBrandName(name);
    const match = sellerBrands.find((b) => b.slug === slug);
    if (match) {
      setSelectedSellerBrandId(match.id);
      if (match.authorizationCertificate && !formBrandCertificate.trim()) {
        setFormBrandCertificate(match.authorizationCertificate);
      }
    }
  }, [sellerBrands, formBrand, createOpen, editProduct, selectedSellerBrandId, formBrandCertificate]);

  // ─── Autosave (Add Product draft) ───
  // We persist the entire create-form state to localStorage so the seller
  // never loses work to a tab crash, refresh or accidental navigation.
  // Only active for the *create* flow — edits read directly from the API.
  const AUTOSAVE_KEY = 'xelnova:seller:product-draft:v1';
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const draftHydratedRef = useRef(false);
  const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collectDraft = useCallback(
    () => ({
      formName,
      formBrand,
      formPrice,
      formCompare,
      formStock,
      formSku,
      formCategoryId,
      formShort,
      formImages,
      formVariantRows,
      formMetaTitle,
      formMetaKeywords,
      formMetaDesc,
      formHsnCode,
      formGstRate,
      formBrandCertificate,
      formBrandAuthExtraUrls,
      formLowStock,
      formWeight,
      formDimensions,
      formProductDimL,
      formProductDimW,
      formProductDimH,
      formProductWeight,
      formListingSpecs,
      formFeaturesAndSpecs,
      formMaterialsAndCare,
      formItemDetails,
      formAdditionalDetails,
      formProductDescription,
      formSafetyInfo,
      formRegulatoryInfo,
      formWarrantyInfo,
      formWarrantyDurationValue,
      formWarrantyDurationUnit,
    }),
    [
      formName, formBrand, formPrice, formCompare, formStock, formSku, formCategoryId,
      formShort, formImages, formVariantRows, formMetaTitle, formMetaKeywords,
      formMetaDesc, formHsnCode, formGstRate, formBrandCertificate, formBrandAuthExtraUrls, formLowStock,
      formWeight, formDimensions, formProductDimL, formProductDimW, formProductDimH, formProductWeight,
      formListingSpecs,
      formFeaturesAndSpecs, formMaterialsAndCare,
      formItemDetails, formAdditionalDetails, formProductDescription,
      formSafetyInfo, formRegulatoryInfo, formWarrantyInfo,
      formWarrantyDurationValue, formWarrantyDurationUnit,
    ],
  );

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // ignore quota / privacy mode errors
    }
    setDraftRestored(false);
    setDraftSavedAt(null);
  }, []);

  // Restore draft when create modal opens and we're not editing.
  useEffect(() => {
    if (!createOpen || editProduct) return;
    if (draftHydratedRef.current) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) {
        draftHydratedRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as { savedAt?: number; data?: Record<string, unknown> };
      const data = parsed?.data ?? (parsed as Record<string, unknown>);
      if (!data || typeof data !== 'object') {
        draftHydratedRef.current = true;
        return;
      }
      const get = <T,>(key: string, fallback: T): T => {
        const v = (data as Record<string, unknown>)[key];
        return (v === undefined ? fallback : (v as T));
      };
      setFormName(get('formName', ''));
      setFormBrand(get('formBrand', ''));
      setFormPrice(get('formPrice', ''));
      setFormCompare(get('formCompare', ''));
      setFormStock(get('formStock', ''));
      setFormSku(get('formSku', ''));
      setFormCategoryId(get('formCategoryId', ''));
      setFormShort(get('formShort', ''));
      setFormImages(get<ProductImage[]>('formImages', []));
      setFormVariantRows(get<FormVariantRow[]>('formVariantRows', []));
      setFormMetaTitle(get('formMetaTitle', ''));
      setFormMetaKeywords(get<string[]>('formMetaKeywords', []));
      setFormMetaDesc(get('formMetaDesc', ''));
      setFormHsnCode(get('formHsnCode', ''));
      setFormGstRate(get('formGstRate', ''));
      setFormBrandCertificate(get('formBrandCertificate', ''));
      const extraDraft = get<unknown>('formBrandAuthExtraUrls', null);
      if (Array.isArray(extraDraft) && extraDraft.length) {
        setFormBrandAuthExtraUrls(extraDraft.map((u: unknown) => String(u)));
      } else {
        setFormBrandAuthExtraUrls(['']);
      }
      setFormLowStock(get('formLowStock', '5'));
      setFormWeight(get('formWeight', ''));
      const dimDraft = get('formDimensions', '');
      setFormDimensions(dimDraft);
      const dimParts = parseDimensionsString(dimDraft);
      setFormDimL(dimParts.l);
      setFormDimW(dimParts.w);
      setFormDimH(dimParts.h);
      setFormProductDimL(get('formProductDimL', ''));
      setFormProductDimW(get('formProductDimW', ''));
      setFormProductDimH(get('formProductDimH', ''));
      setFormProductWeight(get('formProductWeight', ''));
      const specDraft = get<{ key: string; value: string }[]>('formListingSpecs', []);
      setFormListingSpecs(
        specDraft.map((r, i) => ({
          id: `dr-${i}-${r.key}`,
          key: String(r.key ?? ''),
          value: String(r.value ?? ''),
        })),
      );
      setFormFeaturesAndSpecs(get<{ key: string; value: string }[]>('formFeaturesAndSpecs', []));
      setFormMaterialsAndCare(get<{ key: string; value: string }[]>('formMaterialsAndCare', []));
      setFormItemDetails(get<{ key: string; value: string }[]>('formItemDetails', []));
      setFormAdditionalDetails(get<{ key: string; value: string }[]>('formAdditionalDetails', []));
      setFormProductDescription(get('formProductDescription', ''));
      setFormSafetyInfo(get('formSafetyInfo', ''));
      setFormRegulatoryInfo(get('formRegulatoryInfo', ''));
      setFormWarrantyInfo(get('formWarrantyInfo', ''));
      setFormWarrantyDurationValue(get('formWarrantyDurationValue', ''));
      setFormWarrantyDurationUnit(get<'DAYS' | 'MONTHS' | 'YEARS' | ''>('formWarrantyDurationUnit', ''));
      draftHydratedRef.current = true;
      setDraftRestored(true);
      setDraftSavedAt(parsed?.savedAt ?? null);
      toast.message('Draft restored', { description: 'Your previous unsaved product draft was restored.' });
    } catch {
      draftHydratedRef.current = true;
    }
  }, [createOpen, editProduct]);

  // Reset hydration flag when the modal closes so reopening can hydrate again.
  useEffect(() => {
    if (!createOpen) {
      draftHydratedRef.current = false;
    }
  }, [createOpen]);

  // Persist (debounced) on every relevant field change while creating.
  useEffect(() => {
    if (!createOpen || editProduct) return;
    if (typeof window === 'undefined') return;
    if (!draftHydratedRef.current) return;
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = setTimeout(() => {
      try {
        const payload = { savedAt: Date.now(), data: collectDraft() };
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
        setDraftSavedAt(payload.savedAt);
      } catch {
        // ignore quota errors
      }
    }, 600);
    return () => {
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, [createOpen, editProduct, collectDraft]);

  const [fetchedAttrPresets, setFetchedAttrPresets] = useState<ProductAttributePresetsBundle | null>(null);
  useEffect(() => {
    apiGetProductAttributePresets()
      .then(setFetchedAttrPresets)
      .catch(() => setFetchedAttrPresets(null));
  }, []);

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
          setCategories(json.data as CategoryNode[]);
        }
      })
      .catch(() => toast.error('Could not load categories'));
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormPrice('');
    setFormCompare('');
    setFormStock('');
    setFormSku('');
    setFormCategoryId('');
    setFormShort('');
    setFormImages([]);
    setFormVideo('');
    setFormVideoPublicId('');
    setFormVariantRows([]);
    setFormMetaTitle('');
    setFormMetaKeywords([]);
    setMetaKeywordInput('');
    setFormMetaDesc('');
    setFormHsnCode('');
    setFormGstRate('');
    setFormBrandCertificate('');
    setShowBrandCertUrlField(false);
    setBrandCertLinkDraft('');
    setFormBrandAuthExtraUrls(['']);
    setBrandListingHint(null);
    setSelectedSellerBrandId('');
    setFormLowStock('5');
    setFormWeight('');
    setFormDimensions('');
    setFormDimL('');
    setFormDimW('');
    setFormDimH('');
    setFormProductDimL('');
    setFormProductDimW('');
    setFormProductDimH('');
    setFormProductWeight('');
    setFormListingSpecs([]);
    setDisplayXelnovaId(null);
    setFormFeaturesAndSpecs([]);
    setFormMaterialsAndCare([]);
    setFormItemDetails([]);
    setFormAdditionalDetails([]);
    setFormProductDescription('');
    setFormSafetyInfo('');
    setFormRegulatoryInfo('');
    setFormWarrantyInfo('');
    setFormWarrantyDurationValue('');
    setFormWarrantyDurationUnit('');
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (p: SellerProduct) => {
    setEditProduct(p);
    setShowBrandCertUrlField(false);
    setBrandCertLinkDraft('');
    setSelectedSellerBrandId('');
    setFormName(p.name);
    setFormBrand('');
    setFormPrice('');
    setFormCompare('');
    setFormStock(String(p.stock));
    setFormCategoryId('');
    setFormShort('');
    setFormImages(urlsToProductImages(p.images));
    setFormVideo('');
    setFormVideoPublicId('');
    setFormVariantRows([]);
    setEditLoading(true);
    setDisplayXelnovaId(p.xelnovaProductId?.trim() || null);
    apiGetProduct(p.id)
      .then((fullUnknown) => {
        const full = fullUnknown as Record<string, unknown>;
        setFormName(String(full.name ?? p.name));
        setFormGstRate(full.gstRate != null ? String(full.gstRate) : '');
        const basePrice = Number(full.price ?? p.price);
        const baseCompare = full.compareAtPrice != null ? Number(full.compareAtPrice) : null;
        setFormPrice(String(basePrice));
        setFormCompare(baseCompare != null ? String(baseCompare) : '');
        setFormStock(String(full.stock ?? p.stock));
        setFormSku(typeof full.sku === 'string' ? full.sku : String(full.sku ?? ''));
        setFormCategoryId(String(full.categoryId ?? ''));
        setFormShort(String(full.shortDescription ?? ''));
        setFormImages(urlsToProductImages(full.images as string[] | undefined));
        setFormVideo(typeof full.video === 'string' ? full.video : '');
        setFormVideoPublicId(typeof full.videoPublicId === 'string' ? full.videoPublicId : '');
        setFormVariantRows(variantGroupsToFormRows(full.variants));
        setFormMetaTitle(String(full.metaTitle ?? ''));
        setFormMetaKeywords(splitMetaKeywords(String(full.metaTitle ?? '')));
        setFormMetaDesc(String(full.metaDescription ?? ''));
        setFormHsnCode(String(full.hsnCode ?? ''));
        setFormBrand(String(full.brand ?? ''));
        setFormLowStock(String(full.lowStockThreshold ?? '5'));
        setDisplayXelnovaId(
          typeof full.xelnovaProductId === 'string' && full.xelnovaProductId.trim()
            ? full.xelnovaProductId.trim()
            : null,
        );

        const pkgL =
          full.packageLengthCm != null && full.packageLengthCm !== ''
            ? String(full.packageLengthCm)
            : '';
        const pkgW =
          full.packageWidthCm != null && full.packageWidthCm !== ''
            ? String(full.packageWidthCm)
            : '';
        const pkgH =
          full.packageHeightCm != null && full.packageHeightCm !== ''
            ? String(full.packageHeightCm)
            : '';
        if (pkgL || pkgW || pkgH) {
          setFormDimL(pkgL);
          setFormDimW(pkgW);
          setFormDimH(pkgH);
        } else {
          const dimRaw = String(full.dimensions ?? '');
          setFormDimensions(dimRaw);
          const parts = parseDimensionsString(dimRaw);
          setFormDimL(parts.l);
          setFormDimW(parts.w);
          setFormDimH(parts.h);
        }

        const pkgWgt =
          full.packageWeightKg != null && full.packageWeightKg !== ''
            ? String(full.packageWeightKg)
            : '';
        setFormWeight(pkgWgt || (full.weight != null ? String(full.weight) : ''));

        setFormProductDimL(
          full.productLengthCm != null && full.productLengthCm !== ''
            ? String(full.productLengthCm)
            : '',
        );
        setFormProductDimW(
          full.productWidthCm != null && full.productWidthCm !== ''
            ? String(full.productWidthCm)
            : '',
        );
        setFormProductDimH(
          full.productHeightCm != null && full.productHeightCm !== ''
            ? String(full.productHeightCm)
            : '',
        );
        setFormProductWeight(
          full.productWeightKg != null && full.productWeightKg !== ''
            ? String(full.productWeightKg)
            : '',
        );

        setFormListingSpecs(specificationsToFormRows(full.specifications));
        // Amazon-style product information
        setFormFeaturesAndSpecs(objectToKeyValueArray(full.featuresAndSpecs as Record<string, string> | null));
        setFormMaterialsAndCare(objectToKeyValueArray(full.materialsAndCare as Record<string, string> | null));
        setFormItemDetails(objectToKeyValueArray(full.itemDetails as Record<string, string> | null));
        const additionalDetails = (full.additionalDetails as Record<string, string> | null) ?? null;
        const certUrl = additionalDetails?.['Brand Authorization Certificate'];
        setFormBrandCertificate(typeof certUrl === 'string' ? certUrl : '');
        const additionalWithoutCert = additionalDetails ? { ...additionalDetails } : null;
        if (additionalWithoutCert) delete additionalWithoutCert['Brand Authorization Certificate'];
        setFormAdditionalDetails(objectToKeyValueArray(additionalWithoutCert));
        setFormProductDescription(String(full.productDescription ?? ''));
        setFormSafetyInfo(String(full.safetyInfo ?? ''));
        setFormRegulatoryInfo(String(full.regulatoryInfo ?? ''));
        setFormWarrantyInfo(String(full.warrantyInfo ?? ''));
        setFormWarrantyDurationValue(full.warrantyDurationValue ? String(full.warrantyDurationValue) : '');
        setFormWarrantyDurationUnit((full.warrantyDurationUnit as 'DAYS' | 'MONTHS' | 'YEARS' | '') ?? '');
        const extraUrls = full.brandAuthAdditionalDocumentUrls as string[] | undefined;
        if (Array.isArray(extraUrls) && extraUrls.length) {
          setFormBrandAuthExtraUrls(extraUrls.map((u) => String(u)));
        } else {
          setFormBrandAuthExtraUrls(['']);
        }
      })
      .catch((err: Error) => {
        toast.error(err.message || 'Could not load product details');
      })
      .finally(() => setEditLoading(false));
  };

  const addVariantRow = () => {
    setFormVariantRows((prev) => [...prev, newFormRow(formImages.map((img) => img.url))]);
  };

  const updateVariantRow = (id: string, patch: Partial<FormVariantRow>) => {
    setFormVariantRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeVariantRow = (id: string) => {
    setFormVariantRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addVariantValue = (rowId: string) => {
    setFormVariantRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, values: [...r.values, newFormValue(formImages.map((img) => img.url))] }
          : r,
      ),
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

  const handleVariantVideoUpload = async (rowId: string, valId: string, file: File) => {
    const MAX_FILE_SIZE = 15 * 1024 * 1024;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file (MP4, WebM, MOV)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Video file must be less than 15MB');
      return;
    }

    setUploading(true);
    try {
      const result = await apiUploadVideo(file);
      setFormVariantRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                values: r.values.map((v) =>
                  v.id === valId ? { ...v, video: result.url, videoPublicId: result.publicId } : v,
                ),
              }
            : r,
        ),
      );
      toast.success('Variant video uploaded successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const removeVariantVideo = async (rowId: string, valId: string) => {
    const variant = formVariantRows
      .find((r) => r.id === rowId)
      ?.values.find((v) => v.id === valId);

    if (variant?.videoPublicId) {
      try {
        await apiDeleteVideo(variant.videoPublicId);
      } catch (error) {
        console.error('Failed to delete video:', error);
      }
    }

    setFormVariantRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              values: r.values.map((v) =>
                v.id === valId ? { ...v, video: '', videoPublicId: '' } : v,
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

  // Swap two adjacent variant images. Mirrors the main-product gallery's
  // arrow-button reorder UX (testing observation #11) — drag-drop is fragile
  // on touch / older browsers, so sellers asked for explicit arrows here too.
  const swapVariantImage = (rowId: string, valId: string, from: number, to: number) => {
    if (from === to) return;
    setFormVariantRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          values: r.values.map((v) => {
            if (v.id !== valId) return v;
            if (from < 0 || to < 0 || from >= v.images.length || to >= v.images.length) return v;
            const next = [...v.images];
            [next[from], next[to]] = [next[to], next[from]];
            return { ...v, images: next };
          }),
        };
      }),
    );
  };

  const MAX_META_KEYWORDS = 5;
  const addMetaKeyword = (rawKeyword: string) => {
    const keyword = rawKeyword.trim();
    if (!keyword) return;
    setFormMetaKeywords((prev) => {
      if (prev.includes(keyword)) return prev;
      if (prev.length >= MAX_META_KEYWORDS) {
        toast.info(`You can add up to ${MAX_META_KEYWORDS} meta title keywords.`);
        return prev;
      }
      return [...prev, keyword];
    });
    setMetaKeywordInput('');
  };

  const removeMetaKeyword = (keyword: string) => {
    setFormMetaKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const uploadBrandCertificate = async (file: File | null) => {
    if (!file) return;
    setUploadingBrandCertificate(true);
    try {
      const { url } = await apiUploadImage(file);
      setFormBrandCertificate(url);
      setShowBrandCertUrlField(false);
      setBrandCertLinkDraft('');
      toast.success('Brand authorization certificate uploaded');
    } catch {
      toast.error('Failed to upload certificate. Please try again.');
    } finally {
      setUploadingBrandCertificate(false);
    }
  };

  const applyBrandCertFromLink = () => {
    const u = brandCertLinkDraft.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      toast.error('Enter a valid URL starting with https://');
      return;
    }
    setFormBrandCertificate(u);
    setBrandCertLinkDraft('');
    setShowBrandCertUrlField(false);
  };

  const submitCreate = async () => {
    if (!formName.trim() || !formCategoryId) {
      toast.error('Name and category are required');
      return;
    }
    if (!formBrand.trim()) {
      toast.error('Brand name is required');
      return;
    }
    if (!formBrandCertificate.trim()) {
      toast.error('Brand authorization certificate is required');
      return;
    }
    const additionalBrandDocUrls = formBrandAuthExtraUrls.map((s) => s.trim()).filter(Boolean);
    if (dealerAuthorizationRequired && additionalBrandDocUrls.length < 1) {
      toast.error('Add at least one additional document URL (e.g. dealer letter, invoice) for this brand.');
      return;
    }
    if (!formHsnCode.trim()) {
      toast.error('HSN code is required');
      return;
    }
    if (!formGstRate.trim()) {
      toast.error('GST rate is required');
      return;
    }
    if (Number.isNaN(Number(formGstRate)) || Number(formGstRate) < 0) {
      toast.error('Enter a valid GST rate');
      return;
    }
    const hasProductInfo =
      hasListingSpecs(formListingSpecs) ||
      Boolean(keyValueArrayToObject(formFeaturesAndSpecs)) ||
      Boolean(keyValueArrayToObject(formMaterialsAndCare)) ||
      Boolean(keyValueArrayToObject(formItemDetails)) ||
      Boolean(keyValueArrayToObject(formAdditionalDetails)) ||
      Boolean(formProductDescription.trim());
    if (!hasProductInfo) {
      toast.error('Add product information before submitting');
      return;
    }
    const mainCommerceErr = validateMainProductCommerce(formPrice, formCompare, formStock, formSku);
    if (mainCommerceErr) {
      toast.error(mainCommerceErr);
      return;
    }
    const variantCommerceErr = validateVariantRowsCommerce(formVariantRows);
    if (variantCommerceErr) {
      toast.error(variantCommerceErr);
      return;
    }
    const price = Number(formPrice);
    const compareAtPrice = Number(formCompare);
    const stockN = Math.trunc(Number(formStock));
    const imgs = productImagesToUrls(formImages);
    const variantPayload = formRowsToVariantGroups(formVariantRows);
    const metaTitleValue = formMetaKeywords.length
      ? formMetaKeywords.join(' + ')
      : formMetaTitle.trim();
    setSaving(true);
    try {
      await apiCreateProduct({
        name: formName.trim(),
        brand: formBrand.trim(),
        price,
        sku: formSku.trim(),
        categoryId: formCategoryId,
        stock: stockN,
        compareAtPrice,
        shortDescription: formShort.trim() || undefined,
        images: imgs.length ? imgs : undefined,
        video: formVideo.trim() || undefined,
        videoPublicId: formVideoPublicId.trim() || undefined,
        variants: variantPayload.length ? variantPayload : undefined,
        metaTitle: metaTitleValue || undefined,
        metaDescription: formMetaDesc.trim() || undefined,
        hsnCode: formHsnCode.trim(),
        gstRate: Number(formGstRate),
        brandAuthorizationCertificate: formBrandCertificate.trim(),
        brandAuthAdditionalDocumentUrls: dealerAuthorizationRequired ? additionalBrandDocUrls : [],
        lowStockThreshold: formLowStock ? Number(formLowStock) : undefined,
        weight: formWeight ? Number(formWeight) : undefined,
        dimensions: formDimensions.trim() || undefined,
        productLengthCm: formProductDimL.trim() ? Number(formProductDimL) : undefined,
        productWidthCm: formProductDimW.trim() ? Number(formProductDimW) : undefined,
        productHeightCm: formProductDimH.trim() ? Number(formProductDimH) : undefined,
        productWeightKg: formProductWeight.trim() ? Number(formProductWeight) : undefined,
        packageLengthCm: formDimL.trim() ? Number(formDimL) : undefined,
        packageWidthCm: formDimW.trim() ? Number(formDimW) : undefined,
        packageHeightCm: formDimH.trim() ? Number(formDimH) : undefined,
        packageWeightKg: formWeight.trim() ? Number(formWeight) : undefined,
        specifications: listingSpecsPayload(formListingSpecs),
        featuresAndSpecs: keyValueArrayToObject(formFeaturesAndSpecs),
        materialsAndCare: keyValueArrayToObject(formMaterialsAndCare),
        itemDetails: keyValueArrayToObject(formItemDetails),
        additionalDetails: keyValueArrayToObject(formAdditionalDetails),
        productDescription: formProductDescription.trim() || undefined,
        safetyInfo: formSafetyInfo.trim() || undefined,
        regulatoryInfo: formRegulatoryInfo.trim() || undefined,
        warrantyInfo: formWarrantyInfo.trim() || undefined,
        warrantyDurationValue: formWarrantyDurationValue.trim() ? Number(formWarrantyDurationValue) : undefined,
        warrantyDurationUnit: formWarrantyDurationUnit || undefined,
      });
      toast.success('Product created and submitted for approval', {
        description: dealerAuthorizationRequired
          ? 'Your brand documents will be reviewed before this listing can go live.'
          : 'Your product will be reviewed by our team and go live once approved.',
      });
      setCreateOpen(false);
      resetForm();
      clearDraft();
      loadProducts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editProduct) return;
    if (!formName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formBrand.trim()) {
      toast.error('Brand name is required');
      return;
    }
    if (!formBrandCertificate.trim()) {
      toast.error('Brand authorization certificate is required');
      return;
    }
    const additionalBrandDocUrlsEdit = formBrandAuthExtraUrls.map((s) => s.trim()).filter(Boolean);
    if (dealerAuthorizationRequired && additionalBrandDocUrlsEdit.length < 1) {
      toast.error('Add at least one additional document URL (e.g. dealer letter, invoice) for this brand.');
      return;
    }
    if (!formHsnCode.trim()) {
      toast.error('HSN code is required');
      return;
    }
    if (!formGstRate.trim()) {
      toast.error('GST rate is required');
      return;
    }
    if (Number.isNaN(Number(formGstRate)) || Number(formGstRate) < 0) {
      toast.error('Enter a valid GST rate');
      return;
    }
    const hasProductInfo =
      hasListingSpecs(formListingSpecs) ||
      Boolean(keyValueArrayToObject(formFeaturesAndSpecs)) ||
      Boolean(keyValueArrayToObject(formMaterialsAndCare)) ||
      Boolean(keyValueArrayToObject(formItemDetails)) ||
      Boolean(keyValueArrayToObject(formAdditionalDetails)) ||
      Boolean(formProductDescription.trim());
    if (!hasProductInfo) {
      toast.error('Add product information before saving');
      return;
    }
    const mainCommerceErr = validateMainProductCommerce(formPrice, formCompare, formStock, formSku);
    if (mainCommerceErr) {
      toast.error(mainCommerceErr);
      return;
    }
    const variantCommerceErr = validateVariantRowsCommerce(formVariantRows);
    if (variantCommerceErr) {
      toast.error(variantCommerceErr);
      return;
    }
    const price = Number(formPrice);
    const compareAtPrice = Number(formCompare);
    const stockN = Math.trunc(Number(formStock));
    const imgs = productImagesToUrls(formImages);
    const variantPayload = formRowsToVariantGroups(formVariantRows);
    const metaTitleValue = formMetaKeywords.length
      ? formMetaKeywords.join(' + ')
      : formMetaTitle.trim();
    setSaving(true);
    try {
      await apiUpdateProduct(editProduct.id, {
        name: formName.trim(),
        brand: formBrand.trim(),
        price,
        sku: formSku.trim(),
        stock: stockN,
        compareAtPrice,
        shortDescription: formShort.trim() || undefined,
        images: imgs,
        video: formVideo.trim() || undefined,
        videoPublicId: formVideoPublicId.trim() || undefined,
        variants: variantPayload.length ? variantPayload : [],
        ...(formCategoryId ? { categoryId: formCategoryId } : {}),
        metaTitle: metaTitleValue || undefined,
        metaDescription: formMetaDesc.trim() || undefined,
        hsnCode: formHsnCode.trim(),
        gstRate: Number(formGstRate),
        brandAuthorizationCertificate: formBrandCertificate.trim(),
        brandAuthAdditionalDocumentUrls: dealerAuthorizationRequired ? additionalBrandDocUrlsEdit : [],
        lowStockThreshold: formLowStock ? Number(formLowStock) : undefined,
        weight: formWeight ? Number(formWeight) : undefined,
        dimensions: formDimensions.trim() || undefined,
        productLengthCm: formProductDimL.trim() ? Number(formProductDimL) : undefined,
        productWidthCm: formProductDimW.trim() ? Number(formProductDimW) : undefined,
        productHeightCm: formProductDimH.trim() ? Number(formProductDimH) : undefined,
        productWeightKg: formProductWeight.trim() ? Number(formProductWeight) : undefined,
        packageLengthCm: formDimL.trim() ? Number(formDimL) : undefined,
        packageWidthCm: formDimW.trim() ? Number(formDimW) : undefined,
        packageHeightCm: formDimH.trim() ? Number(formDimH) : undefined,
        packageWeightKg: formWeight.trim() ? Number(formWeight) : undefined,
        specifications: listingSpecsPayload(formListingSpecs),
        featuresAndSpecs: keyValueArrayToObject(formFeaturesAndSpecs),
        materialsAndCare: keyValueArrayToObject(formMaterialsAndCare),
        itemDetails: keyValueArrayToObject(formItemDetails),
        additionalDetails: keyValueArrayToObject(formAdditionalDetails),
        productDescription: formProductDescription.trim() || undefined,
        safetyInfo: formSafetyInfo.trim() || undefined,
        regulatoryInfo: formRegulatoryInfo.trim() || undefined,
        warrantyInfo: formWarrantyInfo.trim() || undefined,
        warrantyDurationValue: formWarrantyDurationValue.trim() ? Number(formWarrantyDurationValue) : undefined,
        warrantyDurationUnit: formWarrantyDurationUnit || undefined,
      });
      const wasActive = editProduct.status === 'ACTIVE';
      if (wasActive) {
        toast.success('Changes submitted for admin approval. Your current listing stays live until approved.');
      } else {
        toast.success('Product updated');
      }
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
    if (
      product.status === 'PENDING' ||
      product.status === 'PENDING_BRAND_AUTHORIZATION' ||
      product.status === 'REJECTED'
    ) {
      toast.error('Cannot change status of pending or rejected products');
      return;
    }
    const newStatus = product.status === 'ON_HOLD' ? 'ACTIVE' : 'ON_HOLD';
    setTogglingHoldId(product.id);
    try {
      await apiUpdateProduct(product.id, { status: newStatus });
      toast.success(newStatus === 'ON_HOLD' ? 'Product put on hold' : 'Product activated');
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setTogglingHoldId(null);
    }
  };

  const canToggleHold = (product: SellerProduct) => {
    return product.status === 'ACTIVE' || product.status === 'ON_HOLD';
  };

  const columns: Column<SellerProduct>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (row) => {
        const variantGroups = Array.isArray(row.variants) ? row.variants as Array<{ options?: unknown[] }> : [];
        const variantCount = variantGroups.reduce((sum, g) => sum + (g.options?.length ?? 0), 0);
        const publicUrl = row.slug ? resolveStorefrontPreviewUrl(`/products/${row.slug}`) : null;
        const canPreview = !!publicUrl && row.status === 'ACTIVE';
        return (
          <div className="flex items-center gap-3 min-w-0 w-full py-0.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden shrink-0 border border-gray-200/60 shadow-sm">
              {row.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package2 size={18} className="text-gray-300" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {canPreview ? (
                  <a
                    href={publicUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Open product page in a new tab"
                    className="font-semibold text-[13px] line-clamp-2 leading-snug text-text-primary hover:text-primary-600 hover:underline transition-colors min-w-0"
                  >
                    {row.name}
                  </a>
                ) : (
                  <p
                    className="font-semibold text-[13px] line-clamp-2 leading-snug text-text-primary min-w-0"
                    title={row.status !== 'ACTIVE' ? 'This listing is not live yet — preview unavailable' : row.name}
                  >
                    {row.name}
                  </p>
                )}
                {canPreview && (
                  <a
                    href={publicUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Open product page in a new tab"
                    aria-label="Open product page in a new tab"
                    className="inline-flex items-center justify-center h-5 w-5 rounded text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-colors shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {row.brand && (
                  <span className="text-[11px] text-text-muted">{row.brand}</span>
                )}
                {row.brand && row.category?.name && <span className="text-gray-300">·</span>}
                {row.category?.name && (
                  <span className="text-[11px] text-text-muted">{row.category.name}</span>
                )}
                {variantCount > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary-600 font-medium">
                      <Layers className="h-3 w-3" />
                      {variantCount} variant{variantCount === 1 ? '' : 's'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'xelnovaProductId',
      header: 'Xel ID',
      className: 'w-[92px] hidden md:table-cell',
      render: (row) =>
        row.xelnovaProductId ? (
          <code className="text-[11px] font-mono text-text-secondary whitespace-nowrap">{row.xelnovaProductId}</code>
        ) : (
          <span className="text-[11px] text-text-muted">—</span>
        ),
    },
    {
      key: 'price',
      header: 'Price',
      className: 'w-[100px]',
      render: (row) => {
        const pendingPrice = row.hasPendingChanges && row.pendingChangesData?.price != null
          ? Number(row.pendingChangesData.price)
          : null;
        const pendingMrp = row.hasPendingChanges && row.pendingChangesData?.compareAtPrice != null
          ? Number(row.pendingChangesData.compareAtPrice)
          : null;
        return (
          <div>
            {pendingPrice != null ? (
              <>
                <p className="font-semibold text-warning-600" title="New price pending admin approval">
                  ₹{pendingPrice.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-text-muted line-through">₹{Number(row.price).toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-warning-600">Pending approval</span>
              </>
            ) : (
              <>
                <p className="font-semibold text-text-primary">₹{Number(row.price).toLocaleString('en-IN')}</p>
                {row.compareAtPrice != null && row.compareAtPrice > row.price && (
                  <p className="text-[11px] text-text-muted line-through">₹{Number(row.compareAtPrice).toLocaleString('en-IN')}</p>
                )}
              </>
            )}
            {pendingMrp != null && pendingPrice == null && (
              <p className="text-[11px] text-warning-600 italic">MRP pending</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: 'Stock',
      className: 'w-[80px]',
      render: (row) => {
        const isLow = row.stock > 0 && row.stock <= 5;
        const isOut = row.stock === 0;
        return (
          <span className={`font-medium tabular-nums ${isOut ? 'text-danger-600' : isLow ? 'text-warning-600' : 'text-text-primary'}`}>
            {row.stock}
            {isOut && <span className="block text-[10px] font-normal">Out of stock</span>}
            {isLow && <span className="block text-[10px] font-normal">Low stock</span>}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[120px]',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant={productStatusVariant(row.status)}>{productStatusLabel(row.status)}</Badge>
          {row.status === 'PENDING' && (
            <span className="text-[10px] text-warning-600">Awaiting review</span>
          )}
          {row.status === 'PENDING_BRAND_AUTHORIZATION' && (
            <span className="text-[10px] text-warning-600">Brand docs under review</span>
          )}
          {row.status === 'REJECTED' && row.rejectionReason && (
            <span className="text-[10px] text-danger-600 max-w-[120px] truncate" title={row.rejectionReason}>
              {row.rejectionReason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      className: 'w-[90px]',
      render: (row) => (
        <span className="text-text-muted text-xs tabular-nums">
          {new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[120px]',
      render: (row) => {
        const isToggling = togglingHoldId === row.id;
        return (
          <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openEdit(row)}
              disabled={isToggling}
              title="Edit"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {canToggleHold(row) && (
              <button
                type="button"
                onClick={() => toggleHold(row)}
                disabled={isToggling}
                title={row.status === 'ON_HOLD' ? 'Activate' : 'Put on hold'}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors ${
                  row.status === 'ON_HOLD'
                    ? 'border-primary-200 text-primary-600 hover:bg-primary-50'
                    : 'border-warning-200 text-warning-600 hover:bg-warning-50'
                }`}
              >
                {isToggling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : row.status === 'ON_HOLD' ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <Pause className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteProduct(row)}
              disabled={isToggling}
              title="Delete"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-danger-200 text-danger-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  const attributePresets = fetchedAttrPresets ?? BUNDLED_PRODUCT_ATTRIBUTE_PRESETS;

  const selectedSellerBrand = selectedSellerBrandId
    ? sellerBrands.find((b) => b.id === selectedSellerBrandId) ?? null
    : null;

  /**
   * Picker change — when the seller picks a brand they've already registered
   * we can auto-fill the name and reuse the certificate on file, saving them
   * from uploading the same document on every new product.
   */
  const handleSellerBrandPick = (id: string) => {
    setSelectedSellerBrandId(id);
    if (!id) {
      // "Add a new brand" — keep whatever the seller has typed so far so we
      // don't wipe their in-progress work. They can edit/replace freely.
      return;
    }
    const brand = sellerBrands.find((b) => b.id === id);
    if (!brand) return;
    setFormBrand(brand.name);
    setFormBrandCertificate((brand.authorizationCertificate ?? '').trim());
    setShowBrandCertUrlField(false);
    setBrandCertLinkDraft('');
    setBrandCertImageError(false);
  };

  const formFields = (
    <div className="space-y-5 relative">
      {editProduct && editLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-surface/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-text-muted">Loading product…</p>
        </div>
      )}

      <Input
        stackedLabel
        label="Product name"
        required
        value={formName}
        onChange={(e) => setFormName(e.target.value)}
      />
      <div className="space-y-2">
        {sellerBrands.length > 0 ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Choose brand
            </label>
            <select
              value={selectedSellerBrandId}
              onChange={(e) => handleSellerBrandPick(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none transition-all duration-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            >
              <option value="">+ Add a new brand…</option>
              {sellerBrands.map((b) => {
                const statusLabel = b.approved ? 'approved' : 'pending';
                const certLabel = b.authorizationCertificate ? ' • certificate on file' : '';
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} ({statusLabel}){certLabel}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-[11px] text-text-muted">
              Pick one of your registered brands to auto-fill the brand name and reuse the authorization certificate on file — no need to upload it again.
            </p>
          </div>
        ) : null}
        {selectedSellerBrand ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-sm text-emerald-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  Listing under your brand: <span className="font-semibold">{selectedSellerBrand.name}</span>
                </p>
                <p className="mt-0.5 text-xs text-emerald-800/80">
                  {selectedSellerBrand.approved
                    ? 'This brand is approved on Xelnova.'
                    : 'This brand is pending admin review.'}
                  {selectedSellerBrand.authorizationCertificate ? ' Certificate on file will be reused.' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSellerBrandPick('')}
                className="shrink-0 text-xs font-medium text-emerald-900 underline-offset-2 hover:underline"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <Input
            stackedLabel
            label="Brand name"
            required
            value={formBrand}
            onChange={(e) => setFormBrand(e.target.value)}
          />
        )}
        {!selectedSellerBrand && brandHintLoading && formBrand.trim() ? (
          <p className="text-xs text-text-muted">Checking brand listing rules…</p>
        ) : null}
        {!selectedSellerBrand && brandListingHint?.mode === 'dealer_authorization_required' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
            {brandListingHint.message}
          </div>
        ) : null}
        {!selectedSellerBrand && brandListingHint?.mode === 'new_brand' && formBrand.trim() ? (
          <p className="text-xs text-text-muted">
            This brand will be registered for your store and reviewed with the product.
          </p>
        ) : null}
      </div>
      <Input
        stackedLabel
        label="GST rate (%)"
        required
        type="number"
        min={0}
        value={formGstRate}
        onChange={(e) => setFormGstRate(e.target.value)}
        hint={
          <>
            Default {DEFAULT_GST_PERCENT}%. Enter prices below{' '}
            <span className="font-medium text-text-primary">inclusive of GST</span>; we store the
            pre-tax amount for records.
          </>
        }
      />
      <div className="rounded-xl border border-border bg-surface-muted/30 p-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Brand authorization certificate
          <span className="ml-0.5 text-danger-500">*</span>
        </label>
        <input
          ref={brandCertificateInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            void uploadBrandCertificate(file);
            e.target.value = '';
          }}
        />
        {selectedSellerBrand && (selectedSellerBrand.authorizationCertificate ?? '').trim() ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="relative h-40 min-w-[200px] max-w-sm flex-1 overflow-hidden rounded-xl border border-border bg-white">
                {!brandCertImageError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(selectedSellerBrand.authorizationCertificate ?? '').trim()}
                    alt="Brand authorization certificate"
                    className="h-full w-full object-contain p-1"
                    onError={() => setBrandCertImageError(true)}
                  />
                ) : (
                  <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 p-3 text-center">
                    <ImageIcon className="h-8 w-8 text-text-muted/60" />
                    <p className="text-[11px] text-text-muted">Image preview is not available for this file.</p>
                    <a
                      href={(selectedSellerBrand.authorizationCertificate ?? '').trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open certificate
                    </a>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-1.5">
                <p className="text-xs font-medium text-emerald-700">
                  Reusing certificate on file for <span className="font-semibold">{selectedSellerBrand.name}</span>.
                </p>
                <p className="text-[11px] text-text-muted">
                  Manage this brand&apos;s certificate from the <span className="font-medium">Brands</span> page.
                </p>
              </div>
            </div>
          </div>
        ) : formBrandCertificate.trim() ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="relative h-40 min-w-[200px] max-w-sm flex-1 overflow-hidden rounded-xl border border-border bg-white">
                {uploadingBrandCertificate ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                  </div>
                ) : null}
                {!brandCertImageError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formBrandCertificate.trim()}
                    alt="Brand authorization certificate"
                    className="h-full w-full object-contain p-1"
                    onError={() => setBrandCertImageError(true)}
                  />
                ) : (
                  <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 p-3 text-center">
                    <ImageIcon className="h-8 w-8 text-text-muted/60" />
                    <p className="text-[11px] text-text-muted">Image preview is not available for this file.</p>
                    <a
                      href={formBrandCertificate.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open certificate
                    </a>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => brandCertificateInputRef.current?.click()}
                  disabled={uploadingBrandCertificate}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploadingBrandCertificate ? 'Uploading…' : 'Change'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormBrandCertificate('');
                    setShowBrandCertUrlField(false);
                    setBrandCertLinkDraft('');
                  }}
                  disabled={uploadingBrandCertificate}
                  className="border-border text-text-secondary"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-text-muted">Certificate on file. Use Change to upload a different image or remove to clear.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => brandCertificateInputRef.current?.click()}
                disabled={uploadingBrandCertificate}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {uploadingBrandCertificate ? 'Uploading…' : 'Upload certificate'}
              </Button>
              {!showBrandCertUrlField ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBrandCertUrlField(true)}
                  className="text-text-secondary"
                >
                  Use image link instead
                </Button>
              ) : null}
            </div>
            {showBrandCertUrlField ? (
              <div className="flex flex-wrap items-stretch gap-2 pt-0.5">
                <div className="min-w-[200px] flex-1">
                  <Input
                    value={brandCertLinkDraft}
                    onChange={(e) => setBrandCertLinkDraft(e.target.value)}
                    placeholder="https://…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyBrandCertFromLink();
                      }
                    }}
                  />
                </div>
                <Button type="button" size="sm" onClick={applyBrandCertFromLink}>
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowBrandCertUrlField(false);
                    setBrandCertLinkDraft('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            <p className="text-[11px] text-text-muted">
              Upload a clear certificate image, or add a link to an image (not shown in the form after you save it).
            </p>
          </div>
        )}
      </div>
      {dealerAuthorizationRequired && (
        <div className="rounded-xl border border-border bg-surface-muted/30 p-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Additional brand documents
            <span className="ml-0.5 text-danger-500">*</span>
          </label>
          <p className="text-[11px] text-text-muted mb-2">
            Add at least one link (e.g. dealer letter, purchase invoice, or distributor ID). This listing stays hidden
            until an admin approves your documents.
          </p>
          <div className="space-y-2">
            {formBrandAuthExtraUrls.map((url, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="min-w-0 flex-1">
                  <Input
                    value={url}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormBrandAuthExtraUrls((prev) => prev.map((u, i) => (i === idx ? v : u)));
                    }}
                    placeholder="https://…"
                  />
                </div>
                {formBrandAuthExtraUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setFormBrandAuthExtraUrls((prev) => prev.filter((_, i) => i !== idx))}
                    title="Remove URL"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormBrandAuthExtraUrls((prev) => [...prev, ''])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add another URL
            </Button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          stackedLabel
          label="Price (₹), incl. GST"
          required
          type="number"
          min={0}
          step="0.01"
          value={formPrice}
          onChange={(e) => setFormPrice(e.target.value)}
        />
        <Input
          stackedLabel
          label="MRP (₹), incl. GST"
          required
          type="number"
          min={0}
          step="0.01"
          value={formCompare}
          onChange={(e) => setFormCompare(e.target.value)}
          hint="Maximum retail price — shown as the strike-through original price. Required for every product."
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          stackedLabel
          label="Stock"
          required
          type="number"
          min={0}
          step={1}
          value={formStock}
          onChange={(e) => setFormStock(e.target.value)}
          hint="Total units available (whole number)."
        />
        <Input
          stackedLabel
          label="SKU"
          required
          value={formSku}
          onChange={(e) => setFormSku(e.target.value)}
          placeholder="e.g. BRAND-ITEM-01"
          hint="Unique stock-keeping ID for this product (invoices, picking, and reports)."
        />
      </div>

      <ProductImageGallery
        images={formImages}
        onImagesChange={setFormImages}
        uploading={uploading}
        setUploading={setUploading}
      />

      <ProductVideoUpload
        videoUrl={formVideo}
        videoPublicId={formVideoPublicId}
        onVideoChange={setFormVideo}
        onVideoPublicIdChange={setFormVideoPublicId}
        uploading={uploadingVideo}
        setUploading={setUploadingVideo}
      />

      <div className="rounded-xl border border-border bg-surface-muted/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-text-primary">Variants</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Base price, MRP, stock, and SKU above apply to the listing overall. For every variant value, Price, MRP, Stock, and SKU are
              required (GST-inclusive, same as above). The main &ldquo;product label&rdquo; is only the default title shown on the storefront.
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
                        <th className="pb-1.5 pr-2 font-medium min-w-[300px]" title="1 main + up to 4 supporting images">Images</th>
                        <th className="pb-1.5 pr-2 font-medium min-w-[140px]" title="Optional product video (max 15MB)">Video <span className="text-text-muted font-normal">(optional)</span></th>
                        <th className="pb-1.5 pr-2 font-medium w-[100px]" title="Inclusive of GST">
                          Price (₹)<span className="text-danger-500">*</span>
                        </th>
                        <th className="pb-1.5 pr-2 font-medium w-[100px]" title="Inclusive of GST">
                          MRP (₹)<span className="text-danger-500">*</span>
                        </th>
                        <th className="pb-1.5 pr-2 font-medium w-[70px]">
                          Stock<span className="text-danger-500">*</span>
                        </th>
                        <th className="pb-1.5 pr-2 font-medium w-[90px]">
                          SKU<span className="text-danger-500">*</span>
                        </th>
                        <th className="pb-1.5 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {row.values.map((val) => (
                        <tr key={val.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-2 align-top">
                            <input
                              type="text"
                              value={val.label}
                              onChange={(e) => updateVariantValue(row.id, val.id, { label: e.target.value })}
                              placeholder="e.g. Red"
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          {row.kind === 'color' && (
                            <td className="py-2 pr-2 align-top">
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
                          <td className="py-2 pr-2 align-top">
                            <div className="flex items-start gap-2 flex-wrap">
                              {val.images.map((img, imgIdx) => (
                                <div key={imgIdx} className={`relative group/vi h-16 w-16 shrink-0 rounded-lg overflow-hidden border shadow-sm ${imgIdx === 0 ? 'border-primary-400 ring-2 ring-primary-200' : 'border-border'}`}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={img} alt="" className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 group-hover/vi:opacity-100 transition-opacity">
                                    {imgIdx !== 0 && (
                                      <button type="button" onClick={() => promoteVariantImage(row.id, val.id, imgIdx)} className="rounded p-0.5 text-white hover:bg-white/20" title="Set as main">
                                        <Crown className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button type="button" onClick={() => removeVariantImage(row.id, val.id, imgIdx)} className="rounded p-0.5 text-white hover:bg-white/20" title="Remove">
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                  {imgIdx === 0 && <span className="absolute top-0.5 left-0.5 bg-primary-500 text-[9px] font-bold text-white px-1 py-0.5 leading-none rounded shadow-sm">M</span>}
                                  {/* Reorder arrows — mirrors the main gallery's swap controls so sellers
                                      can shuffle variant images without drag-and-drop. */}
                                  {val.images.length > 1 && (
                                    <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-0.5 pb-0.5 z-10">
                                      <button
                                        type="button"
                                        disabled={imgIdx === 0}
                                        onClick={(e) => { e.stopPropagation(); swapVariantImage(row.id, val.id, imgIdx, imgIdx - 1); }}
                                        className="flex h-4 w-4 items-center justify-center rounded bg-black/55 text-white opacity-0 group-hover/vi:opacity-100 transition-opacity hover:bg-primary-600 disabled:opacity-20 disabled:cursor-not-allowed"
                                        title="Move left"
                                        aria-label="Swap with previous image"
                                      >
                                        <ChevronLeftIcon className="h-2.5 w-2.5" />
                                      </button>
                                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded bg-black/50 px-0.5 text-[9px] font-bold text-white tabular-nums pointer-events-none">
                                        {imgIdx + 1}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={imgIdx >= val.images.length - 1}
                                        onClick={(e) => { e.stopPropagation(); swapVariantImage(row.id, val.id, imgIdx, imgIdx + 1); }}
                                        className="flex h-4 w-4 items-center justify-center rounded bg-black/55 text-white opacity-0 group-hover/vi:opacity-100 transition-opacity hover:bg-primary-600 disabled:opacity-20 disabled:cursor-not-allowed"
                                        title="Move right"
                                        aria-label="Swap with next image"
                                      >
                                        <ChevronRightIcon className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {val.images.length < MAX_VARIANT_IMAGES && (
                                <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-muted/40 text-text-muted hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/50 transition-colors" title={`Add images (${val.images.length}/${MAX_VARIANT_IMAGES})`}>
                                  <ImageIcon className="h-6 w-6" />
                                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { const fl = e.target.files; if (fl && fl.length > 0) handleVariantImageUpload(row.id, val.id, fl); e.target.value = ''; }} />
                                </label>
                              )}
                            </div>
                          </td>
                          <td className="py-2 pr-2 align-top">
                            {val.video ? (
                              <div className="relative h-16 w-24 rounded-lg overflow-hidden border border-border bg-surface group/video">
                                <video
                                  src={val.video}
                                  className="h-full w-full object-cover"
                                  muted
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/video:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => removeVariantVideo(row.id, val.id)}
                                    className="rounded p-1 text-white hover:bg-white/20"
                                    title="Remove video"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="bg-black/60 rounded-full p-1.5">
                                    <Film className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <label className="flex h-16 w-24 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-muted/40 text-text-muted hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/50 transition-colors group" title="Add video (max 15MB)">
                                <Film className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/quicktime"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleVariantVideoUpload(row.id, val.id, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </td>
                          <td className="py-2 pr-2 align-top">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={val.price}
                              onChange={(e) => updateVariantValue(row.id, val.id, { price: e.target.value })}
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          <td className="py-2 pr-2 align-top">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={val.compareAtPrice}
                              onChange={(e) => updateVariantValue(row.id, val.id, { compareAtPrice: e.target.value })}
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          <td className="py-2 pr-2 align-top">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={val.stock}
                              onChange={(e) => updateVariantValue(row.id, val.id, { stock: e.target.value })}
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          <td className="py-2 pr-2 align-top">
                            <input
                              type="text"
                              value={val.sku}
                              onChange={(e) => updateVariantValue(row.id, val.id, { sku: e.target.value })}
                              placeholder="e.g. SKU-01"
                              className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary-500"
                            />
                          </td>
                          <td className="py-2 align-top">
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
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Category
            <span className="ml-0.5 text-danger-500">*</span>
          </label>
          <CategorySelector
            categories={categories}
            value={formCategoryId}
            onChange={setFormCategoryId}
            required
            placeholder="Select category"
          />
        </div>
      )}
      {editProduct && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Change category
          </label>
          <CategorySelector
            categories={categories}
            value={formCategoryId}
            onChange={setFormCategoryId}
            placeholder="Keep current category"
          />
          <p className="mt-1 text-xs text-text-muted">Leave empty to retain the existing category.</p>
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Short description
        </label>
        <textarea
          className="w-full min-h-[80px] rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
          value={formShort}
          onChange={(e) => setFormShort(e.target.value)}
        />
        <p className="mt-1 text-xs text-text-muted">Optional one-liner shown on the product card.</p>
      </div>

      {/* Listing specifications (key/value, shown on the product page) */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm font-semibold text-text-primary mb-1">Listing specifications</p>
        <p className="text-[11px] text-text-muted mb-3">
          Optional attributes buyers see in the Specifications section (e.g. RAM, Color, Material).
        </p>
        <div className="space-y-2">
          {formListingSpecs.map((row) => (
            <div key={row.id} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="mb-1 block text-[11px] font-medium text-text-muted">Name</label>
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) =>
                    setFormListingSpecs((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)),
                    )
                  }
                  placeholder="e.g. RAM"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="mb-1 block text-[11px] font-medium text-text-muted">Value</label>
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) =>
                    setFormListingSpecs((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)),
                    )
                  }
                  placeholder="e.g. 8GB"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setFormListingSpecs((prev) => prev.filter((r) => r.id !== row.id))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFormListingSpecs((prev) => [
                ...prev,
                { id: `sp-${Date.now()}`, key: '', value: '' },
              ])
            }
          >
            Add specification
          </Button>
        </div>
      </div>

      {/* Product dimensions (buyer-facing) */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm font-semibold text-text-primary mb-1">Product dimensions</p>
        <p className="text-[11px] text-text-muted mb-3">Physical item size and weight — shown to customers on the product page.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'pdl', label: 'Length (cm)', value: formProductDimL, set: setFormProductDimL },
            { id: 'pdw', label: 'Width (cm)', value: formProductDimW, set: setFormProductDimW },
            { id: 'pdh', label: 'Height (cm)', value: formProductDimH, set: setFormProductDimH },
          ].map(({ id, label, value, set }) => (
            <div key={id}>
              <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-text-muted">
                {label}
              </label>
              <input
                id={id}
                type="number"
                step="0.1"
                min="0"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
              />
            </div>
          ))}
          <div>
            <label htmlFor="pdwt" className="mb-1 block text-[11px] font-medium text-text-muted">
              Weight (kg)
            </label>
            <input
              id="pdwt"
              type="number"
              step="0.01"
              min="0"
              value={formProductWeight}
              onChange={(e) => setFormProductWeight(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            />
          </div>
        </div>
      </div>

      {/* Package dimensions (shipping — couriers & rate estimates) */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm font-semibold text-text-primary mb-3">Package dimensions (shipping)</p>
        <Input
          stackedLabel
          label="Package weight (kg)"
          required
          type="number"
          step="0.01"
          min="0"
          value={formWeight}
          onChange={(e) => setFormWeight(e.target.value)}
          hint="Used when booking couriers and for shipping estimates. Can include packaging."
        />
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Package size (cm)
            <span className="ml-0.5 text-danger-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dim-l', label: 'Length', value: formDimL, set: setFormDimL },
              { id: 'dim-w', label: 'Width', value: formDimW, set: setFormDimW },
              { id: 'dim-h', label: 'Height', value: formDimH, set: setFormDimH },
            ].map(({ id, label, value, set }) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-text-muted">
                  {label}
                </label>
                <input
                  id={id}
                  type="number"
                  step="0.1"
                  min="0"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                />
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Carton size sent to couriers — can be larger than the product itself.
          </p>
        </div>
      </div>

      {/* Product Information (Amazon-style sections) */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs font-semibold text-text-primary mb-1">Product Information *</p>
        <p className="text-[10px] text-text-muted mb-4">Add at least one section below. Presets are provided and can be customized by sellers.</p>
        
        {/* Features & Specs */}
        <PresetKeyValueEditor
          label="Features & Specs"
          description="Choose predefined attributes and values (custom options available where needed)."
          preset={attributePresets.featuresSpecs}
          items={formFeaturesAndSpecs}
          onChange={setFormFeaturesAndSpecs}
        />

        {/* Materials & Care */}
        <PresetKeyValueEditor
          label="Materials & Care"
          description="Choose predefined material and care options (custom values where needed)."
          preset={attributePresets.materialsCare}
          items={formMaterialsAndCare}
          onChange={setFormMaterialsAndCare}
        />

        {/* Item Details */}
        <PresetKeyValueEditor
          label="Item Details"
          description="Manufacturer, origin, and identification fields from predefined lists."
          preset={attributePresets.itemDetails}
          items={formItemDetails}
          onChange={setFormItemDetails}
        />

        {/* Additional Details */}
        <PresetKeyValueEditor
          label="Additional Details"
          description="Rankings, compatibility, audience, and more — pick from lists or add custom values."
          preset={attributePresets.additionalDetails}
          items={formAdditionalDetails}
          onChange={setFormAdditionalDetails}
        />

        {/* Product Description */}
        <div className="mt-4">
          <BulletListEditor
            label="Product description"
            description="Add up to 5 short, scannable bullets that highlight what makes the product great, plus an optional supporting paragraph."
            bulletPlaceholder="e.g. 100% pure cotton — soft against the skin"
            paragraphLabel="Long-form description"
            paragraphPlaceholder="Tell the full story of the product — features, benefits, materials, and any usage notes."
            paragraphRows={5}
            value={formProductDescription}
            onChange={setFormProductDescription}
          />
        </div>

        {/* Warranty Info */}
        <div className="mt-4">
          <Input
            stackedLabel
            label="Warranty information"
            value={formWarrantyInfo}
            onChange={(e) => setFormWarrantyInfo(e.target.value)}
            hint="For example, 1 Year Manufacturer Warranty."
          />
        </div>

        {/* Warranty Duration */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Warranty duration
            </label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 1, 6, 12"
              value={formWarrantyDurationValue}
              onChange={(e) => setFormWarrantyDurationValue(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            />
            <p className="mt-1 text-xs text-text-muted">Leave blank to use text-only warranty above.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Warranty unit
            </label>
            <select
              value={formWarrantyDurationUnit}
              onChange={(e) => setFormWarrantyDurationUnit(e.target.value as 'DAYS' | 'MONTHS' | 'YEARS' | '')}
              className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            >
              <option value="">— Select unit —</option>
              <option value="DAYS">Days</option>
              <option value="MONTHS">Months</option>
              <option value="YEARS">Years</option>
            </select>
          </div>
        </div>

        {/* Safety Info */}
        <div className="mt-4">
          <BulletListEditor
            label="Safety & product resources"
            description="List up to 5 quick safety call-outs (warnings, age recommendations, certifications) and any longer notes below."
            bulletPlaceholder="e.g. Not recommended for children under 3 years"
            paragraphLabel="Additional safety notes"
            paragraphPlaceholder="Detailed safety information, warnings, age recommendations, or links to manuals."
            paragraphRows={3}
            value={formSafetyInfo}
            onChange={setFormSafetyInfo}
          />
        </div>

        {/* Regulatory Info */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Regulatory information
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 resize-y"
            value={formRegulatoryInfo}
            onChange={(e) => setFormRegulatoryInfo(e.target.value)}
          />
          <p className="mt-1 text-xs text-text-muted">BIS marking, certifications, compliance information.</p>
        </div>
      </div>

      {/* SEO & Tax Fields */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm font-semibold text-text-primary mb-3">SEO &amp; Tax</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Meta title keywords
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={metaKeywordInput}
                  onChange={(e) => setMetaKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMetaKeyword(metaKeywordInput);
                    }
                  }}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => addMetaKeyword(metaKeywordInput)}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <p className="mt-1 text-xs text-text-muted">Type a keyword and press Enter or click Add.</p>
            {formMetaKeywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formMetaKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeMetaKeyword(keyword)}
                      className="text-primary-600 hover:text-danger-600"
                      aria-label={`Remove ${keyword}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {formMetaKeywords.length === 0 && (
              <div className="mt-2">
                <Input
                  stackedLabel
                  label="Fallback meta title"
                  value={formMetaTitle}
                  onChange={(e) => setFormMetaTitle(e.target.value)}
                  hint="Used if no keywords are added above."
                />
              </div>
            )}
          </div>
          <Input
            stackedLabel
            label="HSN code"
            required
            value={formHsnCode}
            onChange={(e) => setFormHsnCode(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              stackedLabel
              label="Meta description"
              value={formMetaDesc}
              onChange={(e) => setFormMetaDesc(e.target.value)}
              hint="Optional description used by search engines."
            />
          </div>
          <Input
            stackedLabel
            label="Low stock threshold"
            type="number"
            value={formLowStock}
            onChange={(e) => setFormLowStock(e.target.value)}
            hint="Get an alert when stock falls below this number."
          />
        </div>
      </div>

      {/* Variant Details Expansion - Shows all variants in a detailed table view */}
      {editProduct && (
        <ProductVariantsExpansion
          productId={editProduct.id}
          productName={editProduct.name}
          basePrice={editProduct.price}
          baseStock={editProduct.stock}
          baseSku={formSku || undefined}
          variants={editProduct.variants}
          className="mt-4"
        />
      )}
    </div>
  );

  return (
    <>
      <DashboardHeader title="Inventory" />
      <VerificationBanner />
      <div className="p-6 space-y-6">
        {/*
          Per testing observation #12 — surface any auto-saved product draft
          right at the top of the inventory list so sellers whose session
          expired (or who navigated away mid-edit) can resume immediately.
        */}
        <DraftBanner
          isApproved={isApproved}
          onResume={openCreate}
          onDiscard={clearDraft}
        />

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
          transition={{ delay: 0.04 }}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 max-w-md"
        >
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Search products by name, category or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-text-muted hover:text-text-primary"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-surface p-6 shadow-card"
        >
          <DataTable
            columns={columns}
            data={filteredProducts}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage={search ? `No products match "${search}"` : 'No products yet'}
            renderExpanded={(row) => (
              <InlineProductExpansion
                product={row}
                onEdit={() => openEdit(row)}
                onToggleHold={() => toggleHold(row)}
                onDelete={() => setDeleteProduct(row)}
                canHold={canToggleHold(row)}
                onStockUpdate={(id, stock, price) => {
                  setProducts((prev) =>
                    prev.map((p) => (p.id === id ? { ...p, stock, price } : p)),
                  );
                }}
              />
            )}
          />
        </motion.div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Add product"
        size="lg"
        className="max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Autosave on</span>
            {draftRestored ? (
              <span className="text-emerald-700">— draft restored from your last session</span>
            ) : draftSavedAt ? (
              <span className="text-emerald-700">
                — saved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span className="text-emerald-700">— your changes are saved as you type</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              resetForm();
              toast.success('Draft discarded');
            }}
            className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
          >
            Discard draft
          </button>
        </div>
        {formFields}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving || uploading || uploadingBrandCertificate || uploadingVideo}>
            Cancel
          </Button>
          <Button type="button" onClick={submitCreate} disabled={saving || uploading || uploadingBrandCertificate || uploadingVideo}>
            {saving ? 'Saving…' : 'Create'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editProduct}
        onClose={() => {
          if (!saving && !editLoading) {
            setDisplayXelnovaId(null);
            setEditProduct(null);
          }
        }}
        title={displayXelnovaId ? `Edit product · ${displayXelnovaId}` : 'Edit product'}
        size="lg"
        className="max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto"
      >
        {editProduct?.status === 'ACTIVE' && (
          <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800">
            <p className="font-semibold mb-0.5">Editing a published listing</p>
            <p>
              Saving changes to the catalog details (name, description, price, images, variants, etc.)
              will mark this product as <strong>Pending review</strong> until an admin re-approves the
              changes. Your existing listing stays live on the marketplace in the meantime, and the
              new details only go live after approval. Stock-only updates do not require re-approval.
            </p>
          </div>
        )}
        {formFields}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setEditProduct(null)} disabled={saving || uploading || uploadingBrandCertificate || uploadingVideo}>
            Cancel
          </Button>
          <Button type="button" onClick={submitEdit} disabled={saving || uploading || editLoading || uploadingBrandCertificate || uploadingVideo}>
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
