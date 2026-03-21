// ─── Shared helpers ───
let _id = 1000;
function nextId() { return String(++_id); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function money(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }
function dateAgo(daysMax: number) { return new Date(Date.now() - Math.random() * daysMax * 86400000).toISOString(); }
function percent(min: number, max: number) { return +(min + Math.random() * (max - min)).toFixed(1); }

// ─── Products ───
const PRODUCT_NAMES = ['Wireless Earbuds Pro', 'Ultra HD Smart TV 55"', 'Gaming Laptop X1', 'Organic Cotton T-Shirt', 'Stainless Steel Water Bottle', 'Running Shoes Air Max', 'Smart Watch Series 8', 'Bluetooth Speaker Mini', 'Leather Wallet Premium', 'Yoga Mat Pro', 'Electric Kettle 1.5L', 'Noise Cancelling Headphones', 'Portable Power Bank 20K', 'Ceramic Coffee Mug Set', 'Bamboo Cutting Board', 'LED Desk Lamp', 'Fitness Tracker Band', 'Canvas Backpack', 'Protein Powder 1kg', 'Mechanical Keyboard RGB'];
const CATEGORIES = ['Electronics', 'Fashion', 'Home & Kitchen', 'Sports', 'Health & Beauty', 'Books', 'Toys', 'Automotive', 'Grocery', 'Office'];
const BRANDS = ['Samsung', 'Apple', 'Nike', 'Sony', 'Adidas', 'Puma', 'Bosch', 'Philips', 'LG', 'HP', 'Dell', 'Lenovo', 'Reebok', 'Under Armour', 'Bose'];
const STATUSES_PRODUCT = ['Active', 'Draft', 'Out of Stock'];

export function generateProducts(count = 20) {
  return Array.from({ length: count }, (_, i) => ({
    id: nextId(),
    name: PRODUCT_NAMES[i % PRODUCT_NAMES.length] + (i >= PRODUCT_NAMES.length ? ` v${Math.floor(i / PRODUCT_NAMES.length) + 1}` : ''),
    category: pick(CATEGORIES),
    brand: pick(BRANDS),
    price: money(199, 49999),
    stock: Math.floor(Math.random() * 500),
    status: pick(STATUSES_PRODUCT),
    rating: percent(3, 5),
    sales: Math.floor(Math.random() * 2000),
    createdAt: dateAgo(180),
  }));
}

// ─── Categories ───
export function generateCategories() {
  return CATEGORIES.map((name, i) => ({
    id: nextId(),
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    productCount: Math.floor(50 + Math.random() * 500),
    status: i < 8 ? 'Active' : 'Hidden',
    createdAt: dateAgo(365),
  }));
}

// ─── Brands ───
export function generateBrands() {
  return BRANDS.map((name) => ({
    id: nextId(),
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    productCount: Math.floor(10 + Math.random() * 200),
    verified: Math.random() > 0.3,
    logo: null as string | null,
    createdAt: dateAgo(365),
  }));
}

// ─── Orders ───
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const CUSTOMER_NAMES = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh', 'Anita Desai', 'Rajesh Gupta', 'Meera Nair', 'Arjun Mehta', 'Kavita Joshi'];

export function generateOrders(count = 25) {
  return Array.from({ length: count }, () => ({
    id: nextId(),
    orderNumber: `ORD-${1000 + Math.floor(Math.random() * 9000)}`,
    customer: pick(CUSTOMER_NAMES),
    email: pick(CUSTOMER_NAMES).toLowerCase().replace(' ', '.') + '@email.com',
    items: Math.floor(1 + Math.random() * 5),
    total: money(499, 24999),
    status: pick(ORDER_STATUSES),
    paymentMethod: pick(['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'COD']),
    createdAt: dateAgo(60),
  }));
}

// ─── Customers ───
export function generateCustomers(count = 20) {
  return Array.from({ length: count }, (_, i) => ({
    id: nextId(),
    name: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length] + (i >= CUSTOMER_NAMES.length ? ` ${i}` : ''),
    email: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length].toLowerCase().replace(' ', '.') + `${i > 9 ? i : ''}@email.com`,
    phone: `+91 ${9000000000 + Math.floor(Math.random() * 999999999)}`,
    orders: Math.floor(Math.random() * 30),
    totalSpent: money(0, 100000),
    status: pick(['Active', 'Inactive', 'Blocked']),
    joinedAt: dateAgo(365),
  }));
}

// ─── Sellers ───
const STORE_NAMES = ['TechZone', 'FashionHub', 'HomeEssentials', 'SportyGear', 'GadgetWorld', 'StyleStreet', 'KitchenKing', 'BookNook', 'FitLife', 'GreenMart'];

export function generateSellers(count = 15) {
  return Array.from({ length: count }, (_, i) => ({
    id: nextId(),
    storeName: STORE_NAMES[i % STORE_NAMES.length] + (i >= STORE_NAMES.length ? ` ${i}` : ''),
    ownerName: pick(CUSTOMER_NAMES),
    email: STORE_NAMES[i % STORE_NAMES.length].toLowerCase() + '@store.com',
    products: Math.floor(10 + Math.random() * 200),
    totalSales: money(10000, 500000),
    commission: percent(5, 20),
    verified: Math.random() > 0.25,
    status: pick(['Active', 'Pending', 'Suspended']),
    joinedAt: dateAgo(365),
  }));
}

// ─── Banners ───
export function generateBanners(count = 8) {
  const titles = ['Summer Sale', 'New Arrivals', 'Electronics Fest', 'Fashion Week', 'Flash Friday', 'Diwali Deals', 'Clearance', 'Top Picks'];
  return Array.from({ length: count }, (_, i) => ({
    id: nextId(),
    title: titles[i % titles.length],
    subtitle: 'Up to ' + (20 + i * 10) + '% off',
    position: pick(['Hero', 'Category', 'Footer', 'Sidebar']),
    isActive: Math.random() > 0.3,
    clicks: Math.floor(Math.random() * 10000),
    sortOrder: i + 1,
    startDate: dateAgo(30),
    endDate: new Date(Date.now() + Math.random() * 30 * 86400000).toISOString(),
  }));
}

// ─── Flash Deals ───
export function generateFlashDeals(count = 10) {
  return Array.from({ length: count }, () => ({
    id: nextId(),
    title: pick(['Lightning Sale', 'Deal of the Day', 'Happy Hours', 'Mega Discount', 'Weekend Special']),
    discount: Math.floor(10 + Math.random() * 60) + '%',
    products: Math.floor(5 + Math.random() * 50),
    sold: Math.floor(Math.random() * 200),
    status: pick(['Active', 'Scheduled', 'Expired']),
    startsAt: dateAgo(7),
    endsAt: new Date(Date.now() + Math.random() * 7 * 86400000).toISOString(),
  }));
}

// ─── Coupons ───
export function generateCoupons(count = 12) {
  const codes = ['SAVE10', 'FLAT200', 'WELCOME50', 'DIWALI30', 'NEWYEAR20', 'SUMMER15', 'FIRST100', 'MEGA500', 'FLASH25', 'VIP40', 'LOYAL10', 'FREE99'];
  return Array.from({ length: count }, (_, i) => ({
    id: nextId(),
    code: codes[i % codes.length],
    type: pick(['Percentage', 'Flat']) as 'Percentage' | 'Flat',
    value: pick([10, 15, 20, 25, 30, 50, 100, 200, 500]),
    minOrder: money(0, 2000),
    maxDiscount: money(100, 1000),
    usageCount: Math.floor(Math.random() * 500),
    usageLimit: Math.floor(100 + Math.random() * 900),
    status: pick(['Active', 'Expired', 'Disabled']),
    validUntil: new Date(Date.now() + Math.random() * 90 * 86400000).toISOString(),
  }));
}

// ─── Revenue ───
export function generateRevenueData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    totalRevenue: money(5000000, 15000000),
    totalOrders: Math.floor(5000 + Math.random() * 15000),
    avgOrderValue: money(800, 3000),
    refunds: money(50000, 500000),
    monthly: months.map(name => ({
      name,
      revenue: money(300000, 1500000),
      orders: Math.floor(400 + Math.random() * 1200),
      refunds: money(5000, 50000),
    })),
    byCategory: CATEGORIES.slice(0, 6).map(name => ({
      name,
      revenue: money(200000, 2000000),
    })),
    byPayment: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'COD'].map(name => ({
      name,
      revenue: money(500000, 3000000),
      count: Math.floor(500 + Math.random() * 3000),
    })),
  };
}

