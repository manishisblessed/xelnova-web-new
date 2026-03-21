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

export interface ProductVariant {
  type: "size" | "color";
  label: string;
  options: { value: string; label: string; available: boolean; hex?: string }[];
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
  seller: { name: string; rating: number };
  variants: ProductVariant[];
  specifications: Record<string, string>;
  reviews: ProductReview[];
  tags: string[];
  createdAt: string;
  isFeatured?: boolean;
  isFlashDeal?: boolean;
  flashDealEndsAt?: string;
}
