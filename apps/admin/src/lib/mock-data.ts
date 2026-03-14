export interface DashboardStat {
  label: string;
  value: string;
  change: number;
  icon: string;
}

export interface RecentOrder {
  id: string;
  customer: string;
  email: string;
  amount: number;
  status: 'Delivered' | 'Processing' | 'Pending' | 'Cancelled' | 'Shipped';
  date: string;
  items: number;
  payment: string;
}

export interface TopProduct {
  id: number;
  name: string;
  category: string;
  sold: number;
  revenue: number;
  image: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'Active' | 'Inactive' | 'Pending';
  image: string;
  seller: string;
  sku: string;
  rating: number;
  reviews: number;
}

export interface Order {
  id: string;
  customer: string;
  email: string;
  items: number;
  total: number;
  status: 'Delivered' | 'Processing' | 'Pending' | 'Cancelled' | 'Shipped';
  payment: 'Paid' | 'Pending' | 'Refunded';
  date: string;
  method: string;
}

export interface Seller {
  id: number;
  name: string;
  business: string;
  email: string;
  products: number;
  revenue: number;
  status: 'Active' | 'Pending' | 'Suspended';
  joined: string;
  rating: number;
  commission: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
  joined: string;
  status: 'Active' | 'Inactive' | 'Blocked';
  lastOrder: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: string | null;
  products: number;
  status: 'Active' | 'Inactive';
  featured: boolean;
  image: string;
  order: number;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo: string;
  products: number;
  status: 'Active' | 'Inactive';
  featured: boolean;
  seller: string;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'Percentage' | 'Fixed';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  used: number;
  limit: number;
  status: 'Active' | 'Expired' | 'Disabled';
  validFrom: string;
  validTo: string;
}

export interface Banner {
  id: number;
  title: string;
  position: 'Hero' | 'Sidebar' | 'Footer' | 'Category';
  image: string;
  link: string;
  status: 'Active' | 'Inactive' | 'Scheduled';
  clicks: number;
  impressions: number;
  startDate: string;
  endDate: string;
}

export interface FlashDeal {
  id: number;
  title: string;
  products: number;
  discount: number;
  status: 'Active' | 'Upcoming' | 'Expired';
  startDate: string;
  endDate: string;
  sold: number;
  target: number;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  status: 'Published' | 'Draft';
  author: string;
  updatedAt: string;
  views: number;
}

export interface PayoutRequest {
  id: number;
  seller: string;
  business: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  requestedAt: string;
  paidAt: string | null;
  method: string;
}

export interface CommissionRule {
  id: number;
  category: string;
  rate: number;
  type: 'Percentage' | 'Fixed';
  status: 'Active' | 'Inactive';
  minOrder: number;
  appliedTo: number;
  earned: number;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  users: number;
  permissions: number;
  description: string;
  createdAt: string;
}

export interface ActivityItem {
  id: number;
  type: 'order' | 'seller' | 'product' | 'customer' | 'payout' | 'review';
  message: string;
  time: string;
  avatar?: string;
}

