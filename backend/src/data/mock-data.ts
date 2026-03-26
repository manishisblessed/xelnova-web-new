export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number;
  images: string[];
  category: string;
  subcategory: string;
  brand: string;
  sellerId: string;
  rating: number;
  reviewCount: number;
  stock: number;
  isFeatured: boolean;
  isTrending: boolean;
  isFlashDeal: boolean;
  flashDealEndsAt?: string;
  variants: ProductVariant[];
  specifications: Record<string, string>;
  highlights: string[];
  tags: string[];
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  type: string;
  options: { label: string; value: string; stock: number }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string | null;
  children?: Category[];
  productCount: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  bgColor: string;
}

export interface Seller {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  rating: number;
  totalProducts: number;
  totalSales: number;
  joinedAt: string;
  verified: boolean;
  location: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
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
  paymentMethod: string;
  shippingAddress: Address;
  createdAt: string;
  estimatedDelivery: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  variant?: string;
}

export interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  type: string;
}

export interface Coupon {
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  validUntil: string;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  addresses: Address[];
  wishlist: string[];
  createdAt: string;
}