// ─── Commission ───
export function generateCommissionRules() {
  return CATEGORIES.map(cat => ({
    id: nextId(),
    category: cat,
    rate: percent(5, 25),
    flatFee: money(0, 50),
    minCommission: money(10, 100),
    sellers: Math.floor(5 + Math.random() * 30),
    status: pick(['Active', 'Inactive']),
  }));
}

// ─── Payouts ───
export function generatePayouts(count = 15) {
  return Array.from({ length: count }, () => ({
    id: nextId(),
    seller: pick(STORE_NAMES),
    amount: money(5000, 100000),
    method: pick(['Bank Transfer', 'UPI', 'PayPal']),
    status: pick(['Completed', 'Pending', 'Processing', 'Failed']),
    reference: 'PAY-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    requestedAt: dateAgo(30),
    processedAt: Math.random() > 0.3 ? dateAgo(15) : null,
  }));
}

// ─── CMS Pages ───
export function generateCmsPages() {
  const pages = [
    { title: 'About Us', slug: 'about' },
    { title: 'FAQ', slug: 'faq' },
    { title: 'Terms & Conditions', slug: 'terms' },
    { title: 'Privacy Policy', slug: 'privacy' },
    { title: 'Return Policy', slug: 'returns' },
    { title: 'Shipping Info', slug: 'shipping' },
    { title: 'Contact Us', slug: 'contact' },
    { title: 'Careers', slug: 'careers' },
  ];
  return pages.map(p => ({
    id: nextId(),
    title: p.title,
    slug: p.slug,
    status: pick(['Published', 'Draft']),
    updatedAt: dateAgo(90),
  }));
}

