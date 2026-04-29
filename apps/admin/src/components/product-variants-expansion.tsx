'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Package, DollarSign, Package2 } from 'lucide-react';
import { Badge } from '@xelnova/ui';

// ─── Types ───

type VariantOption = {
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

type VariantGroup = {
  type?: string;
  label?: string;
  defaultLabel?: string;
  options?: VariantOption[];
  sizeChart?: { label?: string; values?: Record<string, string> }[];
};

interface ProductVariantsExpansionProps {
  productId: string;
  productName: string;
  basePrice?: number;
  baseStock?: number;
  baseSku?: string;
  variants: unknown;
  /** Optional sales/performance data per variant SKU */
  salesData?: Record<string, {
    unitsSold?: number;
    pageViews?: number;
    salesRank?: number;
  }>;
  className?: string;
}

function isVariantArray(v: unknown): v is VariantGroup[] {
  return Array.isArray(v) && v.every((g) => g && typeof g === 'object');
}

/**
 * Flattens all variant groups into a single list of individual variant options
 * with their full attribute path (e.g., "Red / Large").
 */
function flattenVariants(groups: VariantGroup[]): Array<{
  attributePath: string;
  sku: string;
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  images?: string[];
  available: boolean;
  groupLabel: string;
}> {
  const result: Array<{
    attributePath: string;
    sku: string;
    price?: number;
    compareAtPrice?: number;
    stock?: number;
    images?: string[];
    available: boolean;
    groupLabel: string;
  }> = [];

  for (const group of groups) {
    const groupLabel = group.label || group.type || 'Option';
    const options = group.options ?? [];

    for (const option of options) {
      result.push({
        attributePath: option.label || option.value || '—',
        sku: option.sku || '—',
        price: option.price,
        compareAtPrice: option.compareAtPrice,
        stock: option.stock,
        images: option.images,
        available: option.available !== false,
        groupLabel,
      });
    }
  }

  return result;
}

/**
 * Amazon-style expandable variant display for product management.
 * Shows a summary badge that expands to reveal a detailed table of all variants
 * with their SKU, price, stock, images, and optional sales data.
 */
export function ProductVariantsExpansion({
  productId,
  productName,
  basePrice,
  baseStock,
  baseSku,
  variants,
  salesData,
  className = '',
}: ProductVariantsExpansionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVariantArray(variants) || variants.length === 0) {
    // Single-SKU product: show inline summary
    return (
      <div className={`rounded-lg border border-border bg-surface-muted/30 p-3 text-xs ${className}`}>
        <div className="flex items-center gap-2 text-text-muted">
          <Package2 size={14} />
          <span>Single-SKU product (no variants)</span>
        </div>
        {baseSku && (
          <p className="mt-1 text-text-secondary">
            <span className="font-semibold">SKU:</span> {baseSku}
          </p>
        )}
      </div>
    );
  }

  const flatVariants = flattenVariants(variants);
  const totalVariants = flatVariants.length;

  return (
    <div className={`rounded-lg border border-border bg-surface ${className}`}>
      {/* Expansion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Package size={16} className="text-primary-600" />
            <span className="text-sm font-semibold text-text-primary">
              Related to {totalVariants} variation{totalVariants === 1 ? '' : 's'}
            </span>
          </div>
          <Badge variant="info" className="text-xs">
            {variants.length} group{variants.length === 1 ? '' : 's'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <>
              <span className="text-xs text-text-muted">Collapse</span>
              <ChevronUp size={16} className="text-text-muted" />
            </>
          ) : (
            <>
              <span className="text-xs text-text-muted">Expand</span>
              <ChevronDown size={16} className="text-text-muted" />
            </>
          )}
        </div>
      </button>

      {/* Expanded Variant Details */}
      {isExpanded && (
        <div className="border-t border-border bg-surface-muted/20">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-text-primary">Image</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-text-primary">Variant</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-text-primary">SKU</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-text-primary">Price</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-text-primary">Stock</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-text-primary">Status</th>
                  {salesData && (
                    <>
                      <th className="px-4 py-2.5 text-right font-semibold text-text-primary">Units Sold</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-text-primary">Page Views</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {flatVariants.map((variant, idx) => {
                  const sales = salesData?.[variant.sku];
                  const isLowStock = variant.stock !== undefined && variant.stock <= 5;

                  return (
                    <tr
                      key={`${variant.sku}-${idx}`}
                      className="border-b border-border last:border-0 hover:bg-surface-muted/30 transition-colors"
                    >
                      {/* Image */}
                      <td className="px-4 py-3">
                        <div className="h-12 w-12 rounded-md border border-border bg-white overflow-hidden">
                          {variant.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={variant.images[0]}
                              alt={variant.attributePath}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-text-muted">
                              <Package2 size={16} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Variant Details */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="font-medium text-text-primary">{variant.attributePath}</p>
                          <p className="text-[10px] uppercase tracking-wide text-text-muted">
                            {variant.groupLabel}
                          </p>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3">
                        <code className="text-xs text-text-secondary bg-surface-muted px-2 py-0.5 rounded">
                          {variant.sku}
                        </code>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        <div className="space-y-0.5">
                          {variant.price !== undefined ? (
                            <>
                              <p className="font-semibold text-text-primary">
                                ₹{variant.price.toLocaleString('en-IN')}
                              </p>
                              {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
                                <p className="text-[10px] text-text-muted line-through">
                                  ₹{variant.compareAtPrice.toLocaleString('en-IN')}
                                </p>
                              )}
                            </>
                          ) : basePrice !== undefined ? (
                            <p className="font-semibold text-text-secondary">
                              ₹{basePrice.toLocaleString('en-IN')}
                            </p>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-semibold ${
                            isLowStock ? 'text-danger-600' : 'text-text-primary'
                          }`}
                        >
                          {variant.stock !== undefined ? variant.stock : baseStock ?? '—'}
                        </span>
                        {isLowStock && (
                          <p className="text-[10px] text-danger-600 mt-0.5">Low stock</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <Badge variant={variant.available ? 'success' : 'danger'} className="text-[10px]">
                          {variant.available ? 'Active' : 'Unavailable'}
                        </Badge>
                      </td>

                      {/* Sales Data (Optional) */}
                      {salesData && (
                        <>
                          <td className="px-4 py-3 text-right text-text-secondary">
                            {sales?.unitsSold !== undefined ? sales.unitsSold.toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-text-secondary">
                            {sales?.pageViews !== undefined ? sales.pageViews.toLocaleString() : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-border">
            {flatVariants.map((variant, idx) => {
              const sales = salesData?.[variant.sku];
              const isLowStock = variant.stock !== undefined && variant.stock <= 5;

              return (
                <div key={`${variant.sku}-${idx}`} className="p-4 space-y-3">
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="h-16 w-16 rounded-md border border-border bg-white overflow-hidden shrink-0">
                      {variant.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={variant.images[0]}
                          alt={variant.attributePath}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-text-muted">
                          <Package2 size={20} />
                        </div>
                      )}
                    </div>

                    {/* Variant Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold text-sm text-text-primary">{variant.attributePath}</p>
                      <p className="text-[10px] uppercase tracking-wide text-text-muted">
                        {variant.groupLabel}
                      </p>
                      <Badge variant={variant.available ? 'success' : 'danger'} className="text-[10px]">
                        {variant.available ? 'Active' : 'Unavailable'}
                      </Badge>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p className="text-text-muted">SKU</p>
                      <code className="text-text-secondary bg-surface-muted px-2 py-0.5 rounded">
                        {variant.sku}
                      </code>
                    </div>
                    <div>
                      <p className="text-text-muted">Price</p>
                      {variant.price !== undefined ? (
                        <div>
                          <p className="font-semibold text-text-primary">
                            ₹{variant.price.toLocaleString('en-IN')}
                          </p>
                          {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
                            <p className="text-[10px] text-text-muted line-through">
                              ₹{variant.compareAtPrice.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      ) : basePrice !== undefined ? (
                        <p className="font-semibold text-text-secondary">
                          ₹{basePrice.toLocaleString('en-IN')}
                        </p>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </div>
                    <div>
                      <p className="text-text-muted">Stock</p>
                      <p className={`font-semibold ${isLowStock ? 'text-danger-600' : 'text-text-primary'}`}>
                        {variant.stock !== undefined ? variant.stock : baseStock ?? '—'}
                        {isLowStock && <span className="text-[10px] ml-1">(Low)</span>}
                      </p>
                    </div>
                    {salesData && sales && (
                      <>
                        <div>
                          <p className="text-text-muted">Units Sold</p>
                          <p className="font-medium text-text-secondary">
                            {sales.unitsSold !== undefined ? sales.unitsSold.toLocaleString() : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-muted">Page Views</p>
                          <p className="font-medium text-text-secondary">
                            {sales.pageViews !== undefined ? sales.pageViews.toLocaleString() : '—'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
