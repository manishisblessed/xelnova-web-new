export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  helpful: number;
  verified: boolean;
}

export interface ProductVariantOption {
  value: string;
  label: string;
  available: boolean;
  hex?: string;
  /** Option images — first is the main/thumbnail, rest are supporting (up to 5) */
  images?: string[];
  /** Per-option price override; when set, replaces product.price on the PDP/cart. */
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  sku?: string;
}

export interface SizeChartRow {
  label: string;
  values: Record<string, string>;
}

export interface ProductVariant {
  /** Unique key for selection state (e.g. color, size, material) */
  type: string;
  label: string;
  /** Label for the base/main product when shown alongside variant options */
  defaultLabel?: string;
  options: ProductVariantOption[];
  sizeChart?: SizeChartRow[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  comparePrice: number;
  discount: number;
  images: string[];
  category: string;
  brand: string;
  rating: number;
  reviewCount: number;
  boughtLastMonth: number;
  inStock: boolean;
  stockCount: number;
  seller: { name: string; rating: number; slug?: string };
  variants: ProductVariant[];
  specifications: Record<string, string>;
  reviews: ProductReview[];
  tags: string[];
  createdAt: string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: string;
  // Amazon-style product information
  featuresAndSpecs?: Record<string, string>;
  materialsAndCare?: Record<string, string>;
  itemDetails?: Record<string, string>;
  additionalDetails?: Record<string, string>;
  productDescription?: string;
  safetyInfo?: string;
  regulatoryInfo?: string;
  warrantyInfo?: string;
  deliveredBy?: string;
  isReplaceable?: boolean;
  returnWindow?: number;
}
