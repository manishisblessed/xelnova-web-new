// ─── API Response ───

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── Auth ───

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// ─── Product ───

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  categoryId: string;
  category?: Category;
  brand: string | null;
  sellerId: string;
  seller?: SellerProfile;
  rating: number;
  reviewCount: number;
  stock: number;
  isFeatured: boolean;
  isTrending: boolean;
  isFlashDeal: boolean;
  flashDealEndsAt: string | null;
  variants: any;
  specifications: any;
  highlights: string[];
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  relatedProducts?: Product[];
}

// ─── Category ───

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  parent?: Category | null;
  children?: Category[];
  productCount: number;
}

// ─── Seller ───

export interface SellerProfile {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  logo: string | null;
  description: string | null;
  verified: boolean;
  location: string | null;
  rating: number;
  totalSales: number;
  createdAt: string;
}

// ─── Banner ───

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  bgColor: string | null;
  isActive: boolean;
  sortOrder: number;
}

// ─── Cart ───

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  variant: string | null;
  brand: string | null;
  sellerId: string;
  stock: number;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
}

export interface Cart {
  items: CartItem[];
  coupon?: { code: string; discount: number } | null;
  summary: CartSummary;
}

// ─── Order ───

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
  variant: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  paymentMethod: string | null;
  shippingAddress: Address | null;
  couponCode: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
}

// ─── Address ───

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  type: string;
  isDefault: boolean;
}

// ─── Review ───

export interface Review {
  id: string;
  productId: string;
  userId: string;
  user?: { id: string; name: string; avatar: string | null };
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
}

export interface ReviewSummary {
  totalReviews: number;
  avgRating: number;
  ratingDistribution: { star: number; count: number }[];
}

// ─── Coupon ───

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validUntil: string | null;
  isActive: boolean;
}