// ─── Roles ───
export function generateRoles() {
  const roles = [
    { name: 'Super Admin', permissions: 'Full access', users: 2 },
    { name: 'Admin', permissions: 'All except settings', users: 3 },
    { name: 'Manager', permissions: 'Products, Orders, Customers', users: 5 },
    { name: 'Support', permissions: 'Orders, Customers (read-only)', users: 8 },
    { name: 'Finance', permissions: 'Revenue, Payouts, Commission', users: 2 },
    { name: 'Content', permissions: 'CMS Pages, Banners', users: 3 },
  ];
  return roles.map(r => ({
    id: nextId(),
    name: r.name,
    permissions: r.permissions,
    users: r.users,
    isSystem: r.name === 'Super Admin',
    createdAt: dateAgo(365),
  }));
}

// ─── Settings ───
export function generateSettings() {
  return {
    general: {
      siteName: 'Xelnova',
      tagline: 'Your one-stop marketplace',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      language: 'en',
    },
    tax: {
      gstEnabled: true,
      gstRate: 18,
      hsnDefault: '8471',
    },
    shipping: {
      freeShippingMin: 499,
      defaultRate: 49,
      expressRate: 99,
      codEnabled: true,
      codFee: 29,
    },
    payment: {
      razorpayEnabled: true,
      codEnabled: true,
      upiEnabled: true,
      cardEnabled: true,
      netBankingEnabled: true,
    },
    notifications: {
      orderConfirmation: true,
      shipmentUpdate: true,
      promotionalEmails: false,
      smsAlerts: true,
      adminNewOrder: true,
    },
  };
}