export interface RevenueByChannel {
  channel: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export const dashboardStats: DashboardStat[] = [
  { label: 'Total Revenue', value: '$284,520', change: 12.5, icon: 'dollar-sign' },
  { label: 'Total Orders', value: '3,842', change: 8.2, icon: 'shopping-cart' },
  { label: 'Customers', value: '12,648', change: 5.4, icon: 'users' },
  { label: 'Active Sellers', value: '342', change: -2.1, icon: 'store' },
];

export const revenueData = [
  { month: 'Jan', revenue: 18500, orders: 320, expenses: 12400 },
  { month: 'Feb', revenue: 22300, orders: 380, expenses: 14200 },
  { month: 'Mar', revenue: 19800, orders: 340, expenses: 13100 },
  { month: 'Apr', revenue: 27600, orders: 420, expenses: 16800 },
  { month: 'May', revenue: 31200, orders: 480, expenses: 18900 },
  { month: 'Jun', revenue: 28900, orders: 450, expenses: 17200 },
  { month: 'Jul', revenue: 35400, orders: 520, expenses: 20100 },
  { month: 'Aug', revenue: 33100, orders: 490, expenses: 19400 },
  { month: 'Sep', revenue: 38700, orders: 560, expenses: 22800 },
  { month: 'Oct', revenue: 42300, orders: 610, expenses: 24500 },
  { month: 'Nov', revenue: 39800, orders: 580, expenses: 23100 },
  { month: 'Dec', revenue: 45600, orders: 650, expenses: 26200 },
];

export const revenueByChannel: RevenueByChannel[] = [
  { channel: 'Web Store', revenue: 186420, orders: 2145, percentage: 48.5 },
  { channel: 'Mobile App', revenue: 124380, orders: 1842, percentage: 32.3 },
  { channel: 'Social Media', revenue: 42100, orders: 512, percentage: 10.9 },
  { channel: 'Marketplace API', revenue: 31620, orders: 343, percentage: 8.2 },
];

export const recentOrders: RecentOrder[] = [
  { id: 'XN-1024', customer: 'Sarah Johnson', email: 'sarah@email.com', amount: 249.99, status: 'Delivered', date: 'Mar 10, 2026', items: 3, payment: 'Credit Card' },
  { id: 'XN-1023', customer: 'Michael Chen', email: 'mchen@email.com', amount: 89.50, status: 'Processing', date: 'Mar 10, 2026', items: 1, payment: 'PayPal' },
  { id: 'XN-1022', customer: 'Emily Davis', email: 'emily@email.com', amount: 432.00, status: 'Shipped', date: 'Mar 9, 2026', items: 5, payment: 'Credit Card' },
  { id: 'XN-1021', customer: 'James Wilson', email: 'jwilson@email.com', amount: 175.25, status: 'Pending', date: 'Mar 9, 2026', items: 2, payment: 'Debit Card' },
  { id: 'XN-1020', customer: 'Ana Martinez', email: 'ana@email.com', amount: 67.80, status: 'Delivered', date: 'Mar 8, 2026', items: 1, payment: 'UPI' },
];

export const topProducts: TopProduct[] = [
  { id: 1, name: 'iPhone 15 Pro Max', category: 'Electronics', sold: 284, revenue: 339716, image: '📱' },
  { id: 2, name: 'Nike Air Max 270', category: 'Footwear', sold: 512, revenue: 76800, image: '👟' },
  { id: 3, name: 'Samsung 65" OLED TV', category: 'Electronics', sold: 98, revenue: 127400, image: '📺' },
  { id: 4, name: 'Dyson V15 Vacuum', category: 'Appliances', sold: 176, revenue: 123200, image: '🔧' },
  { id: 5, name: 'MacBook Air M3', category: 'Electronics', sold: 152, revenue: 182400, image: '💻' },
];

export const products: Product[] = [
  { id: 1, name: 'iPhone 15 Pro Max', category: 'Electronics', price: 1199, stock: 145, status: 'Active', image: '📱', seller: 'TechWorld', sku: 'IP15PM-256', rating: 4.8, reviews: 324 },
  { id: 2, name: 'Nike Air Max 270', category: 'Footwear', price: 150, stock: 320, status: 'Active', image: '👟', seller: 'SneakerHub', sku: 'NAM270-BK', rating: 4.5, reviews: 189 },
  { id: 3, name: 'Samsung 65" OLED TV', category: 'Electronics', price: 1299, stock: 42, status: 'Active', image: '📺', seller: 'ElectroMart', sku: 'SS65-OLED', rating: 4.7, reviews: 87 },
  { id: 4, name: 'Dyson V15 Vacuum', category: 'Appliances', price: 699, stock: 78, status: 'Active', image: '🔧', seller: 'HomeEssentials', sku: 'DYS-V15', rating: 4.6, reviews: 156 },
  { id: 5, name: 'MacBook Air M3', category: 'Electronics', price: 1199, stock: 0, status: 'Inactive', image: '💻', seller: 'TechWorld', sku: 'MBA-M3-256', rating: 4.9, reviews: 412 },
  { id: 6, name: 'Levi\'s 501 Original', category: 'Fashion', price: 69.50, stock: 540, status: 'Active', image: '👖', seller: 'FashionStore', sku: 'LV501-BLU', rating: 4.3, reviews: 98 },
  { id: 7, name: 'Sony WH-1000XM5', category: 'Electronics', price: 349, stock: 210, status: 'Active', image: '🎧', seller: 'AudioPro', sku: 'SNYWH-XM5', rating: 4.8, reviews: 567 },
  { id: 8, name: 'Instant Pot Duo Plus', category: 'Kitchen', price: 89.99, stock: 15, status: 'Pending', image: '🍳', seller: 'KitchenKing', sku: 'IP-DUO-6Q', rating: 4.4, reviews: 234 },
  { id: 9, name: 'Adidas Ultraboost 23', category: 'Footwear', price: 190, stock: 185, status: 'Active', image: '👟', seller: 'SneakerHub', sku: 'ADI-UB23', rating: 4.6, reviews: 178 },
  { id: 10, name: 'KitchenAid Mixer', category: 'Kitchen', price: 429, stock: 33, status: 'Pending', image: '🍰', seller: 'KitchenKing', sku: 'KA-MIX-5Q', rating: 4.7, reviews: 312 },
  { id: 11, name: 'Ray-Ban Aviator', category: 'Fashion', price: 163, stock: 450, status: 'Active', image: '🕶️', seller: 'FashionStore', sku: 'RB-AVI-GLD', rating: 4.5, reviews: 145 },
  { id: 12, name: 'Bose QC Ultra', category: 'Electronics', price: 429, stock: 67, status: 'Active', image: '🎧', seller: 'AudioPro', sku: 'BOSE-QCU', rating: 4.7, reviews: 289 },
];

export const orders: Order[] = [
  { id: 'XN-1024', customer: 'Sarah Johnson', email: 'sarah@email.com', items: 3, total: 249.99, status: 'Delivered', payment: 'Paid', date: 'Mar 10, 2026', method: 'Credit Card' },
  { id: 'XN-1023', customer: 'Michael Chen', email: 'mchen@email.com', items: 1, total: 89.50, status: 'Processing', payment: 'Paid', date: 'Mar 10, 2026', method: 'PayPal' },
  { id: 'XN-1022', customer: 'Emily Davis', email: 'emily@email.com', items: 5, total: 432.00, status: 'Shipped', payment: 'Paid', date: 'Mar 9, 2026', method: 'Credit Card' },
  { id: 'XN-1021', customer: 'James Wilson', email: 'jwilson@email.com', items: 2, total: 175.25, status: 'Pending', payment: 'Pending', date: 'Mar 9, 2026', method: 'Debit Card' },
  { id: 'XN-1020', customer: 'Ana Martinez', email: 'ana@email.com', items: 1, total: 67.80, status: 'Delivered', payment: 'Paid', date: 'Mar 8, 2026', method: 'UPI' },
  { id: 'XN-1019', customer: 'David Kim', email: 'dkim@email.com', items: 4, total: 523.40, status: 'Processing', payment: 'Paid', date: 'Mar 8, 2026', method: 'Credit Card' },
  { id: 'XN-1018', customer: 'Lisa Wang', email: 'lwang@email.com', items: 2, total: 198.00, status: 'Cancelled', payment: 'Refunded', date: 'Mar 7, 2026', method: 'PayPal' },
  { id: 'XN-1017', customer: 'Robert Brown', email: 'rbrown@email.com', items: 6, total: 892.50, status: 'Delivered', payment: 'Paid', date: 'Mar 7, 2026', method: 'Credit Card' },
  { id: 'XN-1016', customer: 'Maria Garcia', email: 'mgarcia@email.com', items: 1, total: 45.99, status: 'Shipped', payment: 'Paid', date: 'Mar 6, 2026', method: 'Debit Card' },
  { id: 'XN-1015', customer: 'Tom Harris', email: 'tharris@email.com', items: 3, total: 312.75, status: 'Delivered', payment: 'Paid', date: 'Mar 6, 2026', method: 'UPI' },
];

export const sellers: Seller[] = [
  { id: 1, name: 'John Smith', business: 'TechWorld Electronics', email: 'john@techworld.com', products: 145, revenue: 284520, status: 'Active', joined: 'Jan 15, 2025', rating: 4.8, commission: 8 },
  { id: 2, name: 'Priya Sharma', business: 'FashionStore India', email: 'priya@fashionstore.in', products: 312, revenue: 198340, status: 'Active', joined: 'Feb 20, 2025', rating: 4.6, commission: 10 },
  { id: 3, name: 'Alex Turner', business: 'SneakerHub', email: 'alex@sneakerhub.com', products: 89, revenue: 156780, status: 'Active', joined: 'Mar 5, 2025', rating: 4.7, commission: 8 },
  { id: 4, name: 'Wei Chen', business: 'ElectroMart', email: 'wei@electromart.com', products: 234, revenue: 342100, status: 'Active', joined: 'Apr 12, 2025', rating: 4.5, commission: 7 },
  { id: 5, name: 'Maria Lopez', business: 'HomeEssentials', email: 'maria@homeess.com', products: 178, revenue: 89450, status: 'Pending', joined: 'Mar 1, 2026', rating: 0, commission: 10 },
  { id: 6, name: 'Ahmed Hassan', business: 'AudioPro', email: 'ahmed@audiopro.com', products: 56, revenue: 67890, status: 'Active', joined: 'Jun 8, 2025', rating: 4.9, commission: 6 },
  { id: 7, name: 'Lisa Park', business: 'KitchenKing', email: 'lisa@kitchenking.com', products: 92, revenue: 112340, status: 'Pending', joined: 'Feb 28, 2026', rating: 0, commission: 10 },
  { id: 8, name: 'Carlos Mendez', business: 'SportZone', email: 'carlos@sportzone.com', products: 201, revenue: 178920, status: 'Suspended', joined: 'Jul 22, 2025', rating: 3.2, commission: 12 },
  { id: 9, name: 'Emma Wilson', business: 'BeautyBliss', email: 'emma@beautybliss.com', products: 167, revenue: 94560, status: 'Active', joined: 'Aug 14, 2025', rating: 4.4, commission: 9 },
  { id: 10, name: 'Raj Patel', business: 'GadgetWorld', email: 'raj@gadgetworld.com', products: 78, revenue: 45230, status: 'Pending', joined: 'Mar 5, 2026', rating: 0, commission: 10 },
];

export const customers: Customer[] = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah@email.com', phone: '+1 (555) 123-4567', orders: 24, totalSpent: 4520.80, joined: 'Jan 5, 2025', status: 'Active', lastOrder: 'Mar 10, 2026' },
  { id: 2, name: 'Michael Chen', email: 'mchen@email.com', phone: '+1 (555) 234-5678', orders: 18, totalSpent: 3210.50, joined: 'Feb 12, 2025', status: 'Active', lastOrder: 'Mar 10, 2026' },
  { id: 3, name: 'Emily Davis', email: 'emily@email.com', phone: '+1 (555) 345-6789', orders: 31, totalSpent: 7845.20, joined: 'Jan 20, 2025', status: 'Active', lastOrder: 'Mar 9, 2026' },
  { id: 4, name: 'James Wilson', email: 'jwilson@email.com', phone: '+1 (555) 456-7890', orders: 7, totalSpent: 892.30, joined: 'Mar 8, 2025', status: 'Active', lastOrder: 'Mar 9, 2026' },
  { id: 5, name: 'Ana Martinez', email: 'ana@email.com', phone: '+1 (555) 567-8901', orders: 15, totalSpent: 2340.60, joined: 'Apr 15, 2025', status: 'Active', lastOrder: 'Mar 8, 2026' },
  { id: 6, name: 'David Kim', email: 'dkim@email.com', phone: '+1 (555) 678-9012', orders: 42, totalSpent: 12450.90, joined: 'Dec 1, 2024', status: 'Active', lastOrder: 'Mar 8, 2026' },
  { id: 7, name: 'Lisa Wang', email: 'lwang@email.com', phone: '+1 (555) 789-0123', orders: 3, totalSpent: 198.00, joined: 'Feb 28, 2026', status: 'Inactive', lastOrder: 'Mar 7, 2026' },
  { id: 8, name: 'Robert Brown', email: 'rbrown@email.com', phone: '+1 (555) 890-1234', orders: 56, totalSpent: 18920.40, joined: 'Nov 10, 2024', status: 'Active', lastOrder: 'Mar 7, 2026' },
  { id: 9, name: 'Maria Garcia', email: 'mgarcia@email.com', phone: '+1 (555) 901-2345', orders: 9, totalSpent: 1234.50, joined: 'May 22, 2025', status: 'Active', lastOrder: 'Mar 6, 2026' },
  { id: 10, name: 'Tom Harris', email: 'tharris@email.com', phone: '+1 (555) 012-3456', orders: 1, totalSpent: 45.99, joined: 'Mar 1, 2026', status: 'Blocked', lastOrder: 'Mar 6, 2026' },
  { id: 11, name: 'Sophie Lee', email: 'sophie@email.com', phone: '+1 (555) 111-2222', orders: 22, totalSpent: 5670.30, joined: 'Jun 14, 2025', status: 'Active', lastOrder: 'Mar 5, 2026' },
  { id: 12, name: 'Daniel Moore', email: 'dmoore@email.com', phone: '+1 (555) 333-4444', orders: 13, totalSpent: 2890.10, joined: 'Jul 30, 2025', status: 'Active', lastOrder: 'Mar 4, 2026' },
];

