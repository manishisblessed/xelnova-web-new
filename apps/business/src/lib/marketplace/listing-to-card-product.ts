import type { Product, ProductVariant } from '@/lib/data/products';
import { calculateDiscount, priceInclusiveOfGst } from '@xelnova/utils';

/** Minimal product shape from category/brand listing APIs */
export interface ListingProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  brand: string;
  category: string;
  stock: number;
  tags: string[];
  seller?: { storeName: string; slug?: string };
  gstRate?: number | null;
  /** Optional, included by listing endpoints that surface variants. */
  variants?: unknown;
}

export function listingProductToCardProduct(
  p: ListingProduct,
  opts: { categoryLabel: string; defaultBrand?: string }
): Product {
  const comparePrice = p.compareAtPrice ?? 0;
  const price = p.price;
  const gstRate = p.gstRate ?? null;
  const priceIncl = priceInclusiveOfGst(price, gstRate);
  const compareIncl = priceInclusiveOfGst(comparePrice || price, gstRate);
  const discount = calculateDiscount(priceIncl, compareIncl);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: '',
    price,
    comparePrice,
    gstRate,
    discount,
    images: p.images ?? [],
    category: opts.categoryLabel,
    brand: p.brand || opts.defaultBrand || '',
    rating: p.rating,
    reviewCount: p.reviewCount,
    boughtLastMonth: 0,
    inStock: p.stock > 0,
    stockCount: p.stock,
    seller: { name: p.seller?.storeName ?? 'Seller', rating: 4.5, slug: p.seller?.slug },
    variants: Array.isArray(p.variants) ? (p.variants as ProductVariant[]) : [],
    specifications: {},
    reviews: [],
    tags: p.tags ?? [],
    createdAt: new Date().toISOString(),
  };
}
