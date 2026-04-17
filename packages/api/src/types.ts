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

export type AuthProvider = 'EMAIL' | 'PHONE' | 'GOOGLE';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'BUSINESS';
  authProvider?: AuthProvider;
  aadhaarVerified?: boolean;
  aadhaarVerifiedAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  hasSellerProfile?: boolean;
}

export type OrganizationMemberRole = 'ORG_ADMIN' | 'BUYER' | 'APPROVER';

export interface OrganizationSummary {
  id: string;
  name: string;
  legalName: string | null;
  gstin: string | null;
  updatedAt: string;
  myRole: OrganizationMemberRole;
}

export interface BusinessRegisterResponse extends LoginResponse {
  organization: {
    id: string;
    name: string;
    legalName: string | null;
    gstin: string | null;
  };
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
  /** GST % for this SKU; cart adds tax on top of `price`. Consumer UI shows inclusive amount. */
  gstRate?: number | null;
  relatedProducts?: Product[];
  // Amazon-style product information
  featuresAndSpecs?: Record<string, string> | null;
  materialsAndCare?: Record<string, string> | null;
  itemDetails?: Record<string, string> | null;
  additionalDetails?: Record<string, string> | null;
  productDescription?: string | null;
  safetyInfo?: string | null;
  regulatoryInfo?: string | null;
  warrantyInfo?: string | null;
  deliveredBy?: string | null;
  isReplaceable?: boolean;
  returnWindow?: number;
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

// ─── Seller Store (Brand Store) ───

export interface SellerStoreBanner {
  id: string;
  title: string | null;
  imageUrl: string;
  mobileUrl: string | null;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SellerStoreCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
}

export interface SellerStore extends SellerProfile {
  heroBannerUrl: string | null;
  heroBannerMobile: string | null;
  aboutTitle: string | null;
  aboutDescription: string | null;
  storeThemeColor: string | null;
  storeBanners: SellerStoreBanner[];
  categories: SellerStoreCategory[];
  featuredProducts: Product[];
  productCount: number;
}

export interface SellerStoreSettings {
  heroBannerUrl: string | null;
  heroBannerMobile: string | null;
  aboutTitle: string | null;
  aboutDescription: string | null;
  storeThemeColor: string | null;
  featuredProductIds: string[];
  storeBanners: SellerStoreBanner[];
  availableProducts: { id: string; name: string; images: string[]; price: number }[];
  storeUrl: string;
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
  position: string;
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
  freeShippingMin?: number;
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
  /** HSN code for tax invoice */
  hsnCode?: string | null;
  /** GST rate applied to this item */
  gstRate?: number | null;
  /** IMEI/Serial number for electronics */
  imeiSerialNo?: string | null;
  /** Seller ID who fulfilled this item */
  sellerId?: string | null;
  /** Present when API includes nested product (e.g. some list/detail responses). */
  product?: { name?: string; slug?: string; images?: string[] };
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
  paymentStatus?: string;
  paymentMethod: string | null;
  shippingAddress: Address | null;
  couponCode: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt?: string;
}

// ─── Address ───

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string | null;
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