export const categories: Category[] = [
  { id: 1, name: 'Electronics', slug: 'electronics', parent: null, products: 456, status: 'Active', featured: true, image: '💻', order: 1 },
  { id: 2, name: 'Smartphones', slug: 'smartphones', parent: 'Electronics', products: 189, status: 'Active', featured: true, image: '📱', order: 2 },
  { id: 3, name: 'Laptops', slug: 'laptops', parent: 'Electronics', products: 134, status: 'Active', featured: true, image: '💻', order: 3 },
  { id: 4, name: 'Audio', slug: 'audio', parent: 'Electronics', products: 78, status: 'Active', featured: false, image: '🎧', order: 4 },
  { id: 5, name: 'Fashion', slug: 'fashion', parent: null, products: 892, status: 'Active', featured: true, image: '👗', order: 5 },
  { id: 6, name: 'Men\'s Clothing', slug: 'mens-clothing', parent: 'Fashion', products: 345, status: 'Active', featured: false, image: '👔', order: 6 },
  { id: 7, name: 'Women\'s Clothing', slug: 'womens-clothing', parent: 'Fashion', products: 412, status: 'Active', featured: true, image: '👗', order: 7 },
  { id: 8, name: 'Footwear', slug: 'footwear', parent: null, products: 234, status: 'Active', featured: true, image: '👟', order: 8 },
  { id: 9, name: 'Kitchen', slug: 'kitchen', parent: null, products: 156, status: 'Active', featured: false, image: '🍳', order: 9 },
  { id: 10, name: 'Appliances', slug: 'appliances', parent: null, products: 98, status: 'Active', featured: false, image: '🔧', order: 10 },
  { id: 11, name: 'Beauty', slug: 'beauty', parent: null, products: 267, status: 'Active', featured: true, image: '💄', order: 11 },
  { id: 12, name: 'Sports', slug: 'sports', parent: null, products: 0, status: 'Inactive', featured: false, image: '⚽', order: 12 },
];

