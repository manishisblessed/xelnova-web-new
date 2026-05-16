'use client';

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge, Button } from '@xelnova/ui';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormSelect, FormToggle, FormTextarea } from '@/components/dashboard/form-field';
import { AdminActionsDropdown } from '@/components/dashboard/admin-actions-dropdown';
import {
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Loader2,
  Layers,
  Package,
  ImageOff,
  TrendingDown,
  Search,
  RefreshCw,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiUpdate, apiPost, apiGet, apiGetAdminProduct } from '@/lib/api';
import { ProductVariantsExpansion } from '@/components/product-variants-expansion';

const STATUS_OPTIONS = [
  'ACTIVE',
  'PENDING',
  'PENDING_BRAND_AUTHORIZATION',
  'DRAFT',
  'REJECTED',
  'ON_HOLD',
] as const;

type ProductStatus = (typeof STATUS_OPTIONS)[number];

interface Product {
  id: string;
  name: string;
  slug: string;
  /** Auto-generated public item code (e.g. XEL9045). */
  xelnovaProductId?: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  status: ProductStatus;
  isFeatured: boolean;
  isTrending: boolean;
  isFlashDeal: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  rejectionReason?: string | null;
  imageRejectionReason?: string | null;
  commissionRate?: number | null;
  images?: string[];
  variants?: unknown;
  category: { name: string } | null;
  seller: { storeName: string } | null;
  bestSellersRank?: number | null;
  hasPendingChanges?: boolean;
  pendingChangesData?: unknown;
  pendingChangesSubmittedAt?: string | null;
  /** Admin-controlled replacement eligibility (set at approval time). */
  isReplaceable?: boolean;
  /** Replacement window in days. Currently the admin chooses between 2 / 5 / 7. */
  replacementWindow?: number | null;
}

/** Replacement windows admins can pick from at approval time. */
const REPLACEMENT_WINDOW_OPTIONS = [2, 5, 7] as const;
type ReplacementWindow = (typeof REPLACEMENT_WINDOW_OPTIONS)[number];

const RETURN_POLICY_PRESETS = [
  { value: 'NON_RETURNABLE', label: 'Non-returnable' },
  { value: 'EASY_RETURN_3_DAYS', label: '3 Days Easy Return' },
  { value: 'EASY_RETURN_7_DAYS', label: '7 Days Easy Return' },
  { value: 'REPLACEMENT_ONLY', label: 'Replacement only' },
  { value: 'RETURN_PLUS_REPLACEMENT', label: 'Return + Replacement' },
] as const;

interface BrandRecord {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  approved: boolean;
  isActive: boolean;
  authorizationCertificate: string | null;
  proposedBy: string | null;
  proposer?: {
    id: string;
    storeName: string | null;
    user?: { email: string | null } | null;
  } | null;
}

/** Full product from GET /admin/products/:id (extends list row with seller copy fields). */
type AdminProductDetail = Product & {
  shortDescription?: string | null;
  description?: string | null;
  productDescription?: string | null;
  safetyInfo?: string | null;
  regulatoryInfo?: string | null;
  warrantyInfo?: string | null;
  returnPolicyPreset?: string | null;
  warrantyDurationValue?: number | null;
  warrantyDurationUnit?: string | null;
  highlights?: string[];
  tags?: string[];
  weight?: number | null;
  dimensions?: string | null;
  sku?: string | null;
  brand?: string | null;
  variants?: unknown;
  featuresAndSpecs?: unknown;
  materialsAndCare?: unknown;
  itemDetails?: unknown;
  additionalDetails?: unknown;
  metaTitle?: string | null;
  metaDescription?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  lowStockThreshold?: number | null;
  /** Extra proof URLs for authorized-dealer listings (brand registered by another seller). */
  brandAuthAdditionalDocumentUrls?: string[];
  deliveredBy?: string | null;
  isReplaceable?: boolean;
  replacementWindow?: number | null;
  category?: { id: string; name: string } | null;
  seller?: { id?: string; storeName: string; email?: string | null; phone?: string | null } | null;
  /**
   * Resolved Brand record (looked up by name). When present, the admin can
   * verify the seller's brand authorisation certificate before approving
   * the listing.
   */
  brandRecord?: BrandRecord | null;
};

// ─── Variant types (shared shape with seller @/lib/product-variants) ───
type AdminVariantOption = {
  value?: string;
  label?: string;
  available?: boolean;
  hex?: string;
  images?: string[];
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  sku?: string;
};
type AdminVariantGroup = {
  type?: string;
  label?: string;
  defaultLabel?: string;
  options?: AdminVariantOption[];
  sizeChart?: { label?: string; values?: Record<string, string> }[];
};

function isVariantArray(v: unknown): v is AdminVariantGroup[] {
  return Array.isArray(v) && v.every((g) => g && typeof g === 'object');
}

/**
 * Renders all product variants (Color, Size, etc.) as an admin-friendly grid
 * so reviewers can verify every SKU/option before approval — without having to
 * decode raw JSON.
 */
