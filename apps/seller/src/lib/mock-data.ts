export interface SellerProfile {
  id: string;
  name: string;
  storeName: string;
  email: string;
  phone: string;
  avatar: string;
  rating: number;
  totalProducts: number;
  totalOrders: number;
  memberSince: string;
  verified: boolean;
  gstNumber: string;
}

export interface Product {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number;
  category: string;
  brand: string;
  image: string;
  stock: number;
  sku: string;
  status: "Active" | "Pending Approval" | "Draft" | "Out of Stock";
  rating: number;
  reviewCount: number;
  unitsSold: number;
  revenue: number;
  createdAt: string;
}

export interface Order {
  id: string;
  subOrderId: string;
  customer: string;
  customerEmail: string;
  product: string;
  productImage: string;
  quantity: number;
  amount: number;
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Returned";
  date: string;
  paymentMethod: string;
  shippingAddress: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: "Sale" | "Commission" | "Payout" | "Refund" | "Adjustment";
  orderId: string | null;
  amount: number;
  balance: number;
  description: string;
}

export interface DashboardStats {
  todaySales: number;
  ordersToday: number;
  totalProducts: number;
  averageRating: number;
  pendingOrders: number;
  totalRevenue: number;
  monthlyGrowth: number;
}

export interface RevenueData {
  day: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsData {
  monthlySales: { month: string; sales: number; orders: number }[];
  categoryBreakdown: { category: string; sales: number; percentage: number }[];
  conversionRate: number;
  avgOrderValue: number;
  returnRate: number;
  topSearchTerms: { term: string; count: number; conversion: number }[];
}

export const sellerProfile: SellerProfile = {
  id: "SLR-001",
  name: "Rajesh Kumar",
  storeName: "TechWorld Electronics",
  email: "rajesh@techworldelectronics.in",
  phone: "+91 98765 43210",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=RK&backgroundColor=f59e0b",
  rating: 4.6,
  totalProducts: 142,
  totalOrders: 3847,
  memberSince: "2023-03-15",
  verified: true,
  gstNumber: "27AABCU9603R1ZM",
};

export const products: Product[] = [
  {
    id: "PRD-001",
    name: "boAt Rockerz 450 Wireless Headphone",
    shortDescription: "Bluetooth wireless headphones with 40mm drivers",
    description: "Experience immersive sound with boAt Rockerz 450 featuring 40mm dynamic drivers, Bluetooth v5.0, and up to 15 hours of playback time.",
    price: 1499,
    compareAtPrice: 2990,
    costPrice: 850,
    category: "Audio",
    brand: "boAt",
    image: "https://placehold.co/400x400/f59e0b/ffffff?text=Headphone",
    stock: 234,
    sku: "BOAT-RZ450-BLK",
    status: "Active",
    rating: 4.3,
    reviewCount: 1247,
    unitsSold: 892,
    revenue: 1337508,
    createdAt: "2024-01-15",
  },
  {
    id: "PRD-002",
    name: "Samsung Galaxy M14 5G (6GB/128GB)",
    shortDescription: "5G smartphone with 50MP triple camera",
    description: "Samsung Galaxy M14 5G powered by Exynos 1330 processor with 6000mAh battery and 50MP triple camera setup.",
    price: 13490,
    compareAtPrice: 16999,
    costPrice: 10200,
    category: "Smartphones",
    brand: "Samsung",
    image: "https://placehold.co/400x400/1e293b/ffffff?text=Phone",
    stock: 56,
    sku: "SAM-M14-128",
    status: "Active",
    rating: 4.1,
    reviewCount: 834,
    unitsSold: 423,
    revenue: 5706270,
    createdAt: "2024-02-20",
  },
  {
    id: "PRD-003",
    name: "Noise ColorFit Pro 4 Smartwatch",
    shortDescription: "1.72\" AMOLED display with Bluetooth calling",
    description: "Noise ColorFit Pro 4 with 1.72 inch AMOLED display, Bluetooth calling, heart rate monitoring, and 7-day battery life.",
    price: 3999,
    compareAtPrice: 6999,
    costPrice: 2100,
    category: "Wearables",
    brand: "Noise",
    image: "https://placehold.co/400x400/10b981/ffffff?text=Watch",
    stock: 178,
    sku: "NSE-CFP4-BLK",
    status: "Active",
    rating: 4.2,
    reviewCount: 562,
    unitsSold: 651,
    revenue: 2603349,
    createdAt: "2024-03-10",
  },
  {
    id: "PRD-004",
    name: "JBL Flip 6 Portable Speaker",
    shortDescription: "Waterproof Bluetooth speaker with bold sound",
    description: "JBL Flip 6 delivers powerful JBL Original Pro Sound with IP67 waterproof and dustproof rating, 12 hours of playtime.",
    price: 11999,
    compareAtPrice: 14999,
    costPrice: 8500,
    category: "Audio",
    brand: "JBL",
    image: "https://placehold.co/400x400/3b82f6/ffffff?text=Speaker",
    stock: 0,
    sku: "JBL-FLIP6-BLU",
    status: "Out of Stock",
    rating: 4.5,
    reviewCount: 389,
    unitsSold: 234,
    revenue: 2807766,
    createdAt: "2024-01-25",
  },
  {
    id: "PRD-005",
    name: "Lenovo IdeaPad Slim 3 Laptop",
    shortDescription: "15.6\" FHD, Ryzen 5, 8GB RAM, 512GB SSD",
    description: "Lenovo IdeaPad Slim 3 with AMD Ryzen 5 7520U, 15.6 inch FHD display, 8GB RAM, 512GB SSD, Windows 11.",
    price: 42990,
    compareAtPrice: 54890,
    costPrice: 35000,
    category: "Laptops",
    brand: "Lenovo",
    image: "https://placehold.co/400x400/6366f1/ffffff?text=Laptop",
    stock: 23,
    sku: "LEN-IPS3-R5",
    status: "Active",
    rating: 4.4,
    reviewCount: 218,
    unitsSold: 87,
    revenue: 3740130,
    createdAt: "2024-04-05",
  },
  {
    id: "PRD-006",
    name: "Mi Power Bank 3i 20000mAh",
    shortDescription: "20000mAh with 18W fast charging",
    description: "Xiaomi Mi Power Bank 3i with 20000mAh capacity, 18W fast charging support, dual USB output, Type-C input.",
    price: 1599,
    compareAtPrice: 1999,
    costPrice: 950,
    category: "Accessories",
    brand: "Xiaomi",
    image: "https://placehold.co/400x400/ef4444/ffffff?text=PowerBank",
    stock: 412,
    sku: "MI-PB3I-20K",
    status: "Active",
    rating: 4.3,
    reviewCount: 2103,
    unitsSold: 1456,
    revenue: 2327544,
    createdAt: "2024-02-10",
  },
  {
    id: "PRD-007",
    name: "OnePlus Nord Buds 2 TWS Earbuds",
    shortDescription: "12.4mm drivers with ANC",
    description: "OnePlus Nord Buds 2 with 12.4mm titanium drivers, up to 25dB ANC, 36-hour total battery, IP55 rating.",
    price: 2999,
    compareAtPrice: 3499,
    costPrice: 1800,
    category: "Audio",
    brand: "OnePlus",
    image: "https://placehold.co/400x400/d97706/ffffff?text=Earbuds",
    stock: 89,
    sku: "OP-NB2-GRY",
    status: "Pending Approval",
    rating: 4.1,
    reviewCount: 445,
    unitsSold: 312,
    revenue: 935688,
    createdAt: "2024-05-01",
  },
  {
    id: "PRD-008",
    name: "Ambrane 65W GaN Charger",
    shortDescription: "Ultra-compact 65W GaN fast charger",
    description: "Ambrane 65W GaN charger with USB-C PD 3.0, compact design, universal compatibility for laptops and phones.",
    price: 1799,
    compareAtPrice: null,
    costPrice: 1050,
    category: "Accessories",
    brand: "Ambrane",
    image: "https://placehold.co/400x400/78350f/ffffff?text=Charger",
    stock: 67,
    sku: "AMB-GAN65-WHT",
    status: "Draft",
    rating: 0,
    reviewCount: 0,
    unitsSold: 0,
    revenue: 0,
    createdAt: "2025-03-08",
  },
];

export const orders: Order[] = [
  {
    id: "ORD-10234",
    subOrderId: "SO-10234-A",
    customer: "Priya Sharma",
    customerEmail: "priya.sharma@gmail.com",
    product: "boAt Rockerz 450 Wireless Headphone",
    productImage: "https://placehold.co/60x60/f59e0b/ffffff?text=H",
    quantity: 1,
    amount: 1499,
    status: "Delivered",
    date: "2025-03-09",
    paymentMethod: "UPI",
    shippingAddress: "Mumbai, Maharashtra",
  },
  {
    id: "ORD-10235",
    subOrderId: "SO-10235-A",
    customer: "Amit Patel",
    customerEmail: "amit.patel@outlook.com",
    product: "Samsung Galaxy M14 5G (6GB/128GB)",
    productImage: "https://placehold.co/60x60/1e293b/ffffff?text=P",
    quantity: 1,
    amount: 13490,
    status: "Shipped",
    date: "2025-03-09",
    paymentMethod: "Credit Card",
    shippingAddress: "Ahmedabad, Gujarat",
  },
  {
    id: "ORD-10236",
    subOrderId: "SO-10236-A",
    customer: "Sneha Reddy",
    customerEmail: "sneha.r@yahoo.com",
    product: "Noise ColorFit Pro 4 Smartwatch",
    productImage: "https://placehold.co/60x60/10b981/ffffff?text=W",
    quantity: 2,
    amount: 7998,
    status: "Processing",
    date: "2025-03-10",
    paymentMethod: "Debit Card",
    shippingAddress: "Hyderabad, Telangana",
  },
  {
    id: "ORD-10237",
    subOrderId: "SO-10237-A",
    customer: "Vikram Singh",
    customerEmail: "vikram.singh@gmail.com",
    product: "Lenovo IdeaPad Slim 3 Laptop",
    productImage: "https://placehold.co/60x60/6366f1/ffffff?text=L",
    quantity: 1,
    amount: 42990,
    status: "Pending",
    date: "2025-03-10",
    paymentMethod: "EMI",
    shippingAddress: "Delhi, NCR",
  },
  {
    id: "ORD-10238",
    subOrderId: "SO-10238-A",
    customer: "Meera Joshi",
    customerEmail: "meera.j@gmail.com",
    product: "Mi Power Bank 3i 20000mAh",
    productImage: "https://placehold.co/60x60/ef4444/ffffff?text=B",
    quantity: 3,
    amount: 4797,
    status: "Pending",
    date: "2025-03-10",
    paymentMethod: "UPI",
    shippingAddress: "Pune, Maharashtra",
  },
  {
    id: "ORD-10239",
    subOrderId: "SO-10239-A",
    customer: "Arjun Nair",
    customerEmail: "arjun.nair@gmail.com",
    product: "boAt Rockerz 450 Wireless Headphone",
    productImage: "https://placehold.co/60x60/f59e0b/ffffff?text=H",
    quantity: 1,
    amount: 1499,
    status: "Shipped",
    date: "2025-03-08",
    paymentMethod: "Net Banking",
    shippingAddress: "Kochi, Kerala",
  },
  {
    id: "ORD-10240",
    subOrderId: "SO-10240-A",
    customer: "Ananya Gupta",
    customerEmail: "ananya.g@outlook.com",
    product: "OnePlus Nord Buds 2 TWS Earbuds",
    productImage: "https://placehold.co/60x60/d97706/ffffff?text=E",
    quantity: 1,
    amount: 2999,
    status: "Delivered",
    date: "2025-03-07",
    paymentMethod: "UPI",
    shippingAddress: "Lucknow, Uttar Pradesh",
  },
  {
    id: "ORD-10241",
    subOrderId: "SO-10241-A",
    customer: "Rahul Mehta",
    customerEmail: "rahul.mehta@gmail.com",
    product: "Samsung Galaxy M14 5G (6GB/128GB)",
    productImage: "https://placehold.co/60x60/1e293b/ffffff?text=P",
    quantity: 1,
    amount: 13490,
    status: "Processing",
    date: "2025-03-09",
    paymentMethod: "Credit Card",
    shippingAddress: "Bengaluru, Karnataka",
  },
  {
    id: "ORD-10242",
    subOrderId: "SO-10242-A",
    customer: "Kavita Rao",
    customerEmail: "kavita.rao@yahoo.com",
    product: "Noise ColorFit Pro 4 Smartwatch",
    productImage: "https://placehold.co/60x60/10b981/ffffff?text=W",
    quantity: 1,
    amount: 3999,
    status: "Cancelled",
    date: "2025-03-06",
    paymentMethod: "UPI",
    shippingAddress: "Chennai, Tamil Nadu",
  },
  {
    id: "ORD-10243",
    subOrderId: "SO-10243-A",
    customer: "Deepak Verma",
    customerEmail: "deepak.v@gmail.com",
    product: "Mi Power Bank 3i 20000mAh",
    productImage: "https://placehold.co/60x60/ef4444/ffffff?text=B",
    quantity: 2,
    amount: 3198,
    status: "Delivered",
    date: "2025-03-05",
    paymentMethod: "Debit Card",
    shippingAddress: "Jaipur, Rajasthan",
  },
];

export const revenueChartData: RevenueData[] = [
  { day: "Mon", revenue: 24500, orders: 12 },
  { day: "Tue", revenue: 31200, orders: 18 },
  { day: "Wed", revenue: 28700, orders: 15 },
  { day: "Thu", revenue: 42300, orders: 24 },
  { day: "Fri", revenue: 38900, orders: 21 },
  { day: "Sat", revenue: 52100, orders: 32 },
  { day: "Sun", revenue: 47600, orders: 28 },
];

export const dashboardStats: DashboardStats = {
  todaySales: 67785,
  ordersToday: 14,
  totalProducts: 142,
  averageRating: 4.3,
  pendingOrders: 8,
  totalRevenue: 19458255,
  monthlyGrowth: 12.5,
};

export const transactions: Transaction[] = [
  { id: "TXN-001", date: "2025-03-10", type: "Sale", orderId: "ORD-10236", amount: 7998, balance: 284532, description: "Order payment received" },
  { id: "TXN-002", date: "2025-03-10", type: "Sale", orderId: "ORD-10237", amount: 42990, balance: 276534, description: "Order payment received" },
  { id: "TXN-003", date: "2025-03-09", type: "Commission", orderId: "ORD-10234", amount: -224.85, balance: 233544, description: "Platform commission (15%)" },
  { id: "TXN-004", date: "2025-03-09", type: "Sale", orderId: "ORD-10234", amount: 1499, balance: 233768.85, description: "Order payment received" },
  { id: "TXN-005", date: "2025-03-09", type: "Sale", orderId: "ORD-10235", amount: 13490, balance: 232269.85, description: "Order payment received" },
  { id: "TXN-006", date: "2025-03-08", type: "Commission", orderId: "ORD-10239", amount: -224.85, balance: 218779.85, description: "Platform commission (15%)" },
  { id: "TXN-007", date: "2025-03-08", type: "Payout", orderId: null, amount: -150000, balance: 219004.70, description: "Bank transfer - HDFC ****4521" },
  { id: "TXN-008", date: "2025-03-07", type: "Sale", orderId: "ORD-10240", amount: 2999, balance: 369004.70, description: "Order payment received" },
  { id: "TXN-009", date: "2025-03-06", type: "Refund", orderId: "ORD-10242", amount: -3999, balance: 366005.70, description: "Order cancelled - refund processed" },
  { id: "TXN-010", date: "2025-03-05", type: "Sale", orderId: "ORD-10243", amount: 3198, balance: 370004.70, description: "Order payment received" },
];

export const revenueStats = {
  availableBalance: 284532,
  totalEarned: 1945825,
  commissionDeducted: 291874,
  netRevenue: 1653951,
  totalPayouts: 1369419,
};

export const analyticsData: AnalyticsData = {
  monthlySales: [
    { month: "Sep", sales: 245000, orders: 156 },
    { month: "Oct", sales: 312000, orders: 198 },
    { month: "Nov", sales: 478000, orders: 312 },
    { month: "Dec", sales: 523000, orders: 367 },
    { month: "Jan", sales: 389000, orders: 245 },
    { month: "Feb", sales: 412000, orders: 278 },
    { month: "Mar", sales: 265300, orders: 150 },
  ],
  categoryBreakdown: [
    { category: "Smartphones", sales: 5706270, percentage: 35.2 },
    { category: "Audio", sales: 5080962, percentage: 31.3 },
    { category: "Wearables", sales: 2603349, percentage: 16.1 },
    { category: "Laptops", sales: 3740130, percentage: 12.4 },
    { category: "Accessories", sales: 2327544, percentage: 5.0 },
  ],
  conversionRate: 3.8,
  avgOrderValue: 5056,
  returnRate: 2.1,
  topSearchTerms: [
    { term: "wireless headphones", count: 1245, conversion: 4.2 },
    { term: "samsung phone under 15000", count: 987, conversion: 3.1 },
    { term: "smartwatch", count: 876, conversion: 3.8 },
    { term: "power bank 20000mah", count: 654, conversion: 5.1 },
    { term: "bluetooth speaker waterproof", count: 543, conversion: 2.9 },
  ],
};

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRDecimal(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