export const brands: Brand[] = [
  { id: 1, name: 'Apple', slug: 'apple', logo: '🍎', products: 45, status: 'Active', featured: true, seller: 'TechWorld' },
  { id: 2, name: 'Samsung', slug: 'samsung', logo: '📱', products: 67, status: 'Active', featured: true, seller: 'ElectroMart' },
  { id: 3, name: 'Nike', slug: 'nike', logo: '✓', products: 89, status: 'Active', featured: true, seller: 'SneakerHub' },
  { id: 4, name: 'Adidas', slug: 'adidas', logo: '△', products: 56, status: 'Active', featured: true, seller: 'SneakerHub' },
  { id: 5, name: 'Sony', slug: 'sony', logo: '🎵', products: 34, status: 'Active', featured: false, seller: 'AudioPro' },
  { id: 6, name: 'Dyson', slug: 'dyson', logo: '🌀', products: 23, status: 'Active', featured: true, seller: 'HomeEssentials' },
  { id: 7, name: 'Bose', slug: 'bose', logo: '🔊', products: 18, status: 'Active', featured: false, seller: 'AudioPro' },
  { id: 8, name: 'Levi\'s', slug: 'levis', logo: '👖', products: 45, status: 'Active', featured: false, seller: 'FashionStore' },
  { id: 9, name: 'KitchenAid', slug: 'kitchenaid', logo: '🍰', products: 28, status: 'Active', featured: false, seller: 'KitchenKing' },
  { id: 10, name: 'Ray-Ban', slug: 'ray-ban', logo: '🕶️', products: 15, status: 'Inactive', featured: false, seller: 'FashionStore' },
];

