import type { Product } from '@/lib/data/products';

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
  seller?: { storeName: string };
}

export function listingProductToCardProduct(
  p: ListingProduct,
  opts: { categoryLabel: string; defaultBrand?: string }
): Product {
  const comparePrice = p.compareAtPrice ?? 0;
  const price = p.price;
  const discount =
    comparePrice > price && comparePrice > 0
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : 0;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: '',
    price,
    comparePrice,
    discount,
    images: p.images ?? [],
    category: opts.categoryLabel,
    brand: p.brand || opts.defaultBrand || '',
    rating: p.rating,
    reviewCount: p.reviewCount,
    boughtLastMonth: 0,
    inStock: p.stock > 0,
    stockCount: p.stock,
    seller: { name: p.seller?.storeName ?? 'Seller', rating: 4.5 },
    variants: [],
    specifications: {},
    reviews: [],
    tags: p.tags ?? [],
    createdAt: new Date().toISOString(),
  };
}