function VariantsPreview({ variants }: { variants: unknown }) {
  if (!isVariantArray(variants) || variants.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-primary">
          Variants &middot; {variants.length} group{variants.length === 1 ? '' : 's'}
        </p>
        <span className="text-[10px] text-text-muted">
          Total options: {variants.reduce((acc, g) => acc + (g.options?.length ?? 0), 0)}
        </span>
      </div>
      <div className="space-y-3">
        {variants.map((group, gi) => {
          const opts = group.options ?? [];
          return (
            <div key={`${group.type ?? 'g'}-${gi}`} className="rounded-xl border border-border bg-surface-muted/30 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-text-primary">
                  {group.label || group.type || `Group ${gi + 1}`}
                  <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-text-muted">
                    {group.type ?? 'option'}
                  </span>
                </p>
                {group.defaultLabel && (
                  <span className="text-[11px] text-text-muted">
                    Default label: <span className="text-text-secondary font-medium">{group.defaultLabel}</span>
                  </span>
                )}
              </div>

              {opts.length === 0 ? (
                <p className="text-xs text-text-muted">No options.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {opts.map((opt, oi) => (
                    <div
                      key={`${opt.value ?? oi}-${oi}`}
                      className={`rounded-lg border bg-surface px-2.5 py-2 ${
                        opt.available === false ? 'border-danger-200 bg-danger-50/40' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {opt.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={opt.images[0]}
                            alt={opt.label || opt.value || ''}
                            className="h-12 w-12 rounded-md object-cover border border-border shrink-0"
                          />
                        ) : opt.hex ? (
                          <span
                            className="h-12 w-12 rounded-md border border-border shrink-0"
                            style={{ background: opt.hex }}
                            title={opt.hex}
                          />
                        ) : (
                          <span className="h-12 w-12 rounded-md border border-dashed border-border bg-surface-muted shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-text-primary truncate" title={opt.label}>
                            {opt.label || opt.value || `Option ${oi + 1}`}
                          </p>
                          <div className="mt-0.5 text-[11px] text-text-muted leading-relaxed space-y-0.5">
                            {opt.price != null && (
                              <p>
                                <span className="text-text-secondary font-medium">₹{Number(opt.price).toLocaleString()}</span>
                                {opt.compareAtPrice != null && opt.compareAtPrice > opt.price && (
                                  <span className="ml-1 line-through">₹{Number(opt.compareAtPrice).toLocaleString()}</span>
                                )}
                              </p>
                            )}
                            {opt.stock != null && (
                              <p>
                                Stock:{' '}
                                <span className={Number(opt.stock) <= 5 ? 'text-danger-500 font-medium' : 'text-text-secondary'}>
                                  {opt.stock}
                                </span>
                              </p>
                            )}
                            {opt.sku && (
                              <p className="truncate" title={opt.sku}>
                                SKU: <span className="text-text-secondary">{opt.sku}</span>
                              </p>
                            )}
                            {opt.available === false && (
                              <p className="text-danger-500 font-medium">Unavailable</p>
                            )}
                            {opt.images && opt.images.length > 1 && (
                              <p className="text-text-muted">+{opt.images.length - 1} more image{opt.images.length - 1 === 1 ? '' : 's'}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {opt.images && opt.images.length > 1 && (
                        <div className="mt-2 flex gap-1 overflow-x-auto">
                          {opt.images.slice(1, 5).map((url, ii) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={ii}
                              src={url}
                              alt=""
                              className="h-9 w-9 rounded border border-border object-cover shrink-0"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(group.sizeChart) && group.sizeChart.length > 0 && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-[11px] font-semibold text-primary-600 hover:text-primary-700">
                    Size chart ({group.sizeChart.length} rows)
                  </summary>
                  <div className="mt-2 overflow-x-auto rounded-md border border-border bg-surface">
                    <table className="w-full text-[11px]">
                      <thead className="bg-surface-muted/50 text-text-muted">
                        <tr>
                          <th className="px-2 py-1 text-left">Size</th>
                          {Object.keys(group.sizeChart[0]?.values ?? {}).map((h) => (
                            <th key={h} className="px-2 py-1 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.sizeChart.map((row, ri) => (
                          <tr key={ri} className="border-t border-border">
                            <td className="px-2 py-1 font-medium text-text-primary">{row.label ?? '—'}</td>
                            {Object.keys(group.sizeChart![0]?.values ?? {}).map((h) => (
                              <td key={h} className="px-2 py-1 text-text-secondary">{row.values?.[h] ?? '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpecSection({
  label,
  value,
  excludeKeys,
}: {
  label: string;
  value: unknown;
  /**
   * Keys to drop from the rendered list. Compared case-insensitively against
   * each entry's key. Use this to avoid duplicating data that's already
   * surfaced more prominently elsewhere in the modal (e.g. the brand
   * authorisation certificate, which we lift into the brand block).
   */
  excludeKeys?: string[];
}) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const skip = new Set((excludeKeys ?? []).map((k) => k.toLowerCase().trim()));
  const entries = Object.entries(o).filter(
    ([k, v]) =>
      v != null &&
      String(v).trim() !== '' &&
      !skip.has(k.toLowerCase().trim()),
  );
  if (entries.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface-muted/30 p-3">
      <p className="text-xs font-semibold text-text-primary mb-2">{label}</p>
      <dl className="space-y-1.5 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-x-3 gap-y-0.5">
            <dt className="text-text-muted text-xs shrink-0">{k}</dt>
            <dd className="text-text-primary break-words">{String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Pulls the seller-uploaded brand authorisation certificate URL out of the
 * product's `additionalDetails` JSON. Sellers upload this on every listing
 * (see `seller-dashboard.service.ts → createProduct`) and the field is keyed
 * loosely — we match common variants case-insensitively so admin UX is robust
 * against future renames.
 */
const CERT_KEY_MATCHERS = [
  'brand authorization certificate',
  'brand authorisation certificate',
  'brand authorisation',
  'brand authorization',
  'brand certificate',
  'authorization certificate',
  'authorisation certificate',
];

function extractAdditionalCertUrl(additionalDetails: unknown): string | null {
  if (!additionalDetails || typeof additionalDetails !== 'object' || Array.isArray(additionalDetails)) {
    return null;
  }
  const obj = additionalDetails as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    const norm = k.toLowerCase().trim();
    if (!CERT_KEY_MATCHERS.includes(norm)) continue;
    const raw = typeof v === 'string' ? v.trim() : '';
    if (raw && /^https?:\/\//i.test(raw)) return raw;
  }
  return null;
}

/** Returns the actual additionalDetails key that matched (if any) so we can hide it from the generic list. */
function findAdditionalCertKey(additionalDetails: unknown): string | null {
  if (!additionalDetails || typeof additionalDetails !== 'object' || Array.isArray(additionalDetails)) {
    return null;
  }
  const obj = additionalDetails as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (CERT_KEY_MATCHERS.includes(k.toLowerCase().trim())) return k;
  }
  return null;
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|bmp|svg)(\?|#|$)/i.test(url) || /\/image\/upload\//i.test(url);
}

/**
 * Renders the seller's brand authorisation certificate inline so the admin can
 * eyeball it without leaving the modal. Falls back to a labelled link when the
 * URL is neither an image nor a PDF.
 */
function CertificatePreview({ url }: { url: string }) {
  const pdf = isPdfUrl(url);
  const image = !pdf && isImageUrl(url);
  return (
    <div className="mt-2 space-y-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 underline break-all"
      >
        Open document {pdf ? '(PDF)' : ''}
      </a>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt="Brand authorisation certificate"
            className="max-h-48 max-w-full rounded-lg border border-border object-contain bg-white"
          />
        </a>
      )}
      {pdf && (
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-text-muted">
          PDF certificate &middot; click &ldquo;Open document&rdquo; above to review.
        </div>
      )}
    </div>
  );
}

function formatProductStatusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function statusBadgeVariant(status: ProductStatus): 'success' | 'warning' | 'danger' | 'default' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'PENDING_BRAND_AUTHORIZATION':
      return 'warning';
    case 'DRAFT':
      return 'default';
    case 'REJECTED':
      return 'danger';
    case 'ON_HOLD':
      return 'warning';
    default:
      return 'default';
  }
}

function StatusIcon({ status }: { status: ProductStatus }) {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle size={14} className="text-success-500" />;
    case 'PENDING':
      return <Clock size={14} className="text-warning-500" />;
    case 'PENDING_BRAND_AUTHORIZATION':
      return <Clock size={14} className="text-warning-500" />;
    case 'REJECTED':
      return <XCircle size={14} className="text-danger-500" />;
    case 'ON_HOLD':
      return <AlertTriangle size={14} className="text-warning-500" />;
    default:
      return null;
  }
}

// Field display names for better readability
const FIELD_LABELS: Record<string, string> = {
  name: 'Product Name',
  shortDescription: 'Short Description',
  description: 'Description',
  productDescription: 'Product Description',
  price: 'Price',
  compareAtPrice: 'Compare At Price (MRP)',
  images: 'Images',
  video: 'Video',
  videoPublicId: 'Video Public ID',
  variants: 'Variants',
  categoryId: 'Category',
  brand: 'Brand',
  brandAuthorizationCertificate: 'Brand Auth Certificate',
  highlights: 'Highlights',
  tags: 'Tags',
  featuresAndSpecs: 'Features & Specifications',
  materialsAndCare: 'Materials & Care',
  itemDetails: 'Item Details',
  additionalDetails: 'Additional Details',
  safetyInfo: 'Safety Information',
  regulatoryInfo: 'Regulatory Information',
  warrantyInfo: 'Warranty Information',
  weight: 'Weight (kg)',
  dimensions: 'Dimensions',
  hsnCode: 'HSN Code',
  gstRate: 'GST Rate (%)',
  metaTitle: 'Meta Title',
  metaDescription: 'Meta Description',
  sku: 'SKU',
  brandAuthAdditionalDocumentUrls: 'Additional Brand Documents',
  stock: 'Stock',
};

interface VariantOption {
  label?: string;
  value?: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  images?: string[];
  available?: boolean;
}

interface VariantGroup {
  type?: string;
  label?: string;
  options?: VariantOption[];
}

/**
 * Pick the best image URL to represent the product visually.
 *
 * Some sellers attach all photos to variants instead of the top-level
 * `images` array (e.g. a colour-only listing where every option has its
 * own gallery). When we look up a thumbnail we therefore fall back to
 * the first variant option image so the row/preview never renders a
 * blank tile while the listing has photos available.
 */
function pickProductThumbnail(p: { images?: string[] | null; variants?: unknown }): string | null {
  if (Array.isArray(p.images) && p.images.length > 0 && typeof p.images[0] === 'string') {
    return p.images[0] as string;
  }
  const variants = (p.variants ?? []) as VariantGroup[];
  if (!Array.isArray(variants)) return null;
  for (const group of variants) {
    for (const opt of group?.options ?? []) {
      const url = opt?.images?.[0];
      if (typeof url === 'string' && url) return url;
    }
  }
  return null;
}

/**
 * Combined gallery for the admin preview modal — top-level product
 * images first, followed by every variant option image (deduped). This
 * means admins can still review the photos of a listing whose images
 * live solely on the variants.
 */
function collectProductGallery(p: { images?: string[] | null; variants?: unknown }): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (url: unknown) => {
    if (typeof url !== 'string' || !url) return;
    if (seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  for (const u of p.images ?? []) add(u);
  const variants = (p.variants ?? []) as VariantGroup[];
  if (Array.isArray(variants)) {
    for (const group of variants) {
      for (const opt of group?.options ?? []) {
        for (const u of opt?.images ?? []) add(u);
      }
    }
  }
  return out;
}

/**
 * Brand certificate URL as stored on the product — either a legacy top-level
 * field from API serialization or (normally) inside additionalDetails.
 * Pending-change diffs must compare against this, otherwise unchanged certs look
 * like "Not set → URL" when the seller resends the cert on every save.
 */
function getStoredBrandAuthorizationCertificate(p: Record<string, unknown>): unknown {
  const top = p['brandAuthorizationCertificate'];
  if (typeof top === 'string' && top.trim()) return top.trim();
  const ad = p['additionalDetails'];
  if (ad && typeof ad === 'object' && !Array.isArray(ad)) {
    const v = (ad as Record<string, unknown>)['Brand Authorization Certificate'];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function PendingChangesDisplay({
  changes,
  currentProduct,
}: {
  changes: Record<string, unknown>;
  currentProduct: Record<string, unknown>;
}) {
  const renderSimpleChange = (key: string, oldVal: unknown, newVal: unknown) => {
    const formatValue = (v: unknown): string => {
      if (v === null || v === undefined) return 'Not set';
      if (typeof v === 'number') return key === 'price' || key === 'compareAtPrice' ? `₹${v}` : String(v);
      if (Array.isArray(v)) return v.length === 0 ? 'None' : `${v.length} items`;
      return String(v);
    };

    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded line-through">
          {formatValue(oldVal)}
        </span>
        <span className="text-gray-400">→</span>
        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
          {formatValue(newVal)}
        </span>
      </div>
    );
  };

  const renderVariantChanges = (oldVariants: VariantGroup[] | null, newVariants: VariantGroup[]) => {
    const changes: { variantName: string; sku: string; field: string; oldVal: unknown; newVal: unknown }[] = [];

    // Build a map of old variants by SKU for comparison
    const oldMap = new Map<string, VariantOption>();
    (oldVariants ?? []).forEach((group) => {
      (group.options ?? []).forEach((opt) => {
        const key = opt.sku || opt.label || opt.value || '';
        if (key) oldMap.set(key, opt);
      });
    });

    // Compare with new variants
    newVariants.forEach((group) => {
      (group.options ?? []).forEach((opt) => {
        const key = opt.sku || opt.label || opt.value || '';
        const variantName = opt.label || opt.value || key;
        const oldOpt = oldMap.get(key);

        if (!oldOpt) {
          changes.push({ variantName, sku: key, field: 'New Variant', oldVal: null, newVal: 'Added' });
        } else {
          // Check each field
          if (oldOpt.price !== opt.price) {
            changes.push({ variantName, sku: key, field: 'Price', oldVal: oldOpt.price, newVal: opt.price });
          }
          if (oldOpt.stock !== opt.stock) {
            changes.push({ variantName, sku: key, field: 'Stock', oldVal: oldOpt.stock, newVal: opt.stock });
          }
          if (oldOpt.compareAtPrice !== opt.compareAtPrice) {
            changes.push({ variantName, sku: key, field: 'MRP', oldVal: oldOpt.compareAtPrice, newVal: opt.compareAtPrice });
          }
          if (oldOpt.available !== opt.available) {
            changes.push({ variantName, sku: key, field: 'Status', oldVal: oldOpt.available ? 'Active' : 'Inactive', newVal: opt.available ? 'Active' : 'Inactive' });
          }
        }
      });
    });

    if (changes.length === 0) {
      return <p className="text-xs text-gray-500 italic">No specific changes detected in variants</p>;
    }

    // Group changes by variant
    const byVariant = new Map<string, typeof changes>();
    changes.forEach((c) => {
      const key = c.variantName;
      if (!byVariant.has(key)) byVariant.set(key, []);
      byVariant.get(key)!.push(c);
    });

    return (
      <div className="space-y-3">
        {Array.from(byVariant.entries()).map(([variantName, variantChanges]) => (
          <div key={variantName} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs">Variant</span>
              {variantName}
              {variantChanges[0]?.sku && variantChanges[0].sku !== variantName && (
                <code className="text-xs text-gray-500 font-normal">({variantChanges[0].sku})</code>
              )}
            </p>
            <div className="space-y-1.5">
              {variantChanges.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 min-w-[60px]">{c.field}:</span>
                  {c.oldVal !== null ? (
                    <>
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded line-through">
                        {c.field === 'Price' || c.field === 'MRP' ? `₹${c.oldVal}` : String(c.oldVal ?? 'None')}
                      </span>
                      <span className="text-gray-400">→</span>
                    </>
                  ) : null}
                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                    {c.field === 'Price' || c.field === 'MRP' ? `₹${c.newVal}` : String(c.newVal ?? 'None')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderArrayChange = (key: string, oldArr: unknown[], newArr: unknown[]) => {
    if (key === 'images') {
      const added = newArr.filter((img) => !oldArr.includes(img));
      const removed = oldArr.filter((img) => !newArr.includes(img));
      return (
        <div className="space-y-2 text-xs">
          {removed.length > 0 && (
            <div>
              <span className="text-red-600 font-medium">Removed {removed.length} image(s)</span>
            </div>
          )}
          {added.length > 0 && (
            <div>
              <span className="text-green-600 font-medium">Added {added.length} image(s)</span>
            </div>
          )}
          <div className="text-gray-500">
            Total: {oldArr.length} → {newArr.length}
          </div>
        </div>
      );
    }
    return renderSimpleChange(key, oldArr, newArr);
  };

  const renderObjectChange = (key: string, oldObj: Record<string, unknown> | null, newObj: Record<string, unknown>) => {
    const changes: { field: string; oldVal: unknown; newVal: unknown }[] = [];
    const allKeys = new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj)]);

    allKeys.forEach((k) => {
      const oldVal = oldObj?.[k];
      const newVal = newObj[k];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: k, oldVal, newVal });
      }
    });

    if (changes.length === 0) {
      return <p className="text-xs text-gray-500 italic">No changes detected</p>;
    }

    return (
      <div className="space-y-1.5 text-xs">
        {changes.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-gray-600 min-w-[100px] capitalize">{c.field.replace(/([A-Z])/g, ' $1')}:</span>
            {c.oldVal !== undefined && (
              <>
                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded line-through max-w-[150px] truncate">
                  {String(c.oldVal ?? 'None')}
                </span>
                <span className="text-gray-400">→</span>
              </>
            )}
            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium max-w-[150px] truncate">
              {String(c.newVal ?? 'None')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Skip entries where the seller "submitted" a value that is byte-for-byte
   * identical to what the catalog already has — those are noise (the seller
   * just opened the edit modal and re-saved without touching that field).
   * Showing them as "Changed" makes it impossible for the admin to see what
   * actually moved, which was the whole point of this review screen.
   */
  const realChanges = Object.entries(changes).filter(([key, newValue]) => {
    const oldValue =
      key === 'brandAuthorizationCertificate'
        ? getStoredBrandAuthorizationCertificate(currentProduct)
        : currentProduct[key];

    if (key === 'variants' && Array.isArray(newValue)) {
      return hasVariantDiff(
        (oldValue as VariantGroup[] | null) ?? null,
        newValue as VariantGroup[],
      );
    }

    return !valuesEqual(oldValue, newValue);
  });

  if (realChanges.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic">
        The seller resubmitted the listing but no field values actually changed.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {realChanges.map(([key, newValue]) => {
        const oldValue =
          key === 'brandAuthorizationCertificate'
            ? getStoredBrandAuthorizationCertificate(currentProduct)
            : currentProduct[key];
        const label = FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();

        return (
          <div key={key} className="border-l-4 border-primary-400 pl-3 py-2 bg-primary-50/30 rounded-r-lg">
            <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="bg-primary-600 text-white px-2 py-0.5 rounded text-xs uppercase tracking-wide">
                Changed
              </span>
              {label}
            </p>

            {key === 'variants' && Array.isArray(newValue) ? (
              renderVariantChanges(oldValue as VariantGroup[] | null, newValue as VariantGroup[])
            ) : Array.isArray(newValue) && Array.isArray(oldValue) ? (
              renderArrayChange(key, oldValue, newValue)
            ) : typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue) ? (
              renderObjectChange(key, oldValue as Record<string, unknown> | null, newValue as Record<string, unknown>)
            ) : (
              renderSimpleChange(key, oldValue, newValue)
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Deep-equality check tuned for the kinds of values stored on a Product
 * (primitives, plain JSON arrays/objects). We normalize null/undefined and
 * the empty string so "missing" values compare equal regardless of which
 * shape the seller draft used.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === undefined || v === '' ? null : v);
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na === null || nb === null) return false;
  try {
    return JSON.stringify(na) === JSON.stringify(nb);
  } catch {
    return false;
  }
}

/**
 * Returns true only when at least one variant option (or the group structure
 * itself) actually differs between the current product and the proposed
 * change. Mirrors the comparison that `renderVariantChanges` does so the
 * "Variants" block stays out of the list when nothing meaningful changed.
 */
function hasVariantDiff(
  oldVariants: VariantGroup[] | null,
  newVariants: VariantGroup[],
): boolean {
  if (!Array.isArray(oldVariants) || !Array.isArray(newVariants)) {
    return !valuesEqual(oldVariants, newVariants);
  }
  if (oldVariants.length !== newVariants.length) return true;

  const oldMap = new Map<string, VariantOption>();
  oldVariants.forEach((group) => {
    (group.options ?? []).forEach((opt) => {
      const key = opt.sku || opt.label || opt.value || '';
      if (key) oldMap.set(key, opt);
    });
  });

  for (const group of newVariants) {
    for (const opt of group.options ?? []) {
      const key = opt.sku || opt.label || opt.value || '';
      const oldOpt = oldMap.get(key);
      if (!oldOpt) return true;
      if (
        oldOpt.price !== opt.price ||
        oldOpt.stock !== opt.stock ||
        oldOpt.compareAtPrice !== opt.compareAtPrice ||
        oldOpt.available !== opt.available ||
        oldOpt.label !== opt.label ||
        oldOpt.value !== opt.value
      ) {
        return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers for the revamped Products page
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Debounces a value by `delay` ms. Used so we can update the visible search
 * input on every keystroke (responsive) but only re-filter the large product
 * list a few times per second (smooth).
 */
function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Renders a product thumbnail with a floating large-preview on hover. Admins
 * spend most of their time eyeballing images, so being able to peek without
 * opening the full modal saves a ton of clicks.
 */
function HoverThumbnail({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback?: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <div
      onMouseEnter={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setCoords({ x: r.right + 8, y: r.top });
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      className="relative h-12 w-12 rounded-lg bg-surface-muted overflow-hidden shrink-0 border border-border"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        fallback ?? (
          <div className="h-full w-full flex items-center justify-center text-text-muted">
            <Package size={16} />
          </div>
        )
      )}
      {hovered && src && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[300] pointer-events-none rounded-xl border border-border bg-surface p-1 shadow-elevated"
            style={{
              left: Math.min(coords.x, (typeof window !== 'undefined' ? window.innerWidth : 1024) - 220),
              top: Math.max(
                8,
                Math.min(
                  coords.y - 60,
                  (typeof window !== 'undefined' ? window.innerHeight : 768) - 220,
                ),
              ),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-48 w-48 object-cover rounded-lg" />
          </div>,
          document.body,
        )}
    </div>
  );
}

type StatTone = 'neutral' | 'warning' | 'danger' | 'success';

/**
 * Compact KPI tile that doubles as a one-click filter. Clicking it tells the
 * page which "view" to apply (e.g. only flagged images) and visually highlights
 * itself so the admin always knows what they're looking at.
 */
function ProductStatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: StatTone;
  active?: boolean;
  onClick?: () => void;
}) {
  const toneClasses: Record<StatTone, string> = {
    neutral: 'bg-primary-50 text-primary-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
    success: 'bg-success-50 text-success-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border bg-surface p-4 shadow-card transition-all hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
        active ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-border hover:border-primary-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
        <span className={`rounded-lg p-1.5 ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary font-display tabular-nums">
        {value.toLocaleString()}
      </p>
    </button>
  );
}

/** Pill-shaped status tab with a count badge — replaces the legacy dropdown. */
function TabPill({
  label,
  count,
  active,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  tone?: StatTone;
  onClick: () => void;
}) {
  const inactiveBadgeTone: Record<StatTone, string> = {
    neutral: 'bg-surface-muted text-text-muted',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
    success: 'bg-success-100 text-success-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary-600 text-white shadow-sm'
          : 'bg-surface text-text-secondary border border-border hover:bg-surface-muted hover:text-text-primary'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${
          active ? 'bg-white/25 text-white' : inactiveBadgeTone[tone]
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function tabToneForStatus(s: ProductStatus): StatTone {
  switch (s) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
    case 'PENDING_BRAND_AUTHORIZATION':
    case 'ON_HOLD':
      return 'warning';
    case 'REJECTED':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Single source of truth for "is this listing waiting for an admin decision?" */
function isPendingStatus(s: ProductStatus): boolean {
  return s === 'PENDING' || s === 'PENDING_BRAND_AUTHORIZATION';
}

/** Tiny presentational pill used in the status cell for things like "Changes" / "Images flagged". */
function MiniPill({
  tone,
  icon,
  children,
  title,
}: {
  tone: 'warning' | 'danger' | 'info';
  icon?: ReactNode;
  children: ReactNode;
  title?: string;
}) {
  const toneClasses = {
    warning: 'bg-warning-100 text-warning-800',
    danger: 'bg-danger-50 text-danger-700',
    info: 'bg-primary-50 text-primary-700',
  }[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClasses}`}
    >
      {icon}
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') ?? '';
  const initialStatus = searchParams?.get('status') ?? '';
  const initialPendingChanges = searchParams?.get('hasPendingChanges') === 'true';

  // ─── Data / load ──────────────────────────────────────────────────────────
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ─── Filters ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search, 200);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [view, setView] = useState<'all' | 'changes' | 'flagged' | 'low-stock'>(
    initialPendingChanges ? 'changes' : 'all',
  );

  // ─── Selection ────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Bulk modals ──────────────────────────────────────────────────────────
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkCommission, setBulkCommission] = useState('10');
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // ─── Existing per-row modals (state unchanged) ────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveCommission, setApproveCommission] = useState<string>('10');
  // Optional curated bestseller rank set at approval time. Empty = no rank.
  const [approveBestSellersRank, setApproveBestSellersRank] = useState<string>('');
  // Replacement policy chosen by the admin at approval time. Disabled by
  // default — enabling it forces the admin to pick a window from
  // REPLACEMENT_WINDOW_OPTIONS so buyers always see a concrete "X days
  // replacement" promise on the product page.
  const [approveReplaceable, setApproveReplaceable] = useState<boolean>(false);
  const [approveReplacementWindow, setApproveReplacementWindow] = useState<ReplacementWindow>(7);
  const [approveReturnPolicyPreset, setApproveReturnPolicyPreset] =
    useState<(typeof RETURN_POLICY_PRESETS)[number]['value']>('EASY_RETURN_7_DAYS');
  const [approveReturnPlusDays, setApproveReturnPlusDays] = useState<string>('7');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<AdminProductDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewImageIdx, setViewImageIdx] = useState(0);
  // Inline "Ask for new images" panel inside the product preview modal. Lets
  // admin flag only the photos as needing redo without changing listing status.
  const [imageRejectOpen, setImageRejectOpen] = useState(false);
  const [imageRejectReason, setImageRejectReason] = useState('');
  const [savingImageReject, setSavingImageReject] = useState(false);
  const [form, setForm] = useState({
    status: 'ACTIVE' as ProductStatus,
    isFeatured: false,
    isTrending: false,
    isFlashDeal: false,
    rejectionReason: '',
    imageRejectionReason: '',
    commissionRate: '',
    // Empty string = "no rank". Stored as string so the input behaves naturally.
    bestSellersRank: '',
    isReplaceable: false,
    replacementWindow: 7 as ReplacementWindow,
  });

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const result = await apiGet<Product[]>('products');
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData, refreshTrigger]);

  // Keep URL-driven filters in sync when the admin navigates here from
  // another page (e.g. a "needs review" deep-link).
  useEffect(() => {
    setSearch(searchParams?.get('search') ?? '');
  }, [searchParams]);
  useEffect(() => {
    const s = searchParams?.get('status') ?? '';
    setStatusFilter(s);
  }, [searchParams]);
  useEffect(() => {
    if (searchParams?.get('hasPendingChanges') === 'true') setView('changes');
  }, [searchParams]);

  // Drop stale selections whenever the dataset changes (e.g. after refresh).
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(data.map((p) => p.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  // ─── Derived: counts + filtered list ──────────────────────────────────────
  const counts = useMemo(() => {
    let pending = 0;
    let changes = 0;
    let flagged = 0;
    let lowStock = 0;
    const byStatus: Record<string, number> = {};
    for (const p of data) {
      if (isPendingStatus(p.status)) pending++;
      if (p.hasPendingChanges) changes++;
      if (p.imageRejectionReason) flagged++;
      if (p.stock < 10) lowStock++;
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    }
    return { total: data.length, pending, changes, flagged, lowStock, byStatus };
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data;
    if (statusFilter) rows = rows.filter((p) => p.status === statusFilter);
    if (view === 'changes') rows = rows.filter((p) => p.hasPendingChanges);
    if (view === 'flagged') rows = rows.filter((p) => !!p.imageRejectionReason);
    if (view === 'low-stock') rows = rows.filter((p) => p.stock < 10);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      rows = rows.filter((p) => {
        const haystack = [
          p.name,
          p.slug,
          p.xelnovaProductId,
          p.seller?.storeName,
          p.category?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    return rows;
  }, [data, statusFilter, view, debouncedSearch]);

  const selectedProducts = useMemo(
    () => data.filter((p) => selectedIds.has(p.id)),
    [data, selectedIds],
  );
  const selectedPendingCount = useMemo(
    () => selectedProducts.filter((p) => isPendingStatus(p.status)).length,
    [selectedProducts],
  );

  const allOnPageSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));
  const someOnPageSelected = filtered.some((p) => selectedIds.has(p.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Bulk actions ─────────────────────────────────────────────────────────
  const handleBulkApprove = async () => {
    const rate = Number(bulkCommission.trim());
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error('Commission must be between 0 and 100');
      return;
    }
    const eligible = selectedProducts.filter((p) => isPendingStatus(p.status));
    if (eligible.length === 0) {
      toast.error('None of the selected products are pending');
      return;
    }
    setBulkSubmitting(true);
    let ok = 0;
    let fail = 0;
    await Promise.all(
      eligible.map(async (p) => {
        try {
          await apiPost(`products/${p.id}/approve`, {
            commissionRate: rate,
            returnPolicyPreset: 'EASY_RETURN_7_DAYS',
            replacementWindow: null,
            isReplaceable: false,
          });
          ok++;
        } catch {
          fail++;
        }
      }),
    );
    if (ok) toast.success(`Approved ${ok} product${ok === 1 ? '' : 's'} at ${rate}%`);
    if (fail) toast.error(`Failed to approve ${fail} product${fail === 1 ? '' : 's'}`);
    setBulkApproveOpen(false);
    setSelectedIds(new Set());
    setRefreshTrigger((n) => n + 1);
    setBulkSubmitting(false);
  };

  const handleBulkReject = async () => {
    const reason = bulkRejectReason.trim();
    if (!reason) {
      toast.error('Add a rejection message so sellers know what to fix');
      return;
    }
    if (selectedProducts.length === 0) return;
    setBulkSubmitting(true);
    let ok = 0;
    let fail = 0;
    await Promise.all(
      selectedProducts.map(async (p) => {
        try {
          await apiPost(`products/${p.id}/reject`, { rejectionReason: reason });
          ok++;
        } catch {
          fail++;
        }
      }),
    );
    if (ok) toast.success(`Rejected ${ok} product${ok === 1 ? '' : 's'}`);
    if (fail) toast.error(`Failed to reject ${fail} product${fail === 1 ? '' : 's'}`);
    setBulkRejectOpen(false);
    setBulkRejectReason('');
    setSelectedIds(new Set());
    setRefreshTrigger((n) => n + 1);
    setBulkSubmitting(false);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      status: p.status,
      isFeatured: p.isFeatured,
      isTrending: p.isTrending,
      isFlashDeal: p.isFlashDeal,
      rejectionReason: p.rejectionReason || '',
      imageRejectionReason: p.imageRejectionReason || '',
      commissionRate:
        p.commissionRate != null && Number.isFinite(Number(p.commissionRate))
          ? String(p.commissionRate)
          : '',
      bestSellersRank:
        p.bestSellersRank != null && p.bestSellersRank > 0 ? String(p.bestSellersRank) : '',
      isReplaceable: !!p.isReplaceable,
      replacementWindow: REPLACEMENT_WINDOW_OPTIONS.includes(p.replacementWindow as ReplacementWindow)
        ? (p.replacementWindow as ReplacementWindow)
        : 7,
    });
    setModalOpen(true);
  };

  useEffect(() => {
    if (viewing?.id) {
      setViewImageIdx(0);
      setImageRejectOpen(false);
      setImageRejectReason(viewing.imageRejectionReason || '');
    }
  }, [viewing?.id, viewing?.imageRejectionReason]);

  const openView = async (p: Product) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewing(null);
    setApproveCommission('10');
    setApproveBestSellersRank('');
    setApproveReturnPolicyPreset('EASY_RETURN_7_DAYS');
    setApproveReturnPlusDays('7');
    // Pre-fill replacement policy from the list row so the admin keeps the
    // existing choice when re-opening an already-approved product (the full
    // detail we fetch next will refine it if it differs).
    setApproveReplaceable(!!p.isReplaceable);
    setApproveReplacementWindow(
      REPLACEMENT_WINDOW_OPTIONS.includes(p.replacementWindow as ReplacementWindow)
        ? (p.replacementWindow as ReplacementWindow)
        : 7,
    );
    try {
      const detail = await apiGetAdminProduct<AdminProductDetail>(p.id);
      setViewing(detail);
      setApproveReplaceable(!!detail.isReplaceable);
      setApproveReplacementWindow(
        REPLACEMENT_WINDOW_OPTIONS.includes(detail.replacementWindow as ReplacementWindow)
          ? (detail.replacementWindow as ReplacementWindow)
          : 7,
      );
      if (detail.returnPolicyPreset) {
        setApproveReturnPolicyPreset(detail.returnPolicyPreset as (typeof RETURN_POLICY_PRESETS)[number]['value']);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load product');
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleApprove = async (product: Product, options?: { closeView?: boolean }) => {
    const trimmed = approveCommission.trim();
    if (!trimmed) {
      toast.error('Set a commission % before approving');
      return;
    }
    const rate = Number(trimmed);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error('Commission must be between 0 and 100');
      return;
    }

    // Check brand approval before proceeding
    const fullProduct = viewing || product;
    if ((fullProduct as AdminProductDetail)?.brandRecord && !(fullProduct as AdminProductDetail)?.brandRecord?.approved) {
      toast.error(`Brand "${(fullProduct as AdminProductDetail).brandRecord?.name}" must be approved first`);
      return;
    }

    let rank: number | null = null;
    const rawRank = approveBestSellersRank.trim();
    if (rawRank) {
      const n = Number(rawRank);
      if (!Number.isFinite(n) || n < 1 || n > 100000 || !Number.isInteger(n)) {
        toast.error('Best Sellers Rank must be a whole number between 1 and 100000');
        return;
      }
      rank = n;
    }

    const presetNeedsReplacement =
      approveReturnPolicyPreset === 'REPLACEMENT_ONLY' ||
      approveReturnPolicyPreset === 'RETURN_PLUS_REPLACEMENT';

    if (presetNeedsReplacement && !REPLACEMENT_WINDOW_OPTIONS.includes(approveReplacementWindow)) {
      toast.error('Pick a replacement window (2, 5, or 7 days) before approving');
      return;
    }

    if (approveReturnPolicyPreset === 'RETURN_PLUS_REPLACEMENT') {
      const rd = Number(approveReturnPlusDays.trim());
      if (!Number.isFinite(rd) || rd < 1 || rd > 365) {
        toast.error('Return window for “Return + Replacement” must be between 1 and 365 days');
        return;
      }
    }

    if (approveReplaceable && !presetNeedsReplacement && !REPLACEMENT_WINDOW_OPTIONS.includes(approveReplacementWindow)) {
      toast.error('Pick a replacement window (2, 5, or 7 days) before approving');
      return;
    }

    setApproving(product.id);
    try {
      await apiPost(`products/${product.id}/approve`, {
        commissionRate: rate,
        ...(rank !== null ? { bestSellersRank: rank } : {}),
        returnPolicyPreset: approveReturnPolicyPreset,
        replacementWindow: presetNeedsReplacement ? approveReplacementWindow : approveReplaceable ? approveReplacementWindow : null,
        returnWindowDays:
          approveReturnPolicyPreset === 'RETURN_PLUS_REPLACEMENT'
            ? Number(approveReturnPlusDays.trim()) || 7
            : undefined,
        isReplaceable: presetNeedsReplacement ? true : approveReplaceable,
      });
      toast.success(
        rank !== null
          ? `"${product.name}" approved at ${rate}% commission · rank #${rank}`
          : `"${product.name}" approved at ${rate}% commission`,
      );
      setRefreshTrigger((n) => n + 1);
      if (options?.closeView) {
        setViewOpen(false);
        setViewing(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve product');
    } finally {
      setApproving(null);
    }
  };

  /**
   * Save / clear the image rejection reason without changing listing status.
   * Use case: admin is mid-review and only the photos are off (blurry, watermarked,
   * wrong aspect ratio, etc.) — the seller is asked to re-upload images while
   * the listing stays in the same status.
   */
  const handleImageReject = async () => {
    if (!viewing) return;
    const trimmed = imageRejectReason.trim();
    if (!trimmed) {
      toast.error('Add a short note so the seller knows what to redo');
      return;
    }
    setSavingImageReject(true);
    try {
      await apiUpdate('products', viewing.id, { imageRejectionReason: trimmed });
      toast.success('Image feedback sent to the seller');
      setViewing((v) => (v ? { ...v, imageRejectionReason: trimmed } : v));
      setImageRejectOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save image feedback');
    } finally {
      setSavingImageReject(false);
    }
  };

  const handleImageRejectClear = async () => {
    if (!viewing) return;
    setSavingImageReject(true);
    try {
      await apiUpdate('products', viewing.id, { imageRejectionReason: '' });
      toast.success('Image rejection cleared');
      setViewing((v) => (v ? { ...v, imageRejectionReason: null } : v));
      setImageRejectReason('');
      setImageRejectOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear image feedback');
    } finally {
      setSavingImageReject(false);
    }
  };

  const openReject = (p: Product) => {
    setEditing(p);
    setRejectionReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!editing) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error('A rejection message is required so the seller can fix the issue.');
      return;
    }
    setSaving(true);
    try {
      await apiPost(`products/${editing.id}/reject`, { rejectionReason: reason });
      toast.success(`"${editing.name}" rejected`);
      setRejectOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject product');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    let rankPayload: number | null | undefined = undefined;
    const rawRank = form.bestSellersRank.trim();
    if (rawRank === '') {
      rankPayload = null; // explicitly clear
    } else {
      const n = Number(rawRank);
      if (!Number.isFinite(n) || n < 1 || n > 100000 || !Number.isInteger(n)) {
        toast.error('Best Sellers Rank must be a whole number between 1 and 100000');
        return;
      }
      rankPayload = n;
    }

    let commissionPayload: number | undefined = undefined;
    const rawCommission = form.commissionRate.trim();
    if (rawCommission !== '') {
      const c = Number(rawCommission);
      if (!Number.isFinite(c) || c < 0 || c > 100) {
        toast.error('Commission % must be between 0 and 100');
        return;
      }
      commissionPayload = c;
    }

    if (form.status === 'REJECTED' && !form.rejectionReason.trim()) {
      toast.error('Add a rejection reason so the seller knows what to fix');
      return;
    }

    if (form.isReplaceable && !REPLACEMENT_WINDOW_OPTIONS.includes(form.replacementWindow)) {
      toast.error('Pick a replacement window (2, 5, or 7 days) before saving');
      return;
    }

    setSaving(true);
    try {
      await apiUpdate('products', editing.id, {
        status: form.status,
        isFeatured: form.isFeatured,
        isTrending: form.isTrending,
        isFlashDeal: form.isFlashDeal,
        rejectionReason: form.status === 'REJECTED' ? form.rejectionReason.trim() : null,
        // Pass empty string to clear, undefined to leave alone.
        imageRejectionReason: form.imageRejectionReason.trim(),
        bestSellersRank: rankPayload,
        ...(commissionPayload !== undefined ? { commissionRate: commissionPayload } : {}),
        isReplaceable: form.isReplaceable,
        replacementWindow: form.isReplaceable ? form.replacementWindow : null,
      });
      toast.success('Product updated');
      setModalOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await apiDelete('products', editing.id);
      toast.success('Product deleted');
      setDeleteOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  // Keyboard shortcuts while the preview modal is open: A=approve, R=reject,
  // ←/→ cycle through the gallery. Skipped when typing in a text field.
  useEffect(() => {
    if (!viewOpen || !viewing) return;
    const gallery = collectProductGallery(viewing);
    const isEditableTarget = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (gallery.length > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        setViewImageIdx((i) =>
          e.key === 'ArrowLeft'
            ? (i - 1 + gallery.length) % gallery.length
            : (i + 1) % gallery.length,
        );
        return;
      }
      if (!isPendingStatus(viewing.status)) return;
      if (e.key === 'a' || e.key === 'A') {
        const blockedByBrand = viewing.brandRecord && !viewing.brandRecord.approved;
        if (blockedByBrand) {
          toast.error(`Brand "${viewing.brandRecord!.name}" must be approved first`);
          return;
        }
        e.preventDefault();
        void handleApprove(viewing, { closeView: true });
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        const p = viewing;
        setViewOpen(false);
        setViewing(null);
        openReject(p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOpen, viewing]);

  // Row-action overflow items for the actions cell.
  const rowMenuItems = (r: Product) => {
    const items = [] as Array<{
      key: string;
      label: string;
      icon: ReactNode;
      onClick: () => void;
      danger?: boolean;
    }>;
    if (isPendingStatus(r.status)) {
      items.push({
        key: 'reject',
        label: 'Reject…',
        icon: <XCircle size={14} />,
        onClick: () => openReject(r),
        danger: true,
      });
    }
    items.push({
      key: 'edit',
      label: 'Edit flags…',
      icon: <Pencil size={14} />,
      onClick: () => openEdit(r),
    });
    items.push({
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => {
        setEditing(r);
        setDeleteOpen(true);
      },
      danger: true,
    });
    return items;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <DashboardHeader title="Products" />
      <div className="p-6 space-y-5">
        {/* KPI strip — each tile is a one-click filter for the workload below. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          <ProductStatCard
            label="Total"
            value={counts.total}
            icon={Package}
            tone="neutral"
            active={!statusFilter && view === 'all'}
            onClick={() => {
              setStatusFilter('');
              setView('all');
            }}
          />
          <ProductStatCard
            label="Pending review"
            value={counts.pending}
            icon={Clock}
            tone="warning"
            active={statusFilter === 'PENDING' && view === 'all'}
            onClick={() => {
              setStatusFilter('PENDING');
              setView('all');
            }}
          />
          <ProductStatCard
            label="Changes pending"
            value={counts.changes}
            icon={AlertTriangle}
            tone="warning"
            active={view === 'changes'}
            onClick={() => {
              setStatusFilter('');
              setView('changes');
            }}
          />
          <ProductStatCard
            label="Images flagged"
            value={counts.flagged}
            icon={ImageOff}
            tone="danger"
            active={view === 'flagged'}
            onClick={() => {
              setStatusFilter('');
              setView('flagged');
            }}
          />
          <ProductStatCard
            label="Low stock"
            value={counts.lowStock}
            icon={TrendingDown}
            tone="danger"
            active={view === 'low-stock'}
            onClick={() => {
              setStatusFilter('');
              setView('low-stock');
            }}
          />
        </motion.div>

        {/* Search + refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 flex-1 min-w-[220px] max-w-md focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/20">
            <Search size={18} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search by name, slug, Xel ID, seller, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="rounded-md p-0.5 text-text-muted hover:bg-surface-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setLoading(true);
              void fetchData();
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <div className="ml-auto text-xs text-text-muted">
            Showing <span className="font-semibold text-text-primary">{filtered.length}</span>{' '}
            of {counts.total}
          </div>
        </div>

        {/* Status segmented tabs with live counts */}
        <div className="-mx-1 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-1 pb-1 min-w-min">
            <TabPill
              label="All"
              count={counts.total}
              active={!statusFilter}
              onClick={() => setStatusFilter('')}
            />
            {STATUS_OPTIONS.map((s) => (
              <TabPill
                key={s}
                label={formatProductStatusLabel(s)}
                count={counts.byStatus[s] ?? 0}
                active={statusFilter === s}
                tone={tabToneForStatus(s)}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </div>
        </div>

        {/* Bulk actions bar — only renders when at least one row is selected. */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary-300 bg-primary-50/90 px-4 py-2.5 shadow-card backdrop-blur"
          >
            <span className="text-sm font-semibold text-primary-900">
              {selectedIds.size} selected
            </span>
            {selectedPendingCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-[11px] font-semibold text-warning-800">
                <Clock className="h-3 w-3" />
                {selectedPendingCount} pending
              </span>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setBulkCommission('10');
                  setBulkApproveOpen(true);
                }}
                disabled={selectedPendingCount === 0}
                title={
                  selectedPendingCount === 0
                    ? 'None of the selected rows are pending review'
                    : `Approve ${selectedPendingCount} pending product${selectedPendingCount === 1 ? '' : 's'}`
                }
              >
                <CheckCircle size={14} /> Approve…
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkRejectReason('');
                  setBulkRejectOpen(true);
                }}
              >
                <XCircle size={14} /> Reject…
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
          <div className="overflow-x-auto max-h-[72vh] overflow-y-auto">
            <table className="w-full min-w-[960px] text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-border bg-surface-muted/60">
                  <th className="w-10 px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
                      }}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500/30 cursor-pointer"
                      aria-label="Select all rows on this page"
                      disabled={loading || filtered.length === 0}
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted text-[11px] uppercase tracking-wider min-w-[300px]">
                    Product
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-text-muted text-[11px] uppercase tracking-wider w-[140px]">
                    Price · Stock
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-text-muted text-[11px] uppercase tracking-wider w-[90px]">
                    Variants
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted text-[11px] uppercase tracking-wider min-w-[200px]">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-text-muted text-[11px] uppercase tracking-wider w-[110px]">
                    Commission
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-text-muted text-[11px] uppercase tracking-wider w-[180px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {loading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td className="px-3 py-3">
                        <div className="h-4 w-4 rounded bg-surface-muted animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-surface-muted animate-pulse" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-3/4 rounded bg-surface-muted animate-pulse" />
                            <div className="h-2.5 w-1/2 rounded bg-surface-muted animate-pulse" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 w-3/4 max-w-[100px] rounded bg-surface-muted animate-pulse ml-auto" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-text-muted">
                        <Package size={28} className="opacity-40" />
                        <p className="text-sm font-medium">No products match your filters</p>
                        {(search || statusFilter || view !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearch('');
                              setStatusFilter('');
                              setView('all');
                            }}
                            className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((p) => {
                    const selected = selectedIds.has(p.id);
                    const thumb = pickProductThumbnail(p);
                    const pending = isPendingStatus(p.status);
                    const variantCount = isVariantArray(p.variants) ? p.variants.length : 0;
                    const totalOptions = isVariantArray(p.variants)
                      ? p.variants.reduce((a, g) => a + (g.options?.length ?? 0), 0)
                      : 0;
                    const stockTone =
                      p.stock < 10
                        ? 'text-danger-500'
                        : p.stock < 25
                          ? 'text-warning-600'
                          : 'text-text-muted';
                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          selected ? 'bg-primary-50/40' : 'hover:bg-surface-muted/40'
                        }`}
                      >
                        <td className="px-3 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleOne(p.id)}
                            className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500/30 cursor-pointer"
                            aria-label={`Select ${p.name}`}
                          />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-start gap-3">
                            <HoverThumbnail src={thumb} alt={p.name} />
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => void openView(p)}
                                className="text-left font-medium text-text-primary hover:text-primary-600 line-clamp-2 leading-tight transition-colors"
                                title={p.name}
                              >
                                {p.name}
                              </button>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
                                {p.xelnovaProductId && (
                                  <code className="font-mono text-text-secondary bg-surface-muted/70 px-1.5 py-px rounded">
                                    {p.xelnovaProductId}
                                  </code>
                                )}
                                <span className="truncate max-w-[140px]" title={p.category?.name ?? ''}>
                                  {p.category?.name ?? '—'}
                                </span>
                                <span className="text-border">·</span>
                                <span className="truncate max-w-[160px]" title={p.seller?.storeName ?? ''}>
                                  {p.seller?.storeName ?? '—'}
                                </span>
                                {p.reviewCount > 0 && (
                                  <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                                    ★ {p.rating.toFixed(1)}
                                    <span className="text-text-muted font-normal">({p.reviewCount})</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                          <div className="font-semibold text-text-primary tabular-nums">
                            ₹{p.price.toLocaleString()}
                          </div>
                          {p.compareAtPrice != null && p.compareAtPrice > p.price && (
                            <div className="text-[11px] text-text-muted line-through tabular-nums">
                              ₹{p.compareAtPrice.toLocaleString()}
                            </div>
                          )}
                          <div className={`mt-0.5 text-[11px] font-medium ${stockTone}`}>
                            {p.stock} in stock
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-center">
                          {variantCount > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
                              title={`${variantCount} group${variantCount === 1 ? '' : 's'} · ${totalOptions} option${totalOptions === 1 ? '' : 's'}`}
                            >
                              <Layers className="h-3 w-3" />
                              {totalOptions}
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px]">Single</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <StatusIcon status={p.status} />
                              <Badge variant={statusBadgeVariant(p.status)}>
                                {formatProductStatusLabel(p.status)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {p.isFeatured && <MiniPill tone="info">Featured</MiniPill>}
                              {p.isTrending && <MiniPill tone="warning">Trending</MiniPill>}
                              {p.isFlashDeal && <MiniPill tone="danger">Flash</MiniPill>}
                              {p.hasPendingChanges && (
                                <MiniPill
                                  tone="warning"
                                  icon={<span className="h-1.5 w-1.5 rounded-full bg-warning-500 animate-pulse" />}
                                  title="Seller has submitted changes awaiting review"
                                >
                                  Changes
                                </MiniPill>
                              )}
                              {p.imageRejectionReason && (
                                <MiniPill
                                  tone="danger"
                                  icon={<ImageOff className="h-3 w-3" />}
                                  title={p.imageRejectionReason}
                                >
                                  Images
                                </MiniPill>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                          {p.commissionRate != null ? (
                            <span className="font-semibold text-text-primary tabular-nums">
                              {Number(p.commissionRate).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px]">Seller default</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            {pending ? (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => void openView(p)}
                              >
                                <Eye size={14} /> Review
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void openView(p)}
                              >
                                <Eye size={14} /> View
                              </Button>
                            )}
                            <AdminActionsDropdown items={rowMenuItems(p)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ActionModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewing(null);
        }}
        title={
          viewing?.hasPendingChanges
            ? `${viewing?.name ?? 'Product preview'} — Changes pending approval`
            : viewing?.name ?? 'Product preview'
        }
        extraWide
      >
        {viewLoading && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-sm">Loading product…</p>
          </div>
        )}
        {!viewLoading && viewing && (
          <div className="space-y-5 -mt-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
              <span>
                <span className="text-text-secondary">Seller:</span> {viewing.seller?.storeName ?? '—'}
              </span>
              <span>
                <span className="text-text-secondary">Category:</span> {viewing.category?.name ?? '—'}
              </span>
              <span>
                <span className="text-text-secondary">Price:</span>{' '}
                <span className="font-medium text-text-primary">₹{viewing.price.toLocaleString()}</span>
                {viewing.compareAtPrice != null && viewing.compareAtPrice > viewing.price && (
                  <span className="line-through ml-1">₹{viewing.compareAtPrice.toLocaleString()}</span>
                )}
              </span>
              <span>
                <span className="text-text-secondary">Stock:</span>{' '}
                <span className="font-medium text-text-primary">{viewing.stock}</span>
              </span>
              {viewing.xelnovaProductId?.trim() ? (
                <span>
                  <span className="text-text-secondary">Xel ID:</span>{' '}
                  <code className="font-mono font-medium text-text-primary">{viewing.xelnovaProductId}</code>
                </span>
              ) : null}
            </div>
            {(viewing.seller?.email || viewing.seller?.phone) && (
              <p className="text-xs text-text-muted">
                {viewing.seller?.email && <span className="mr-3">Seller email: {viewing.seller.email}</span>}
                {viewing.seller?.phone && <span>Seller phone: {viewing.seller.phone}</span>}
              </p>
            )}

            {/* Brand authorisation block — visible when reviewing the product. */}
            {(viewing.brand || viewing.brandRecord ? (
              <div className="rounded-xl border border-border bg-surface-muted/30 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-text-primary">
                    Brand: {viewing.brand?.trim() ? viewing.brand : <span className="text-text-muted">— not set —</span>}
                  </p>
                  {viewing.brandRecord ? (
                    <Badge variant={viewing.brandRecord.approved ? 'success' : 'warning'}>
                      {viewing.brandRecord.approved ? 'Brand approved' : 'Brand pending'}
                    </Badge>
                  ) : viewing.brand?.trim() ? (
                    <Badge variant="default">Free-text brand</Badge>
                  ) : null}
                </div>

                {viewing.brandRecord?.proposer && (
                  <p className="mt-2 text-text-secondary">
                    Proposed by:{' '}
                    <span className="font-medium text-text-primary">
                      {viewing.brandRecord.proposer.storeName ?? '—'}
                    </span>
                    {viewing.brandRecord.proposer.user?.email && (
                      <span className="ml-1 text-text-muted">
                        ({viewing.brandRecord.proposer.user.email})
                      </span>
                    )}
                  </p>
                )}

                <div className="mt-2 text-text-secondary">
                  <p className="font-semibold text-text-primary">Brand authorisation certificate</p>
                  {(() => {
                    const brandRecordCert = viewing.brandRecord?.authorizationCertificate ?? null;
                    const sellerUploadedCert = extractAdditionalCertUrl(viewing.additionalDetails);
                    const certUrl = brandRecordCert ?? sellerUploadedCert;
                    return certUrl ? (
                      <>
                        {!brandRecordCert && sellerUploadedCert && (
                          <p className="mt-1 text-[11px] text-text-muted">
                            Seller-uploaded certificate (not yet a catalogued brand). Verify before approving.
                          </p>
                        )}
                        <CertificatePreview url={certUrl} />
                      </>
                    ) : (
                      <p className="mt-1 text-warning-600">
                        No brand authorisation certificate found on this listing.
                      </p>
                    );
                  })()}
                </div>
                {viewing.brandAuthAdditionalDocumentUrls &&
                  viewing.brandAuthAdditionalDocumentUrls.length > 0 && (
                    <div className="mt-3 text-text-secondary">
                      <p className="font-semibold text-text-primary">Additional brand documents (dealer / proof)</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {viewing.brandAuthAdditionalDocumentUrls.map((u: string, i: number) => (
                          <li key={`${i}-${u.slice(0, 32)}`}>
                            <a
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline break-all"
                            >
                              {u}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {viewing.status === 'PENDING_BRAND_AUTHORIZATION' && (
                  <p className="mt-2 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    This listing is in brand-authorization review: confirm the certificate and additional documents
                    before publishing.
                  </p>
                )}
              </div>
            ) : null) as any}

            {/* Pending Changes Review Block */}
            {viewing.hasPendingChanges && viewing.pendingChangesData && (
              <div className="rounded-xl border-2 border-warning-300 bg-warning-50 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-warning-900 flex items-center gap-2">
                      <AlertTriangle size={18} className="text-warning-600" />
                      Changes pending your approval
                      <span className="bg-warning-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                        Action required
                      </span>
                    </p>
                    <p className="text-xs text-warning-700 mt-1">
                      Seller submitted changes{' '}
                      {viewing.pendingChangesSubmittedAt && new Date(viewing.pendingChangesSubmittedAt).toLocaleString()}.
                      Only the fields the seller actually modified are shown below — review each one before approving.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-warning-200 p-3 space-y-3 max-h-[60vh] overflow-y-auto">
                  <p className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-2">
                    Proposed Changes:
                  </p>
                  <PendingChangesDisplay
                    changes={viewing.pendingChangesData as Record<string, unknown>}
                    currentProduct={viewing as unknown as Record<string, unknown>}
                  />
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('Reject these changes? The product will remain in its current state.')) return;
                      const reason = prompt('Rejection reason (optional):');
                      try {
                        await apiPost(`products/${viewing.id}/reject-changes`, { reason: reason || undefined });
                        toast.success('Changes rejected');
                        setViewOpen(false);
                        setRefreshTrigger((n) => n + 1);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to reject changes');
                      }
                    }}
                  >
                    Reject Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('Approve and apply these changes? They will go live immediately.')) return;
                      try {
                        await apiPost(`products/${viewing.id}/approve-changes`, {});
                        toast.success('Changes approved and applied');
                        setViewOpen(false);
                        setRefreshTrigger((n) => n + 1);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to approve changes');
                      }
                    }}
                  >
                    Approve & Apply Changes
                  </Button>
                </div>
              </div>
            )}

            {(() => {
              const gallery = collectProductGallery(viewing);
              const hasTopLevel = (viewing.images?.length ?? 0) > 0;
              const variantOnly = !hasTopLevel && gallery.length > 0;
              if (gallery.length === 0) {
                return (
                  <p className="text-sm text-warning-600 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2">
                    No images uploaded for this product.
                  </p>
                );
              }
              const safeIdx = Math.min(viewImageIdx, gallery.length - 1);
              return (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-text-primary">
                      Images ({gallery.length})
                    </p>
                    {variantOnly && (
                      <Badge variant="default">From variants</Badge>
                    )}
                  </div>
                  {variantOnly && (
                    <p className="text-[11px] text-text-muted -mt-1">
                      This listing has no top-level photos — the gallery below is pulled from the variant
                      options so you can still review the visuals.
                    </p>
                  )}
                  <div className="rounded-xl border border-border bg-surface-muted/20 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gallery[safeIdx]}
                      alt=""
                      className="w-full max-h-[min(360px,50vh)] object-contain bg-black/5"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {gallery.map((url, i) => (
                      <button
                        key={`${url}-${i}`}
                        type="button"
                        onClick={() => setViewImageIdx(i)}
                        className={`h-16 w-16 rounded-lg border-2 overflow-hidden shrink-0 transition-colors ${
                          i === safeIdx ? 'border-primary-500 ring-2 ring-primary-200' : 'border-border hover:border-primary-300'
                        }`}
                        title={`Image ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Image-only rejection: ask the seller to redo just the photos
                without changing listing status. Only relevant during review/pending status. */}
            {(viewing.status === 'PENDING' || viewing.status === 'PENDING_BRAND_AUTHORIZATION' || viewing.status === 'ON_HOLD' || viewing.imageRejectionReason) && (
              <div className="rounded-xl border border-border bg-surface-muted/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary">Image feedback</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {viewing.status === 'ACTIVE' || viewing.status === 'REJECTED' || viewing.status === 'DRAFT'
                        ? 'Image feedback from previous review. This field is only active during product review.'
                        : 'Ask the seller to redo only the product photos. The listing status will not change.'}
                    </p>
                  </div>
                  {viewing.imageRejectionReason ? (
                    <Badge variant="warning">Images flagged</Badge>
                  ) : (
                    <Badge variant="default">No issues</Badge>
                  )}
                </div>

                {viewing.imageRejectionReason && !imageRejectOpen && (
                  <p className="mt-2 text-xs text-text-secondary whitespace-pre-wrap">
                    <span className="text-text-muted">Last note:</span> {viewing.imageRejectionReason}
                  </p>
                )}

                {(viewing.status === 'PENDING' || viewing.status === 'PENDING_BRAND_AUTHORIZATION' || viewing.status === 'ON_HOLD') && (
                  <>
                    {imageRejectOpen ? (
                      <div className="mt-2 space-y-2">
                        <FormTextarea
                          value={imageRejectReason}
                          onChange={(e) => setImageRejectReason(e.target.value)}
                          placeholder="e.g., Cover image is blurry, please re-upload at 1024x1024 on a white background."
                          rows={3}
                        />
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setImageRejectOpen(false);
                              setImageRejectReason(viewing.imageRejectionReason || '');
                            }}
                            disabled={savingImageReject}
                          >
                            Cancel
                          </Button>
                          {viewing.imageRejectionReason && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleImageRejectClear()}
                              loading={savingImageReject}
                            >
                              Clear flag
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleImageReject()}
                            loading={savingImageReject}
                          >
                            Send to seller
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImageRejectOpen(true);
                            setImageRejectReason(viewing.imageRejectionReason || '');
                          }}
                        >
                          {viewing.imageRejectionReason ? 'Edit image feedback' : 'Ask for new images'}
                        </Button>
                        {viewing.imageRejectionReason && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleImageRejectClear()}
                            loading={savingImageReject}
                          >
                            Clear flag
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {viewing.shortDescription?.trim() && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Short description</p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{viewing.shortDescription}</p>
              </div>
            )}

            {viewing.description?.trim() && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Description</p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{viewing.description}</p>
              </div>
            )}

            {viewing.productDescription?.trim() && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Product description</p>
                <div className="text-sm text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto rounded-lg border border-border bg-surface-muted/20 p-3">
                  {viewing.productDescription}
                </div>
              </div>
            )}

            <SpecSection label="Features & specs" value={viewing.featuresAndSpecs} />
            <SpecSection label="Materials & care" value={viewing.materialsAndCare} />
            <SpecSection label="Item details" value={viewing.itemDetails} />
            <SpecSection
              label="Additional details"
              value={viewing.additionalDetails}
              excludeKeys={(() => {
                const k = findAdditionalCertKey(viewing.additionalDetails);
                return k ? [k] : undefined;
              })()}
            />

            {viewing.highlights && viewing.highlights.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Highlights</p>
                <ul className="list-disc list-inside text-sm text-text-secondary space-y-0.5">
                  {viewing.highlights.map((h, i) => (
                    <li key={`${i}-${h}`}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {(viewing.warrantyInfo?.trim() ||
              viewing.safetyInfo?.trim() ||
              viewing.regulatoryInfo?.trim()) && (
              <div className="space-y-2 text-sm">
                {viewing.warrantyInfo?.trim() && (
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-0.5">Warranty</p>
                    <p className="text-text-secondary whitespace-pre-wrap">{viewing.warrantyInfo}</p>
                  </div>
                )}
                {viewing.safetyInfo?.trim() && (
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-0.5">Safety & resources</p>
                    <p className="text-text-secondary whitespace-pre-wrap">{viewing.safetyInfo}</p>
                  </div>
                )}
                {viewing.regulatoryInfo?.trim() && (
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-0.5">Regulatory</p>
                    <p className="text-text-secondary whitespace-pre-wrap">{viewing.regulatoryInfo}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-secondary">
              {viewing.xelnovaProductId?.trim() && (
                <p>
                  <span className="text-text-muted">Xelnova ID:</span>{' '}
                  <code className="font-mono text-text-primary">{viewing.xelnovaProductId}</code>
                </p>
              )}
              {viewing.sku?.trim() && (
                <p>
                  <span className="text-text-muted">SKU:</span> {viewing.sku}
                </p>
              )}
              {viewing.brand?.trim() && (
                <p>
                  <span className="text-text-muted">Brand:</span> {viewing.brand}
                </p>
              )}
              {viewing.weight != null && (
                <p>
                  <span className="text-text-muted">Weight (kg):</span> {viewing.weight}
                </p>
              )}
              {viewing.dimensions?.trim() && (
                <p>
                  <span className="text-text-muted">Dimensions (cm):</span> {viewing.dimensions}
                </p>
              )}
              {viewing.hsnCode?.trim() && (
                <p>
                  <span className="text-text-muted">HSN:</span> {viewing.hsnCode}
                </p>
              )}
            </div>

            {isVariantArray(viewing.variants) && viewing.variants.length > 0 ? (
              <VariantsPreview variants={viewing.variants} />
            ) : (
              <p className="text-xs text-text-muted">
                Single-SKU product &middot; no variants.
              </p>
            )}

            {/* Amazon-style expandable variant table */}
            <ProductVariantsExpansion
              productId={viewing.id}
              productName={viewing.name}
              basePrice={viewing.price}
              baseStock={viewing.stock}
              baseSku={viewing.sku || undefined}
              variants={viewing.variants}
            />

            {(viewing.status === 'PENDING' || viewing.status === 'PENDING_BRAND_AUTHORIZATION') && (
              <div className="space-y-3 pt-4 border-t border-border">
                {/* Brand approval warning */}
                {viewing.brandRecord && !viewing.brandRecord.approved && (
                  <div className="rounded-xl border-2 border-danger-200 bg-danger-50 px-3 py-3">
                    <p className="text-sm font-semibold text-danger-900 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Brand Not Approved
                    </p>
                    <p className="mt-1 text-xs text-danger-800">
                      Brand &quot;{viewing.brandRecord.name}&quot; is pending approval. You must approve the brand first before approving this product.
                      {viewing.brandRecord.proposer && (
                        <span className="block mt-1">
                          Proposed by: <span className="font-medium">{viewing.brandRecord.proposer.storeName ?? '—'}</span>
                        </span>
                      )}
                    </p>
                    <a
                      href="/brands"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-danger-700 hover:text-danger-900 underline"
                    >
                      Review brands →
                    </a>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-surface-muted/50 px-3 py-3">
                  <label
                    htmlFor="approve-commission"
                    className="block text-xs font-semibold uppercase tracking-wide text-text-muted"
                  >
                    Commission % for this product
                  </label>
                  <p className="mt-1 text-xs text-text-muted">
                    Charged on every order of this listing. Defaults to seller&apos;s rate when blank.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="approve-commission"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={approveCommission}
                      onChange={(e) => setApproveCommission(e.target.value)}
                      className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                    />
                    <span className="text-sm font-semibold text-text-muted">%</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-muted/50 px-3 py-3">
                  <label
                    htmlFor="approve-bestseller-rank"
                    className="block text-xs font-semibold uppercase tracking-wide text-text-muted"
                  >
                    Best Sellers Rank
                    <span className="ml-1 font-normal normal-case tracking-normal text-text-muted">(optional)</span>
                  </label>
                  <p className="mt-1 text-xs text-text-muted">
                    Curate this product into the Best Sellers rail. Lower number = higher position. Leave blank to skip.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-muted">#</span>
                    <input
                      id="approve-bestseller-rank"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="e.g. 1"
                      value={approveBestSellersRank}
                      onChange={(e) => setApproveBestSellersRank(e.target.value)}
                      className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-muted/50 px-3 py-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Return / replacement policy
                    </label>
                    <p className="mt-1 text-xs text-text-muted">
                      Shown to buyers (e.g. &quot;7 Days Easy Return&quot;). Replacement window chips apply when the preset includes replacement.
                    </p>
                    <select
                      value={approveReturnPolicyPreset}
                      onChange={(e) =>
                        setApproveReturnPolicyPreset(e.target.value as (typeof RETURN_POLICY_PRESETS)[number]['value'])
                      }
                      className="mt-2 w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                    >
                      {RETURN_POLICY_PRESETS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {approveReturnPolicyPreset === 'RETURN_PLUS_REPLACEMENT' && (
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wide text-text-muted">
                        Money-back return window (days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={approveReturnPlusDays}
                        onChange={(e) => setApproveReturnPlusDays(e.target.value)}
                        className="mt-1 w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-primary-500"
                      />
                    </div>
                  )}
                  {(viewing?.warrantyDurationValue != null && viewing?.warrantyDurationUnit) ||
                  viewing?.warrantyInfo?.trim() ? (
                    <p className="text-xs text-text-secondary border-t border-border/60 pt-2">
                      <span className="font-semibold text-text-muted">Warranty (from seller): </span>
                      {viewing?.warrantyDurationValue != null && viewing?.warrantyDurationUnit ? (
                        <>
                          {viewing.warrantyDurationValue} {viewing.warrantyDurationUnit.toLowerCase()}
                          {viewing.warrantyInfo?.trim() ? ` — ${viewing.warrantyInfo}` : ''}
                        </>
                      ) : (
                        viewing?.warrantyInfo
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border bg-surface-muted/50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Replacement eligibility
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        When enabled, buyers will see a &quot;{approveReplaceable ? approveReplacementWindow : 'X'} Days Replacement&quot; badge on the product page and can request a replacement within this window after delivery.
                      </p>
                    </div>
                    <label
                      htmlFor="approve-replaceable"
                      className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-text-primary"
                    >
                      <input
                        id="approve-replaceable"
                        type="checkbox"
                        checked={approveReplaceable}
                        onChange={(e) => setApproveReplaceable(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500/30"
                      />
                      Eligible
                    </label>
                  </div>
                  {(approveReplaceable ||
                    approveReturnPolicyPreset === 'REPLACEMENT_ONLY' ||
                    approveReturnPolicyPreset === 'RETURN_PLUS_REPLACEMENT') && (
                    <div className="mt-3">
                      <label
                        htmlFor="approve-replacement-window"
                        className="block text-[11px] font-medium uppercase tracking-wide text-text-muted"
                      >
                        Replacement window
                      </label>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {REPLACEMENT_WINDOW_OPTIONS.map((days) => {
                          const active = approveReplacementWindow === days;
                          return (
                            <button
                              key={days}
                              type="button"
                              onClick={() => setApproveReplacementWindow(days)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                active
                                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                                  : 'border-border bg-surface text-text-secondary hover:border-primary-300 hover:text-text-primary'
                              }`}
                            >
                              {days} Days
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 -mx-6 -mb-4 mt-4 flex flex-wrap items-center gap-2 border-t border-border bg-surface/95 px-6 py-3 backdrop-blur z-10">
                  <div className="hidden md:flex items-center gap-2 text-[11px] text-text-muted">
                    <kbd className="rounded border border-border bg-surface-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">A</kbd>
                    <span>Approve</span>
                    <kbd className="rounded border border-border bg-surface-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">R</kbd>
                    <span>Reject</span>
                    <kbd className="rounded border border-border bg-surface-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">←/→</kbd>
                    <span>Gallery</span>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const p = viewing;
                        setViewOpen(false);
                        setViewing(null);
                        openReject(p);
                      }}
                    >
                      Reject…
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      loading={approving === viewing.id}
                      onClick={() => handleApprove(viewing, { closeView: true })}
                      disabled={!!(viewing.brandRecord && !viewing.brandRecord.approved)}
                      title={
                        viewing.brandRecord && !viewing.brandRecord.approved
                          ? `Brand "${viewing.brandRecord.name}" must be approved first`
                          : undefined
                      }
                    >
                      Approve & publish
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ActionModal>

      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Product"
        onSubmit={handleSave}
        loading={saving}
        wide
      >
        <p className="text-sm text-text-secondary -mt-1">
          Update listing status and visibility flags. Product details are managed by the seller.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Status">
            <FormSelect
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
        {form.status === 'REJECTED' && (
          <FormField label="Rejection Reason (required)">
            <FormTextarea
              value={form.rejectionReason}
              onChange={(e) => setForm((f) => ({ ...f, rejectionReason: e.target.value }))}
              placeholder="Explain why this product was rejected..."
              rows={3}
            />
          </FormField>
        )}
        {(form.status === 'PENDING' || form.status === 'PENDING_BRAND_AUTHORIZATION' || form.status === 'ON_HOLD') && (
          <FormField
            label="Image rejection reason"
            hint="Use this to ask the seller to redo only the product photos without rejecting the listing. Leave blank if images are fine."
          >
            <FormTextarea
              value={form.imageRejectionReason}
              onChange={(e) => setForm((f) => ({ ...f, imageRejectionReason: e.target.value }))}
              placeholder="e.g., Cover image is blurry, please re-upload at 1024×1024 on a white background."
              rows={2}
            />
          </FormField>
        )}
        <div className="space-y-3 pt-1">
          <FormToggle
            label="Featured"
            checked={form.isFeatured}
            onChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
          />
          <FormToggle
            label="Trending"
            checked={form.isTrending}
            onChange={(v) => setForm((f) => ({ ...f, isTrending: v }))}
          />
          <FormToggle
            label="Flash deal"
            checked={form.isFlashDeal}
            onChange={(v) => setForm((f) => ({ ...f, isFlashDeal: v }))}
          />
        </div>
        <FormField
          label="Commission % (this listing)"
          hint="Override the seller's default commission for just this product. Leave blank to keep the current value (the field is pre-filled with the existing rate)."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="e.g. 12.5"
              value={form.commissionRate}
              onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
              className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            />
            <span className="text-sm font-semibold text-text-muted">%</span>
          </div>
        </FormField>
        <FormField
          label="Best Sellers Rank (optional)"
          hint="Lower number = higher priority on the Best Sellers rail. Leave blank to remove from rail."
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-muted">#</span>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 1"
              value={form.bestSellersRank}
              onChange={(e) => setForm((f) => ({ ...f, bestSellersRank: e.target.value }))}
              className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        </FormField>
        <FormField
          label="Replacement eligibility"
          hint="When enabled, buyers see a replacement badge on the product page and can request a replacement within the chosen window after delivery."
        >
          <div className="space-y-3">
            <FormToggle
              label={form.isReplaceable ? 'Eligible for replacement' : 'Not eligible'}
              checked={form.isReplaceable}
              onChange={(v) => setForm((f) => ({ ...f, isReplaceable: v }))}
            />
            {form.isReplaceable && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Replacement window
                </p>
                <div className="flex flex-wrap gap-2">
                  {REPLACEMENT_WINDOW_OPTIONS.map((days) => {
                    const active = form.replacementWindow === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, replacementWindow: days }))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-border bg-surface text-text-secondary hover:border-primary-300 hover:text-text-primary'
                        }`}
                      >
                        {days} Days
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </FormField>
      </ActionModal>
      <ActionModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Product"
        onSubmit={handleReject}
        loading={saving}
        submitLabel="Reject Product"
        submitVariant="danger"
      >
        <p className="text-sm text-text-secondary">
          Rejecting <strong>{editing?.name}</strong>. The seller will be notified and can make changes before resubmitting.
        </p>
        <FormField label="Rejection Reason">
          <FormTextarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this product is being rejected (e.g., missing images, incorrect pricing, prohibited item)..."
            rows={4}
          />
        </FormField>
      </ActionModal>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Product"
        message={`Delete "${editing?.name}"? This cannot be undone.`}
      />

      {/* Bulk approve */}
      <ActionModal
        open={bulkApproveOpen}
        onClose={() => setBulkApproveOpen(false)}
        title={`Approve ${selectedPendingCount} pending product${selectedPendingCount === 1 ? '' : 's'}`}
        onSubmit={handleBulkApprove}
        loading={bulkSubmitting}
        submitLabel={`Approve ${selectedPendingCount}`}
        submitDisabled={selectedPendingCount === 0}
        submitDisabledReason="None of the selected rows are pending"
      >
        <p className="text-sm text-text-secondary">
          {selectedPendingCount} of {selectedIds.size} selected listing{selectedIds.size === 1 ? '' : 's'}{' '}
          {selectedPendingCount === 1 ? 'is' : 'are'} pending review and will be approved with the
          shared commission below. Other selections will be skipped.
        </p>
        <FormField
          label="Commission % for this batch"
          hint="Applied to every approved product. Fine-tune individual products later from their edit screen."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={bulkCommission}
              onChange={(e) => setBulkCommission(e.target.value)}
              className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            />
            <span className="text-sm font-semibold text-text-muted">%</span>
          </div>
        </FormField>
        <p className="text-[11px] text-text-muted">
          Default policy applied: <strong>7 Days Easy Return</strong>, replacement disabled. Adjust
          individual products afterwards if needed.
        </p>
      </ActionModal>

      {/* Bulk reject */}
      <ActionModal
        open={bulkRejectOpen}
        onClose={() => setBulkRejectOpen(false)}
        title={`Reject ${selectedIds.size} product${selectedIds.size === 1 ? '' : 's'}`}
        onSubmit={handleBulkReject}
        loading={bulkSubmitting}
        submitLabel={`Reject ${selectedIds.size}`}
        submitVariant="danger"
      >
        <p className="text-sm text-text-secondary">
          Every selected seller will receive the same rejection message and their listing will be
          marked <strong>Rejected</strong>. They can edit and resubmit afterwards.
        </p>
        <FormField label="Shared rejection reason">
          <FormTextarea
            value={bulkRejectReason}
            onChange={(e) => setBulkRejectReason(e.target.value)}
            placeholder="e.g., Cover image is blurry. Please re-upload at 1024x1024 on a white background."
            rows={4}
          />
        </FormField>
      </ActionModal>
    </>
  );
}