export const coupons: Coupon[] = [
  { id: 1, code: 'WELCOME20', type: 'Percentage', value: 20, minOrder: 500, maxDiscount: 200, used: 1245, limit: 5000, status: 'Active', validFrom: 'Jan 1, 2026', validTo: 'Dec 31, 2026' },
  { id: 2, code: 'FLAT100', type: 'Fixed', value: 100, minOrder: 999, maxDiscount: null, used: 892, limit: 2000, status: 'Active', validFrom: 'Feb 1, 2026', validTo: 'Jun 30, 2026' },
  { id: 3, code: 'SUMMER15', type: 'Percentage', value: 15, minOrder: 300, maxDiscount: 150, used: 2100, limit: 2000, status: 'Expired', validFrom: 'Jun 1, 2025', validTo: 'Aug 31, 2025' },
  { id: 4, code: 'NEWUSER50', type: 'Fixed', value: 50, minOrder: 250, maxDiscount: null, used: 567, limit: 10000, status: 'Active', validFrom: 'Jan 1, 2026', validTo: 'Dec 31, 2026' },
  { id: 5, code: 'FLASH30', type: 'Percentage', value: 30, minOrder: 1000, maxDiscount: 500, used: 0, limit: 500, status: 'Disabled', validFrom: 'Mar 15, 2026', validTo: 'Mar 15, 2026' },
  { id: 6, code: 'VIP10', type: 'Percentage', value: 10, minOrder: 0, maxDiscount: null, used: 3456, limit: 0, status: 'Active', validFrom: 'Jan 1, 2026', validTo: 'Dec 31, 2026' },
];

export const banners: Banner[] = [
  { id: 1, title: 'Spring Sale 2026', position: 'Hero', image: '🌸', link: '/sale/spring', status: 'Active', clicks: 12450, impressions: 89200, startDate: 'Mar 1, 2026', endDate: 'Apr 30, 2026' },
  { id: 2, title: 'New Arrivals', position: 'Hero', image: '🆕', link: '/new-arrivals', status: 'Active', clicks: 8920, impressions: 67400, startDate: 'Mar 1, 2026', endDate: 'Mar 31, 2026' },
  { id: 3, title: 'Electronics Sale', position: 'Category', image: '⚡', link: '/category/electronics', status: 'Active', clicks: 5670, impressions: 34200, startDate: 'Mar 5, 2026', endDate: 'Mar 20, 2026' },
  { id: 4, title: 'Free Shipping', position: 'Footer', image: '🚚', link: '/offers', status: 'Active', clicks: 2340, impressions: 45600, startDate: 'Jan 1, 2026', endDate: 'Dec 31, 2026' },
  { id: 5, title: 'Summer Collection', position: 'Sidebar', image: '☀️', link: '/collection/summer', status: 'Scheduled', clicks: 0, impressions: 0, startDate: 'Apr 1, 2026', endDate: 'Jun 30, 2026' },
  { id: 6, title: 'Winter Clearance', position: 'Hero', image: '❄️', link: '/sale/winter', status: 'Inactive', clicks: 18920, impressions: 124500, startDate: 'Dec 1, 2025', endDate: 'Feb 28, 2026' },
];

export const flashDeals: FlashDeal[] = [
  { id: 1, title: 'Tech Thursday', products: 24, discount: 40, status: 'Active', startDate: 'Mar 13, 2026 10:00', endDate: 'Mar 13, 2026 22:00', sold: 156, target: 500 },
  { id: 2, title: 'Fashion Friday', products: 56, discount: 50, status: 'Upcoming', startDate: 'Mar 14, 2026 10:00', endDate: 'Mar 14, 2026 22:00', sold: 0, target: 800 },
  { id: 3, title: 'Weekend Blowout', products: 120, discount: 60, status: 'Upcoming', startDate: 'Mar 15, 2026 00:00', endDate: 'Mar 16, 2026 23:59', sold: 0, target: 2000 },
  { id: 4, title: 'Electronics Rush', products: 35, discount: 35, status: 'Expired', startDate: 'Mar 10, 2026 10:00', endDate: 'Mar 10, 2026 22:00', sold: 412, target: 400 },
  { id: 5, title: 'Kitchen Essentials', products: 18, discount: 25, status: 'Expired', startDate: 'Mar 8, 2026 10:00', endDate: 'Mar 8, 2026 22:00', sold: 89, target: 200 },
];

export const pages: Page[] = [
  { id: 1, title: 'About Us', slug: 'about-us', status: 'Published', author: 'Admin User', updatedAt: 'Mar 10, 2026', views: 12450 },
  { id: 2, title: 'Privacy Policy', slug: 'privacy-policy', status: 'Published', author: 'Admin User', updatedAt: 'Feb 15, 2026', views: 8920 },
  { id: 3, title: 'Terms & Conditions', slug: 'terms-conditions', status: 'Published', author: 'Admin User', updatedAt: 'Feb 15, 2026', views: 6780 },
  { id: 4, title: 'Return Policy', slug: 'return-policy', status: 'Published', author: 'Admin User', updatedAt: 'Jan 20, 2026', views: 15230 },
  { id: 5, title: 'FAQ', slug: 'faq', status: 'Published', author: 'Admin User', updatedAt: 'Mar 5, 2026', views: 23450 },
  { id: 6, title: 'Seller Guidelines', slug: 'seller-guidelines', status: 'Draft', author: 'Admin User', updatedAt: 'Mar 12, 2026', views: 0 },
  { id: 7, title: 'Shipping Information', slug: 'shipping-info', status: 'Published', author: 'Admin User', updatedAt: 'Feb 28, 2026', views: 9870 },
  { id: 8, title: 'Contact Us', slug: 'contact-us', status: 'Published', author: 'Admin User', updatedAt: 'Mar 1, 2026', views: 18920 },
];

export const payoutRequests: PayoutRequest[] = [
  { id: 1, seller: 'John Smith', business: 'TechWorld Electronics', amount: 12450.00, status: 'Pending', requestedAt: 'Mar 10, 2026', paidAt: null, method: 'Bank Transfer' },
  { id: 2, seller: 'Priya Sharma', business: 'FashionStore India', amount: 8920.50, status: 'Approved', requestedAt: 'Mar 8, 2026', paidAt: null, method: 'Bank Transfer' },
  { id: 3, seller: 'Alex Turner', business: 'SneakerHub', amount: 5670.00, status: 'Paid', requestedAt: 'Mar 5, 2026', paidAt: 'Mar 7, 2026', method: 'Bank Transfer' },
  { id: 4, seller: 'Wei Chen', business: 'ElectroMart', amount: 15230.80, status: 'Paid', requestedAt: 'Mar 3, 2026', paidAt: 'Mar 5, 2026', method: 'Bank Transfer' },
  { id: 5, seller: 'Ahmed Hassan', business: 'AudioPro', amount: 3450.25, status: 'Pending', requestedAt: 'Mar 11, 2026', paidAt: null, method: 'Bank Transfer' },
  { id: 6, seller: 'Carlos Mendez', business: 'SportZone', amount: 7890.00, status: 'Rejected', requestedAt: 'Mar 6, 2026', paidAt: null, method: 'Bank Transfer' },
  { id: 7, seller: 'Emma Wilson', business: 'BeautyBliss', amount: 4560.30, status: 'Paid', requestedAt: 'Mar 1, 2026', paidAt: 'Mar 3, 2026', method: 'Bank Transfer' },
  { id: 8, seller: 'Lisa Park', business: 'KitchenKing', amount: 2340.00, status: 'Pending', requestedAt: 'Mar 12, 2026', paidAt: null, method: 'Bank Transfer' },
];

export const commissionRules: CommissionRule[] = [
  { id: 1, category: 'Electronics', rate: 8, type: 'Percentage', status: 'Active', minOrder: 0, appliedTo: 456, earned: 42560 },
  { id: 2, category: 'Fashion', rate: 12, type: 'Percentage', status: 'Active', minOrder: 0, appliedTo: 892, earned: 31240 },
  { id: 3, category: 'Footwear', rate: 10, type: 'Percentage', status: 'Active', minOrder: 0, appliedTo: 234, earned: 18920 },
  { id: 4, category: 'Kitchen', rate: 10, type: 'Percentage', status: 'Active', minOrder: 0, appliedTo: 156, earned: 8450 },
  { id: 5, category: 'Appliances', rate: 7, type: 'Percentage', status: 'Active', minOrder: 0, appliedTo: 98, earned: 12340 },
  { id: 6, category: 'Beauty', rate: 15, type: 'Percentage', status: 'Active', minOrder: 0, appliedTo: 267, earned: 14230 },
  { id: 7, category: 'Sports', rate: 10, type: 'Percentage', status: 'Inactive', minOrder: 0, appliedTo: 0, earned: 0 },
  { id: 8, category: 'Default', rate: 10, type: 'Percentage', status: 'Active', minOrder: 0, appliedTo: 145, earned: 5670 },
];

export const roles: Role[] = [
  { id: 1, name: 'Super Admin', slug: 'super-admin', users: 2, permissions: 48, description: 'Full access to all system features', createdAt: 'Jan 1, 2025' },
  { id: 2, name: 'Admin', slug: 'admin', users: 5, permissions: 42, description: 'Administrative access with limited system settings', createdAt: 'Jan 1, 2025' },
  { id: 3, name: 'Manager', slug: 'manager', users: 8, permissions: 28, description: 'Manages products, orders, and customers', createdAt: 'Feb 15, 2025' },
  { id: 4, name: 'Support', slug: 'support', users: 12, permissions: 15, description: 'Customer support and order management', createdAt: 'Mar 10, 2025' },
  { id: 5, name: 'Finance', slug: 'finance', users: 4, permissions: 18, description: 'Revenue, payouts, and commission management', createdAt: 'Apr 1, 2025' },
  { id: 6, name: 'Content', slug: 'content', users: 3, permissions: 10, description: 'Manages pages, banners, and marketing content', createdAt: 'May 20, 2025' },
];

export const recentActivity: ActivityItem[] = [
  { id: 1, type: 'order', message: 'New order #XN-1025 placed by Rahul Verma', time: '2 min ago' },
  { id: 2, type: 'seller', message: 'New seller registration: GadgetWorld by Raj Patel', time: '8 min ago' },
  { id: 3, type: 'product', message: 'Product "Sony WH-1000XM5" stock updated to 210', time: '15 min ago' },
  { id: 4, type: 'payout', message: 'Payout of $5,670 processed to SneakerHub', time: '32 min ago' },
  { id: 5, type: 'review', message: 'New 5-star review on iPhone 15 Pro Max', time: '45 min ago' },
  { id: 6, type: 'customer', message: 'Customer Sophie Lee updated shipping address', time: '1 hour ago' },
  { id: 7, type: 'order', message: 'Order #XN-1022 shipped via Delhivery', time: '1.5 hours ago' },
  { id: 8, type: 'seller', message: 'Seller BeautyBliss passed verification', time: '2 hours ago' },
  { id: 9, type: 'product', message: 'New product listed: Bose QC Ultra by AudioPro', time: '3 hours ago' },
  { id: 10, type: 'order', message: 'Order #XN-1020 marked as delivered', time: '4 hours ago' },
];

export const orderStats = {
  total: 3842,
  pending: 124,
  processing: 286,
  delivered: 3210,
  cancelled: 222,
};

export const sellerStats = {
  total: 342,
  active: 278,
  pendingApproval: 48,
  suspended: 16,
};

export const conversionData = [
  { stage: 'Visitors', value: 125400, percentage: 100 },
  { stage: 'Product Views', value: 84200, percentage: 67.1 },
  { stage: 'Add to Cart', value: 28400, percentage: 22.6 },
  { stage: 'Checkout', value: 12800, percentage: 10.2 },
  { stage: 'Completed', value: 9640, percentage: 7.7 },
];

export const topCategories = [
  { name: 'Electronics', revenue: 186420, percentage: 38.2, color: '#D4AF37' },
  { name: 'Fashion', revenue: 98340, percentage: 20.1, color: '#60a5fa' },
  { name: 'Footwear', revenue: 76800, percentage: 15.7, color: '#34d399' },
  { name: 'Kitchen', revenue: 45200, percentage: 9.3, color: '#c084fc' },
  { name: 'Beauty', revenue: 38900, percentage: 8.0, color: '#fb923c' },
  { name: 'Others', revenue: 42860, percentage: 8.7, color: '#71717a' },
];
