import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Clean existing data ───
  console.log("🧹 Cleaning existing data...");
  await prisma.wishlist.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Cleaned\n");

  // ─── Users ───
  console.log("👤 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const customerUser = await prisma.user.create({
    data: {
      id: "user-1",
      name: "Rahul Sharma",
      email: "rahul.sharma@example.com",
      phone: "+91-9876543210",
      password: hashedPassword,
      avatar: "/images/users/rahul.jpg",
      role: "CUSTOMER",
      createdAt: new Date("2023-06-15"),
    },
  });

  const sellerUser1 = await prisma.user.create({
    data: {
      id: "seller-user-1",
      name: "TechHub India",
      email: "techhub@example.com",
      phone: "+91-9000000001",
      password: hashedPassword,
      role: "SELLER",
    },
  });
  const sellerUser2 = await prisma.user.create({
    data: {
      id: "seller-user-2",
      name: "FashionVista",
      email: "fashionvista@example.com",
      phone: "+91-9000000002",
      password: hashedPassword,
      role: "SELLER",
    },
  });
  const sellerUser3 = await prisma.user.create({
    data: {
      id: "seller-user-3",
      name: "HomeEssentials",
      email: "homeessentials@example.com",
      phone: "+91-9000000003",
      password: hashedPassword,
      role: "SELLER",
    },
  });
  const sellerUser4 = await prisma.user.create({
    data: {
      id: "seller-user-4",
      name: "GlowUp Beauty",
      email: "glowup@example.com",
      phone: "+91-9000000004",
      password: hashedPassword,
      role: "SELLER",
    },
  });
  const sellerUser5 = await prisma.user.create({
    data: {
      id: "seller-user-5",
      name: "SportZone",
      email: "sportzone@example.com",
      phone: "+91-9000000005",
      password: hashedPassword,
      role: "SELLER",
    },
  });
  const sellerUser6 = await prisma.user.create({
    data: {
      id: "seller-user-6",
      name: "BookWorld",
      email: "bookworld@example.com",
      phone: "+91-9000000006",
      password: hashedPassword,
      role: "SELLER",
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      id: "admin-user-1",
      name: "Admin",
      email: "admin@xelnova.in",
      phone: "+91-9000000099",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ 8 users created\n");

  // ─── Addresses ───
  console.log("📍 Creating addresses...");
  await prisma.address.createMany({
    data: [
      {
        userId: "user-1",
        fullName: "Rahul Sharma",
        phone: "+91-9876543210",
        addressLine1: "42, Park Street",
        addressLine2: "Sector 15",
        city: "Gurugram",
        state: "Haryana",
        pincode: "122001",
        type: "HOME",
        isDefault: true,
      },
      {
        userId: "user-1",
        fullName: "Rahul Sharma",
        phone: "+91-9876543210",
        addressLine1: "5th Floor, Tower B, DLF Cyber City",
        addressLine2: "Phase 2",
        city: "Gurugram",
        state: "Haryana",
        pincode: "122002",
        type: "OFFICE",
      },
    ],
  });
  console.log("✅ 2 addresses created\n");

  // ─── Seller Profiles ───
  console.log("🏪 Creating seller profiles...");
  const sellers = await Promise.all([
    prisma.sellerProfile.create({
      data: {
        id: "seller-1",
        userId: "seller-user-1",
        storeName: "TechHub India",
        slug: "techhub-india",
        logo: "/images/sellers/techhub.png",
        description:
          "Leading electronics retailer with genuine products and fast delivery across India.",
        rating: 4.6,
        totalSales: 18500,
        verified: true,
        location: "Mumbai, Maharashtra",
        createdAt: new Date("2022-03-15"),
      },
    }),
    prisma.sellerProfile.create({
      data: {
        id: "seller-2",
        userId: "seller-user-2",
        storeName: "FashionVista",
        slug: "fashionvista",
        logo: "/images/sellers/fashionvista.png",
        description:
          "Premium fashion brand offering trendy and affordable clothing for men and women.",
        rating: 4.4,
        totalSales: 32000,
        verified: true,
        location: "Delhi, NCR",
        createdAt: new Date("2021-08-20"),
      },
    }),
    prisma.sellerProfile.create({
      data: {
        id: "seller-3",
        userId: "seller-user-3",
        storeName: "HomeEssentials",
        slug: "homeessentials",
        logo: "/images/sellers/homeessentials.png",
        description:
          "Your one-stop shop for premium home and kitchen products.",
        rating: 4.3,
        totalSales: 14200,
        verified: true,
        location: "Bengaluru, Karnataka",
        createdAt: new Date("2022-01-10"),
      },
    }),
    prisma.sellerProfile.create({
      data: {
        id: "seller-4",
        userId: "seller-user-4",
        storeName: "GlowUp Beauty",
        slug: "glowup-beauty",
        logo: "/images/sellers/glowup.png",
        description:
          "Authentic beauty and skincare products from top international and Indian brands.",
        rating: 4.5,
        totalSales: 9800,
        verified: true,
        location: "Hyderabad, Telangana",
        createdAt: new Date("2022-06-05"),
      },
    }),
    prisma.sellerProfile.create({
      data: {
        id: "seller-5",
        userId: "seller-user-5",
        storeName: "SportZone",
        slug: "sportzone",
        logo: "/images/sellers/sportzone.png",
        description: "Sports equipment and fitness gear for every athlete.",
        rating: 4.2,
        totalSales: 7500,
        verified: true,
        location: "Pune, Maharashtra",
        createdAt: new Date("2023-02-14"),
      },
    }),
    prisma.sellerProfile.create({
      data: {
        id: "seller-6",
        userId: "seller-user-6",
        storeName: "BookWorld",
        slug: "bookworld",
        logo: "/images/sellers/bookworld.png",
        description: "India's largest online bookstore with millions of titles.",
        rating: 4.7,
        totalSales: 45000,
        verified: true,
        location: "Chennai, Tamil Nadu",
        createdAt: new Date("2020-11-01"),
      },
    }),
  ]);
  console.log("✅ 6 seller profiles created\n");

  // ─── Categories ───
  console.log("📂 Creating categories...");

  type SubcategoryData = {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    productCount: number;
  };

  const categoryTree: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    productCount: number;
    children: SubcategoryData[];
  }[] = [
    {
      id: "cat-1",
      name: "Electronics",
      slug: "electronics",
      description: "Latest gadgets, smartphones, laptops, and accessories",
      image: "/images/categories/electronics.jpg",
      productCount: 450,
      children: [
        { id: "cat-1-1", name: "Smartphones", slug: "smartphones", description: "Latest smartphones", image: "/images/categories/smartphones.jpg", productCount: 120 },
        { id: "cat-1-2", name: "Laptops", slug: "laptops", description: "Laptops & Notebooks", image: "/images/categories/laptops.jpg", productCount: 85 },
        { id: "cat-1-3", name: "Audio", slug: "audio", description: "Headphones, Speakers & Earbuds", image: "/images/categories/audio.jpg", productCount: 95 },
        { id: "cat-1-4", name: "Wearables", slug: "wearables", description: "Smartwatches & Fitness Bands", image: "/images/categories/wearables.jpg", productCount: 60 },
        { id: "cat-1-5", name: "Cameras", slug: "cameras", description: "Cameras & Photography", image: "/images/categories/cameras.jpg", productCount: 45 },
        { id: "cat-1-6", name: "Accessories", slug: "electronics-accessories", description: "Phone cases, chargers, cables", image: "/images/categories/accessories.jpg", productCount: 45 },
      ],
    },
    {
      id: "cat-2",
      name: "Fashion",
      slug: "fashion",
      description: "Clothing, footwear, and accessories for men and women",
      image: "/images/categories/fashion.jpg",
      productCount: 820,
      children: [
        { id: "cat-2-1", name: "Men's Clothing", slug: "mens-clothing", description: "Men's fashion", image: "/images/categories/mens-clothing.jpg", productCount: 250 },
        { id: "cat-2-2", name: "Women's Clothing", slug: "womens-clothing", description: "Women's fashion", image: "/images/categories/womens-clothing.jpg", productCount: 310 },
        { id: "cat-2-3", name: "Footwear", slug: "footwear", description: "Shoes, sandals & more", image: "/images/categories/footwear.jpg", productCount: 140 },
        { id: "cat-2-4", name: "Watches", slug: "watches", description: "Watches for men & women", image: "/images/categories/watches.jpg", productCount: 80 },
        { id: "cat-2-5", name: "Jewellery", slug: "jewellery", description: "Fashion & fine jewellery", image: "/images/categories/jewellery.jpg", productCount: 40 },
      ],
    },
    {
      id: "cat-3",
      name: "Home & Kitchen",
      slug: "home-kitchen",
      description: "Furniture, decor, kitchen appliances, and more",
      image: "/images/categories/home-kitchen.jpg",
      productCount: 560,
      children: [
        { id: "cat-3-1", name: "Furniture", slug: "furniture", description: "Beds, sofas, tables & chairs", image: "/images/categories/furniture.jpg", productCount: 180 },
        { id: "cat-3-2", name: "Kitchen Appliances", slug: "kitchen-appliances", description: "Mixers, ovens, cookers", image: "/images/categories/kitchen-appliances.jpg", productCount: 140 },
        { id: "cat-3-3", name: "Home Decor", slug: "home-decor", description: "Decor, lighting, furnishing", image: "/images/categories/home-decor.jpg", productCount: 120 },
        { id: "cat-3-4", name: "Storage & Organisation", slug: "storage-organisation", description: "Organisers, racks & shelves", image: "/images/categories/storage.jpg", productCount: 120 },
      ],
    },
    {
      id: "cat-4",
      name: "Beauty & Personal Care",
      slug: "beauty",
      description: "Skincare, makeup, haircare, and grooming essentials",
      image: "/images/categories/beauty.jpg",
      productCount: 320,
      children: [
        { id: "cat-4-1", name: "Skincare", slug: "skincare", description: "Face wash, moisturizers, serums", image: "/images/categories/skincare.jpg", productCount: 95 },
        { id: "cat-4-2", name: "Makeup", slug: "makeup", description: "Lipstick, foundation, eyeshadow", image: "/images/categories/makeup.jpg", productCount: 110 },
        { id: "cat-4-3", name: "Haircare", slug: "haircare", description: "Shampoo, conditioner, oils", image: "/images/categories/haircare.jpg", productCount: 70 },
        { id: "cat-4-4", name: "Men's Grooming", slug: "mens-grooming", description: "Trimmers, shaving, perfumes", image: "/images/categories/mens-grooming.jpg", productCount: 45 },
      ],
    },
    {
      id: "cat-5",
      name: "Sports & Fitness",
      slug: "sports",
      description: "Sports equipment, fitness gear, and activewear",
      image: "/images/categories/sports.jpg",
      productCount: 240,
      children: [
        { id: "cat-5-1", name: "Cricket", slug: "cricket", description: "Bats, balls, pads & more", image: "/images/categories/cricket.jpg", productCount: 60 },
        { id: "cat-5-2", name: "Fitness Equipment", slug: "fitness-equipment", description: "Dumbbells, treadmills, mats", image: "/images/categories/fitness.jpg", productCount: 80 },
        { id: "cat-5-3", name: "Activewear", slug: "activewear", description: "Workout clothes & shoes", image: "/images/categories/activewear.jpg", productCount: 100 },
      ],
    },
    {
      id: "cat-6",
      name: "Books",
      slug: "books",
      description: "Fiction, non-fiction, academic, and kids books",
      image: "/images/categories/books.jpg",
      productCount: 900,
      children: [
        { id: "cat-6-1", name: "Fiction", slug: "fiction", description: "Novels, short stories, thrillers", image: "/images/categories/fiction.jpg", productCount: 350 },
        { id: "cat-6-2", name: "Non-Fiction", slug: "non-fiction", description: "Self-help, biographies, business", image: "/images/categories/non-fiction.jpg", productCount: 280 },
        { id: "cat-6-3", name: "Academic", slug: "academic", description: "Textbooks & reference", image: "/images/categories/academic.jpg", productCount: 170 },
        { id: "cat-6-4", name: "Children's Books", slug: "childrens-books", description: "Picture books, chapter books", image: "/images/categories/childrens-books.jpg", productCount: 100 },
      ],
    },
    {
      id: "cat-7",
      name: "Toys & Games",
      slug: "toys",
      description: "Toys, games, and activities for kids of all ages",
      image: "/images/categories/toys.jpg",
      productCount: 280,
      children: [
        { id: "cat-7-1", name: "Action Figures", slug: "action-figures", description: "Action figures & collectibles", image: "/images/categories/action-figures.jpg", productCount: 70 },
        { id: "cat-7-2", name: "Board Games", slug: "board-games", description: "Board games & puzzles", image: "/images/categories/board-games.jpg", productCount: 90 },
        { id: "cat-7-3", name: "Educational Toys", slug: "educational-toys", description: "STEM & learning toys", image: "/images/categories/educational-toys.jpg", productCount: 120 },
      ],
    },
    {
      id: "cat-8",
      name: "Groceries",
      slug: "groceries",
      description: "Daily essentials, snacks, beverages, and organic food",
      image: "/images/categories/groceries.jpg",
      productCount: 650,
      children: [
        { id: "cat-8-1", name: "Staples", slug: "staples", description: "Rice, dal, flour, oil", image: "/images/categories/staples.jpg", productCount: 200 },
        { id: "cat-8-2", name: "Snacks & Beverages", slug: "snacks-beverages", description: "Chips, drinks, tea, coffee", image: "/images/categories/snacks.jpg", productCount: 250 },
        { id: "cat-8-3", name: "Organic & Health", slug: "organic-health", description: "Organic food & supplements", image: "/images/categories/organic.jpg", productCount: 200 },
      ],
    },
    {
      id: "cat-9",
      name: "Automotive",
      slug: "automotive",
      description: "Car and bike accessories, parts, and care products",
      image: "/images/categories/automotive.jpg",
      productCount: 180,
      children: [
        { id: "cat-9-1", name: "Car Accessories", slug: "car-accessories", description: "Covers, mats, electronics", image: "/images/categories/car-accessories.jpg", productCount: 90 },
        { id: "cat-9-2", name: "Bike Accessories", slug: "bike-accessories", description: "Helmets, gloves, covers", image: "/images/categories/bike-accessories.jpg", productCount: 90 },
      ],
    },
    {
      id: "cat-10",
      name: "Health & Wellness",
      slug: "health",
      description: "Supplements, medical devices, and wellness products",
      image: "/images/categories/health.jpg",
      productCount: 200,
      children: [
        { id: "cat-10-1", name: "Supplements", slug: "supplements", description: "Vitamins, protein, ayurveda", image: "/images/categories/supplements.jpg", productCount: 100 },
        { id: "cat-10-2", name: "Medical Devices", slug: "medical-devices", description: "BP monitors, thermometers", image: "/images/categories/medical-devices.jpg", productCount: 50 },
        { id: "cat-10-3", name: "Wellness", slug: "wellness", description: "Essential oils, diffusers", image: "/images/categories/wellness.jpg", productCount: 50 },
      ],
    },
  ];

  const categorySlugToId: Record<string, string> = {};

  for (const cat of categoryTree) {
    await prisma.category.create({
      data: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        productCount: cat.productCount,
      },
    });
    categorySlugToId[cat.slug] = cat.id;

    for (const child of cat.children) {
      await prisma.category.create({
        data: {
          id: child.id,
          name: child.name,
          slug: child.slug,
          description: child.description,
          image: child.image,
          parentId: cat.id,
          productCount: child.productCount,
        },
      });
      categorySlugToId[child.slug] = child.id;
    }
  }
  console.log(
    `✅ ${Object.keys(categorySlugToId).length} categories created\n`,
  );

  // ─── Products ───
  console.log("📦 Creating products...");

  const productsData = [
    { id: "prod-1", name: "Samsung Galaxy S24 Ultra 5G", slug: "samsung-galaxy-s24-ultra-5g", shortDescription: "AI-powered flagship smartphone with S Pen and 200MP camera", description: "The Samsung Galaxy S24 Ultra redefines what a smartphone can do with Galaxy AI built right in. Featuring a stunning 6.8\" Dynamic AMOLED 2X display, the powerful Snapdragon 8 Gen 3 processor, and an incredible 200MP camera system.", price: 129999, compareAtPrice: 144999, images: ["/images/products/samsung-s24-ultra-1.jpg", "/images/products/samsung-s24-ultra-2.jpg", "/images/products/samsung-s24-ultra-3.jpg", "/images/products/samsung-s24-ultra-4.jpg"], categorySlug: "smartphones", brand: "Samsung", sellerId: "seller-1", rating: 4.7, reviewCount: 2845, stock: 42, isFeatured: true, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Storage", type: "select", options: [{ label: "256GB", value: "256gb", stock: 20 }, { label: "512GB", value: "512gb", stock: 15 }, { label: "1TB", value: "1tb", stock: 7 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Titanium Black", value: "#1a1a2e", stock: 15 }, { label: "Titanium Gray", value: "#8a8a8a", stock: 12 }, { label: "Titanium Violet", value: "#7b68ee", stock: 8 }, { label: "Titanium Yellow", value: "#f5c518", stock: 7 }] }], specifications: { Display: '6.8" QHD+ Dynamic AMOLED 2X, 120Hz', Processor: "Snapdragon 8 Gen 3 for Galaxy", RAM: "12GB", Camera: "200MP + 50MP + 12MP + 10MP", Battery: "5000mAh, 45W Fast Charging", OS: "Android 14, One UI 6.1", Weight: "232g" }, highlights: ["Galaxy AI for real-time translation & photo editing", "200MP Wide Camera with advanced Nightography", "Built-in S Pen with Air Actions", "Titanium frame with Gorilla Armor display", "5000mAh battery with all-day power"], tags: ["smartphone", "5g", "samsung", "flagship", "ai-phone"], createdAt: "2024-01-20" },
    { id: "prod-2", name: "Apple MacBook Air M3 15\"", slug: "apple-macbook-air-m3-15", shortDescription: "Impossibly thin laptop with Apple M3 chip and 18-hour battery life", description: "The 15-inch MacBook Air with M3 chip delivers incredible performance in an impossibly thin design.", price: 144900, compareAtPrice: 154900, images: ["/images/products/macbook-air-m3-1.jpg", "/images/products/macbook-air-m3-2.jpg", "/images/products/macbook-air-m3-3.jpg"], categorySlug: "laptops", brand: "Apple", sellerId: "seller-1", rating: 4.8, reviewCount: 1256, stock: 28, isFeatured: true, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Configuration", type: "select", options: [{ label: "8GB/256GB", value: "8-256", stock: 10 }, { label: "8GB/512GB", value: "8-512", stock: 10 }, { label: "16GB/512GB", value: "16-512", stock: 8 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Midnight", value: "#1d1d2b", stock: 10 }, { label: "Starlight", value: "#f0e6d3", stock: 8 }, { label: "Space Gray", value: "#7d7d7d", stock: 5 }, { label: "Silver", value: "#e3e3e3", stock: 5 }] }], specifications: { Display: '15.3" Liquid Retina, 500 nits', Chip: "Apple M3 (8-core CPU, 10-core GPU)", Memory: "8GB Unified Memory", Storage: "256GB SSD", Battery: "Up to 18 hours", Weight: "1.51 kg", Ports: "MagSafe 3, 2x Thunderbolt/USB 4, 3.5mm jack" }, highlights: ["Apple M3 chip with 8-core CPU", "15.3-inch Liquid Retina display", "Up to 18 hours of battery life", "Fanless, silent design at just 11.5mm thin", "1080p FaceTime HD camera with 3-mic array"], tags: ["laptop", "macbook", "apple", "ultrabook", "m3"], createdAt: "2024-03-08" },
    { id: "prod-3", name: "Sony WH-1000XM5 Wireless Headphones", slug: "sony-wh-1000xm5-wireless-headphones", shortDescription: "Industry-leading noise cancellation with exceptional sound quality", description: "Experience the next level of silence with Sony WH-1000XM5 headphones.", price: 26990, compareAtPrice: 34990, images: ["/images/products/sony-xm5-1.jpg", "/images/products/sony-xm5-2.jpg", "/images/products/sony-xm5-3.jpg"], categorySlug: "audio", brand: "Sony", sellerId: "seller-1", rating: 4.6, reviewCount: 3421, stock: 65, isFeatured: true, isTrending: false, isFlashDeal: true, flashDealEndsAt: "2026-03-15T23:59:59Z", variants: [{ id: "v1", name: "Color", type: "color", options: [{ label: "Black", value: "#000000", stock: 30 }, { label: "Silver", value: "#c0c0c0", stock: 20 }, { label: "Midnight Blue", value: "#191970", stock: 15 }] }], specifications: { Driver: "30mm", "Noise Cancellation": "Auto NC Optimizer, 8 microphones", Battery: "30 hours (NC ON)", Charging: "USB-C, 3 min charge = 3 hrs", Weight: "250g", Bluetooth: "5.2, Multipoint", Codecs: "SBC, AAC, LDAC" }, highlights: ["Industry-leading noise cancellation", "30-hour battery life", "Speak-to-chat auto-pauses music", "Crystal-clear hands-free calls", "Lightweight foldable design at 250g"], tags: ["headphones", "wireless", "noise-cancelling", "sony", "premium"], createdAt: "2024-02-14" },
    { id: "prod-4", name: "Levis 511 Slim Fit Jeans - Men", slug: "levis-511-slim-fit-jeans-men", shortDescription: "Classic slim fit jeans with stretch comfort and timeless style", description: "The Levi's 511 Slim Fit Jeans sit below the waist with a slim fit from hip to ankle.", price: 2499, compareAtPrice: 3999, images: ["/images/products/levis-511-1.jpg", "/images/products/levis-511-2.jpg", "/images/products/levis-511-3.jpg"], categorySlug: "mens-clothing", brand: "Levi's", sellerId: "seller-2", rating: 4.4, reviewCount: 5678, stock: 120, isFeatured: false, isTrending: true, isFlashDeal: true, flashDealEndsAt: "2026-03-12T23:59:59Z", variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "30", value: "30", stock: 25 }, { label: "32", value: "32", stock: 30 }, { label: "34", value: "34", stock: 30 }, { label: "36", value: "36", stock: 20 }, { label: "38", value: "38", stock: 15 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Dark Indigo", value: "#1a1a4e", stock: 40 }, { label: "Medium Wash", value: "#4169e1", stock: 40 }, { label: "Black", value: "#000000", stock: 40 }] }], specifications: { Fit: "Slim (511)", Rise: "Mid Rise", Material: "99% Cotton, 1% Elastane", Closure: "Zip Fly with Button", Wash: "Machine Washable", Country: "India" }, highlights: ["Advanced stretch fabric for all-day comfort", "Classic 5-pocket design", "Sits below waist, slim through hip and thigh", "Levi's signature quality & durability", "37% off MRP"], tags: ["jeans", "levis", "slim-fit", "mens", "denim"], createdAt: "2024-01-05" },
    { id: "prod-5", name: "Prestige Iris 750W Mixer Grinder", slug: "prestige-iris-750w-mixer-grinder", shortDescription: "Powerful 750W mixer grinder with 3 stainless steel jars", description: "The Prestige Iris Mixer Grinder packs a powerful 750W motor.", price: 3299, compareAtPrice: 4995, images: ["/images/products/prestige-iris-1.jpg", "/images/products/prestige-iris-2.jpg"], categorySlug: "kitchen-appliances", brand: "Prestige", sellerId: "seller-3", rating: 4.3, reviewCount: 8920, stock: 80, isFeatured: true, isTrending: false, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Color", type: "color", options: [{ label: "White & Purple", value: "#800080", stock: 40 }, { label: "White & Red", value: "#ff0000", stock: 40 }] }], specifications: { Wattage: "750W", Jars: "3 (1.5L, 1L, 0.5L)", Material: "Stainless Steel Jars, ABS Body", Speed: "3 Speed + Pulse", Blade: "Stainless Steel", Warranty: "2 Years" }, highlights: ["Powerful 750W motor for tough grinding", "3 stainless steel jars (1.5L, 1L, 0.5L)", "3-speed control with pulse function", "Anti-skid feet for stability", "2-year manufacturer warranty"], tags: ["mixer-grinder", "kitchen", "prestige", "appliance"], createdAt: "2024-04-01" },
    { id: "prod-6", name: "Mamaearth Vitamin C Face Wash", slug: "mamaearth-vitamin-c-face-wash", shortDescription: "Natural face wash with Vitamin C & Turmeric for skin brightening", description: "Mamaearth Vitamin C Face Wash is enriched with Vitamin C and Turmeric.", price: 349, compareAtPrice: 499, images: ["/images/products/mamaearth-facewash-1.jpg", "/images/products/mamaearth-facewash-2.jpg"], categorySlug: "skincare", brand: "Mamaearth", sellerId: "seller-4", rating: 4.2, reviewCount: 12540, stock: 200, isFeatured: false, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "100ml", value: "100ml", stock: 100 }, { label: "150ml", value: "150ml", stock: 60 }, { label: "250ml", value: "250ml", stock: 40 }] }], specifications: { Volume: "100ml", "Skin Type": "All Skin Types", "Key Ingredients": "Vitamin C, Turmeric", "Free From": "Sulfates, Parabens, SLS, Mineral Oil", "Shelf Life": "24 months" }, highlights: ["Vitamin C brightens skin tone", "Turmeric fights dullness", "Toxin-free & dermatologically tested", "Gentle foaming for daily use", "Suitable for all skin types"], tags: ["facewash", "skincare", "vitamin-c", "mamaearth", "natural"], createdAt: "2024-02-20" },
    { id: "prod-7", name: "Nike Air Zoom Pegasus 41", slug: "nike-air-zoom-pegasus-41", shortDescription: "Responsive running shoes with Zoom Air cushioning", description: "The Nike Air Zoom Pegasus 41 continues the legacy.", price: 10795, compareAtPrice: 12995, images: ["/images/products/nike-pegasus-41-1.jpg", "/images/products/nike-pegasus-41-2.jpg", "/images/products/nike-pegasus-41-3.jpg"], categorySlug: "activewear", brand: "Nike", sellerId: "seller-5", rating: 4.5, reviewCount: 2156, stock: 55, isFeatured: true, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "UK 7", value: "uk7", stock: 10 }, { label: "UK 8", value: "uk8", stock: 15 }, { label: "UK 9", value: "uk9", stock: 15 }, { label: "UK 10", value: "uk10", stock: 10 }, { label: "UK 11", value: "uk11", stock: 5 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Black/White", value: "#000000", stock: 25 }, { label: "Wolf Grey", value: "#b0b0b0", stock: 15 }, { label: "Navy Blue", value: "#000080", stock: 15 }] }], specifications: { Type: "Road Running Shoes", Cushioning: "Zoom Air + React Foam", Upper: "Engineered Mesh", Sole: "Rubber Waffle", Drop: "10mm", Weight: "285g (UK 9)" }, highlights: ["Zoom Air unit for responsive cushioning", "React foam midsole for smooth ride", "Engineered mesh for breathability", "Flywire cables for midfoot lockdown", "Durable rubber waffle outsole"], tags: ["running-shoes", "nike", "sports", "sneakers", "pegasus"], createdAt: "2024-05-10" },
    { id: "prod-8", name: "Apple iPhone 15 Pro Max", slug: "apple-iphone-15-pro-max", shortDescription: "Titanium design, A17 Pro chip, 5x optical zoom camera", description: "iPhone 15 Pro Max features titanium design with A17 Pro chip.", price: 159900, compareAtPrice: 169900, images: ["/images/products/iphone-15-pro-max-1.jpg", "/images/products/iphone-15-pro-max-2.jpg", "/images/products/iphone-15-pro-max-3.jpg", "/images/products/iphone-15-pro-max-4.jpg"], categorySlug: "smartphones", brand: "Apple", sellerId: "seller-1", rating: 4.8, reviewCount: 4521, stock: 30, isFeatured: true, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Storage", type: "select", options: [{ label: "256GB", value: "256gb", stock: 12 }, { label: "512GB", value: "512gb", stock: 10 }, { label: "1TB", value: "1tb", stock: 8 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Natural Titanium", value: "#c4b6a6", stock: 10 }, { label: "Blue Titanium", value: "#3e4c61", stock: 8 }, { label: "White Titanium", value: "#f2f1ed", stock: 7 }, { label: "Black Titanium", value: "#3c3c3c", stock: 5 }] }], specifications: { Display: '6.7" Super Retina XDR, ProMotion 120Hz', Chip: "A17 Pro", Camera: "48MP Main + 12MP Ultra Wide + 12MP 5x Telephoto", Battery: "Up to 29 hours video playback", Connector: "USB-C (USB 3)", Weight: "221g", "Water Resistance": "IP68" }, highlights: ["Grade 5 titanium design", "A17 Pro chip with hardware ray tracing", "5x optical zoom for the first time on iPhone", "Action button for instant access", "All-day battery life, USB-C"], tags: ["iphone", "apple", "smartphone", "flagship", "titanium"], createdAt: "2024-01-10" },
    { id: "prod-9", name: "boAt Airdopes 141 TWS Earbuds", slug: "boat-airdopes-141-tws-earbuds", shortDescription: "True wireless earbuds with 42H playtime and low latency mode", description: "The boAt Airdopes 141 deliver an immersive audio experience.", price: 1299, compareAtPrice: 4490, images: ["/images/products/boat-airdopes-141-1.jpg", "/images/products/boat-airdopes-141-2.jpg"], categorySlug: "audio", brand: "boAt", sellerId: "seller-1", rating: 4.1, reviewCount: 45230, stock: 300, isFeatured: false, isTrending: true, isFlashDeal: true, flashDealEndsAt: "2026-03-14T23:59:59Z", variants: [{ id: "v1", name: "Color", type: "color", options: [{ label: "Bold Black", value: "#000000", stock: 100 }, { label: "Cherry Blossom", value: "#ffb7c5", stock: 80 }, { label: "Celestial Blue", value: "#4a90d9", stock: 60 }, { label: "Olive Green", value: "#556b2f", stock: 60 }] }], specifications: { Driver: "8mm", Playtime: "42 hours total (6h per charge)", Charging: "Type-C, 10 min = 75 min", Bluetooth: "v5.3", "Water Resistance": "IPX4", Latency: "50ms (BEAST Mode)" }, highlights: ["42 hours total playtime", "BEAST mode for low latency gaming", "IPX4 sweat & water resistance", "ENx noise cancelling for clear calls", "Type-C fast charging"], tags: ["earbuds", "tws", "boat", "wireless", "budget"], createdAt: "2024-03-15" },
    { id: "prod-10", name: "Wakefit Orthopedic Memory Foam Mattress", slug: "wakefit-orthopedic-memory-foam-mattress", shortDescription: "6-inch medium firm mattress for back pain relief", description: "The Wakefit Orthopedic Memory Foam Mattress is designed for optimal spine support.", price: 8499, compareAtPrice: 14999, images: ["/images/products/wakefit-mattress-1.jpg", "/images/products/wakefit-mattress-2.jpg"], categorySlug: "furniture", brand: "Wakefit", sellerId: "seller-3", rating: 4.4, reviewCount: 18760, stock: 40, isFeatured: true, isTrending: false, isFlashDeal: true, flashDealEndsAt: "2026-03-13T23:59:59Z", variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "Single (72x36)", value: "single", stock: 10 }, { label: "Double (72x48)", value: "double", stock: 10 }, { label: "Queen (72x60)", value: "queen", stock: 10 }, { label: "King (72x72)", value: "king", stock: 10 }] }], specifications: { Thickness: "6 inches", Material: "Memory Foam + HR Foam", Firmness: "Medium Firm", Cover: "Removable Zippered, Machine Washable", Certification: "CertiPUR-US", Warranty: "10 Years" }, highlights: ["Orthopedic support for back pain relief", "High-density memory foam body contouring", "Breathable removable cover", "CertiPUR-US certified foam", "10-year warranty with 100-night trial"], tags: ["mattress", "memory-foam", "orthopedic", "wakefit", "sleep"], createdAt: "2024-02-01" },
    { id: "prod-11", name: "Allen Solly Men Polo T-Shirt", slug: "allen-solly-men-polo-tshirt", shortDescription: "Classic cotton polo t-shirt in regular fit", description: "Elevate your casual wardrobe with this Allen Solly Polo T-Shirt.", price: 899, compareAtPrice: 1799, images: ["/images/products/allen-solly-polo-1.jpg", "/images/products/allen-solly-polo-2.jpg"], categorySlug: "mens-clothing", brand: "Allen Solly", sellerId: "seller-2", rating: 4.2, reviewCount: 7890, stock: 150, isFeatured: false, isTrending: false, isFlashDeal: true, flashDealEndsAt: "2026-03-11T23:59:59Z", variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "S", value: "s", stock: 30 }, { label: "M", value: "m", stock: 40 }, { label: "L", value: "l", stock: 40 }, { label: "XL", value: "xl", stock: 25 }, { label: "XXL", value: "xxl", stock: 15 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Navy Blue", value: "#000080", stock: 40 }, { label: "White", value: "#ffffff", stock: 35 }, { label: "Olive Green", value: "#556b2f", stock: 35 }, { label: "Maroon", value: "#800000", stock: 40 }] }], specifications: { Fabric: "100% Cotton", Fit: "Regular Fit", Sleeve: "Short Sleeve", Collar: "Polo/Ribbed", Pattern: "Solid", "Wash Care": "Machine Wash" }, highlights: ["Premium 100% cotton fabric", "Classic polo collar with 2-button placket", "Regular fit for easy movement", "Ribbed collar & sleeve hems", "50% off — great value"], tags: ["polo", "tshirt", "mens", "allen-solly", "cotton"], createdAt: "2024-04-15" },
    { id: "prod-12", name: "Noise ColorFit Pro 5 Smartwatch", slug: "noise-colorfit-pro-5-smartwatch", shortDescription: '1.85" AMOLED display smartwatch with Bluetooth calling', description: "The Noise ColorFit Pro 5 smartwatch features a vibrant 1.85-inch AMOLED display.", price: 3499, compareAtPrice: 6999, images: ["/images/products/noise-colorfit-5-1.jpg", "/images/products/noise-colorfit-5-2.jpg"], categorySlug: "wearables", brand: "Noise", sellerId: "seller-1", rating: 4.0, reviewCount: 15640, stock: 90, isFeatured: false, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Color", type: "color", options: [{ label: "Jet Black", value: "#0a0a0a", stock: 30 }, { label: "Rose Gold", value: "#b76e79", stock: 25 }, { label: "Silver Grey", value: "#a8a8a8", stock: 20 }, { label: "Midnight Blue", value: "#191970", stock: 15 }] }], specifications: { Display: '1.85" AMOLED, 60Hz', Battery: "Up to 7 days", Calling: "Bluetooth 5.3 Calling", Sensors: "Heart Rate, SpO2, Accelerometer", "Water Resistance": "IP68", "Sports Modes": "100+" }, highlights: ['1.85" AMOLED always-on display', "Bluetooth calling from your wrist", "100+ sports modes tracking", "24/7 heart rate & SpO2 monitoring", "Up to 7 days battery life"], tags: ["smartwatch", "noise", "wearable", "fitness-tracker"], createdAt: "2024-05-01" },
    { id: "prod-13", name: "Atomic Habits by James Clear", slug: "atomic-habits-james-clear", shortDescription: "Proven framework for building good habits and breaking bad ones", description: "No matter your goals, Atomic Habits offers a proven framework for improving—every day.", price: 399, compareAtPrice: 799, images: ["/images/products/atomic-habits-1.jpg", "/images/products/atomic-habits-2.jpg"], categorySlug: "non-fiction", brand: "Penguin Random House", sellerId: "seller-6", rating: 4.7, reviewCount: 32450, stock: 500, isFeatured: true, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Format", type: "select", options: [{ label: "Paperback", value: "paperback", stock: 400 }, { label: "Hardcover", value: "hardcover", stock: 100 }] }], specifications: { Author: "James Clear", Publisher: "Penguin Random House", Pages: "320", Language: "English", ISBN: "978-0735211292", Dimensions: "13.5 x 2.1 x 21.3 cm" }, highlights: ["#1 New York Times bestseller", "15 million+ copies sold worldwide", "Practical strategies for habit formation", "Backed by scientific research", "50% off MRP"], tags: ["book", "self-help", "habits", "bestseller", "james-clear"], createdAt: "2024-01-01" },
    { id: "prod-14", name: "Lakme 9to5 Primer + Matte Lipstick", slug: "lakme-9to5-primer-matte-lipstick", shortDescription: "Long-lasting matte lipstick with built-in primer", description: "Lakme 9to5 Primer + Matte Lip Color gives a smooth matte finish.", price: 449, compareAtPrice: 625, images: ["/images/products/lakme-lipstick-1.jpg", "/images/products/lakme-lipstick-2.jpg"], categorySlug: "makeup", brand: "Lakme", sellerId: "seller-4", rating: 4.3, reviewCount: 9870, stock: 180, isFeatured: false, isTrending: false, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Shade", type: "color", options: [{ label: "Red Coat", value: "#c41e3a", stock: 40 }, { label: "Rosy Sunday", value: "#e8929a", stock: 40 }, { label: "Berry Base", value: "#8e4585", stock: 40 }, { label: "Nude Touch", value: "#c4956a", stock: 30 }, { label: "Crimson Silk", value: "#dc143c", stock: 30 }] }], specifications: { Type: "Matte Lipstick", Finish: "Matte", Weight: "3.6g", "Key Ingredient": "Vitamin E", Feature: "Built-in Primer", "Shelf Life": "36 months" }, highlights: ["Built-in primer for smooth application", "Intense color payoff", "Long-lasting matte finish", "Enriched with Vitamin E", "No separate primer needed"], tags: ["lipstick", "makeup", "lakme", "matte", "beauty"], createdAt: "2024-03-20" },
    { id: "prod-15", name: "SG Kashmir Willow Cricket Bat", slug: "sg-kashmir-willow-cricket-bat", shortDescription: "Premium Kashmir willow bat for intermediate players", description: "The SG Kashmir Willow Cricket Bat is crafted from high-quality Kashmir willow.", price: 2499, compareAtPrice: 3499, images: ["/images/products/sg-cricket-bat-1.jpg", "/images/products/sg-cricket-bat-2.jpg"], categorySlug: "cricket", brand: "SG", sellerId: "seller-5", rating: 4.3, reviewCount: 3456, stock: 35, isFeatured: false, isTrending: false, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "Short Handle (SH)", value: "sh", stock: 20 }, { label: "Full Size", value: "full", stock: 15 }] }], specifications: { Material: "Kashmir Willow", Handle: "Cane Handle with Rubber Grip", Weight: "1100-1250g", Edge: "38mm Thick Edge", Grade: "Club Level", Includes: "Free Bat Cover" }, highlights: ["Premium Kashmir willow blade", "Thick edge for powerful shots", "Cane handle with shock absorption", "Suitable for leather ball cricket", "Free bat cover included"], tags: ["cricket", "bat", "sg", "sports", "kashmir-willow"], createdAt: "2024-04-20" },
    { id: "prod-16", name: 'Samsung 55" Crystal 4K Smart TV', slug: "samsung-55-crystal-4k-smart-tv", shortDescription: "4K UHD Smart TV with Crystal Processor, HDR, and Tizen OS", description: "Experience stunning picture quality with Samsung 55-inch Crystal 4K UHD Smart TV.", price: 42990, compareAtPrice: 59900, images: ["/images/products/samsung-tv-55-1.jpg", "/images/products/samsung-tv-55-2.jpg"], categorySlug: "electronics-accessories", brand: "Samsung", sellerId: "seller-1", rating: 4.4, reviewCount: 6780, stock: 25, isFeatured: true, isTrending: false, isFlashDeal: true, flashDealEndsAt: "2026-03-16T23:59:59Z", variants: [], specifications: { "Screen Size": "55 inches", Resolution: "3840 x 2160 (4K UHD)", Processor: "Crystal Processor 4K", HDR: "HDR10+", "Smart TV": "Tizen OS", Connectivity: "3 HDMI, 1 USB, Wi-Fi, Bluetooth", Sound: "20W, Dolby Digital Plus" }, highlights: ["Crystal Processor 4K for sharp picture", "HDR10+ for vivid colors & contrast", "AirSlim design — incredibly thin", "Tizen OS with built-in streaming apps", "28% off — limited time deal"], tags: ["tv", "samsung", "4k", "smart-tv", "electronics"], createdAt: "2024-03-01" },
    { id: "prod-17", name: "Himalaya Neem Face Wash", slug: "himalaya-neem-face-wash", shortDescription: "Soap-free herbal face wash for pimple prevention", description: "Himalaya Herbals Purifying Neem Face Wash cleans impurities.", price: 185, compareAtPrice: 225, images: ["/images/products/himalaya-neem-1.jpg", "/images/products/himalaya-neem-2.jpg"], categorySlug: "skincare", brand: "Himalaya", sellerId: "seller-4", rating: 4.4, reviewCount: 28900, stock: 350, isFeatured: false, isTrending: false, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "100ml", value: "100ml", stock: 150 }, { label: "150ml", value: "150ml", stock: 100 }, { label: "200ml", value: "200ml", stock: 100 }] }], specifications: { Volume: "150ml", "Skin Type": "Normal to Oily", "Key Ingredients": "Neem, Turmeric", Type: "Gel Face Wash", "Soap-Free": "Yes" }, highlights: ["Neem kills bacteria causing pimples", "Turmeric controls acne & oil", "Soap-free gentle formula", "Suitable for normal to oily skin", "India's #1 face wash brand"], tags: ["facewash", "neem", "himalaya", "herbal", "acne"], createdAt: "2024-01-15" },
    { id: "prod-18", name: "OnePlus Nord CE 4 Lite 5G", slug: "oneplus-nord-ce-4-lite-5g", shortDescription: "Budget 5G smartphone with 50MP camera and 5500mAh battery", description: "The OnePlus Nord CE 4 Lite delivers flagship-level features.", price: 17999, compareAtPrice: 21999, images: ["/images/products/oneplus-nord-ce4-lite-1.jpg", "/images/products/oneplus-nord-ce4-lite-2.jpg"], categorySlug: "smartphones", brand: "OnePlus", sellerId: "seller-1", rating: 4.3, reviewCount: 8900, stock: 70, isFeatured: false, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Configuration", type: "select", options: [{ label: "6GB/128GB", value: "6-128", stock: 35 }, { label: "8GB/128GB", value: "8-128", stock: 35 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Super Silver", value: "#c0c0c0", stock: 35 }, { label: "Mega Blue", value: "#1e90ff", stock: 35 }] }], specifications: { Display: '6.67" AMOLED, 120Hz', Processor: "Snapdragon 695 5G", RAM: "6GB / 8GB", Storage: "128GB", Camera: "50MP Sony + 2MP", Battery: "5500mAh, 33W SUPERVOOC", OS: "OxygenOS 14 (Android 14)" }, highlights: ['6.67" 120Hz AMOLED display', "Snapdragon 695 5G processor", "50MP Sony main camera", "5500mAh battery with 33W charging", "OxygenOS 14 based on Android 14"], tags: ["smartphone", "oneplus", "5g", "budget", "nord"], createdAt: "2024-06-01" },
    { id: "prod-19", name: "Urban Ladder Maxis Solid Wood TV Unit", slug: "urban-ladder-maxis-tv-unit", shortDescription: "Solid sheesham wood TV unit with warm teak finish", description: "The Urban Ladder Maxis TV Unit is crafted from solid sheesham wood.", price: 18999, compareAtPrice: 28999, images: ["/images/products/urban-ladder-tv-unit-1.jpg", "/images/products/urban-ladder-tv-unit-2.jpg"], categorySlug: "furniture", brand: "Urban Ladder", sellerId: "seller-3", rating: 4.5, reviewCount: 1240, stock: 12, isFeatured: false, isTrending: false, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Finish", type: "select", options: [{ label: "Teak", value: "teak", stock: 6 }, { label: "Walnut", value: "walnut", stock: 6 }] }], specifications: { Material: "Solid Sheesham Wood", Finish: "Teak / Walnut", Dimensions: "140 x 40 x 50 cm", "TV Size": "Up to 55 inches", Storage: "2 open shelves, 1 cabinet", Assembly: "DIY with instructions", Warranty: "3 Years" }, highlights: ["Solid sheesham wood construction", "Accommodates TVs up to 55 inches", "Open shelves + closed cabinet storage", "Rich teak or walnut finish", "3-year warranty"], tags: ["tv-unit", "furniture", "wood", "urban-ladder", "living-room"], createdAt: "2024-05-15" },
    { id: "prod-20", name: "MuscleBlaze Biozyme Whey Protein", slug: "muscleblaze-biozyme-whey-protein", shortDescription: "Clinically tested whey protein with Enhanced Absorption Formula", description: "MuscleBlaze Biozyme Performance Whey Protein is India's first clinically tested whey protein.", price: 3499, compareAtPrice: 4999, images: ["/images/products/muscleblaze-whey-1.jpg", "/images/products/muscleblaze-whey-2.jpg"], categorySlug: "supplements", brand: "MuscleBlaze", sellerId: "seller-5", rating: 4.2, reviewCount: 11200, stock: 95, isFeatured: false, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Flavour", type: "select", options: [{ label: "Rich Chocolate", value: "chocolate", stock: 30 }, { label: "Cafe Mocha", value: "cafe-mocha", stock: 25 }, { label: "Vanilla Ice Cream", value: "vanilla", stock: 20 }, { label: "Strawberry", value: "strawberry", stock: 20 }] }, { id: "v2", name: "Size", type: "select", options: [{ label: "1 kg", value: "1kg", stock: 50 }, { label: "2 kg", value: "2kg", stock: 30 }, { label: "4 kg", value: "4kg", stock: 15 }] }], specifications: { "Protein Per Serving": "25g", EAAs: "11.75g", BCAAs: "5.51g", Servings: "32 (1kg)", Type: "Whey Protein Blend", Certification: "Labdoor USA Tested", Country: "India" }, highlights: ["25g protein per serving", "Enhanced Absorption Formula (EAF)", "50% higher absorption than regular whey", "Clinically tested by a leading US lab", "Informed Choice UK Certified"], tags: ["protein", "whey", "supplement", "muscleblaze", "fitness"], createdAt: "2024-04-10" },
    { id: "prod-21", name: "Kurta Pajama Set - Men", slug: "mens-cotton-kurta-pajama-set", shortDescription: "Comfortable pure cotton kurta pajama in traditional style", description: "Classic kurta pajama set made from pure breathable cotton.", price: 1299, compareAtPrice: 2499, images: ["/images/products/kurta-pajama-1.jpg", "/images/products/kurta-pajama-2.jpg"], categorySlug: "mens-clothing", brand: "Manyavar", sellerId: "seller-2", rating: 4.3, reviewCount: 4560, stock: 80, isFeatured: false, isTrending: false, isFlashDeal: true, flashDealEndsAt: "2026-03-14T23:59:59Z", variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "S (38)", value: "s", stock: 15 }, { label: "M (40)", value: "m", stock: 25 }, { label: "L (42)", value: "l", stock: 20 }, { label: "XL (44)", value: "xl", stock: 15 }, { label: "XXL (46)", value: "xxl", stock: 5 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Ivory White", value: "#fffff0", stock: 30 }, { label: "Light Blue", value: "#add8e6", stock: 25 }, { label: "Beige", value: "#f5f5dc", stock: 25 }] }], specifications: { Fabric: "100% Cotton", Fit: "Straight", Sleeve: "Full Sleeve", Collar: "Mandarin Collar", Pattern: "Solid with Thread Work", "Set Contains": "Kurta + Pajama" }, highlights: ["Pure cotton for all-day comfort", "Elegant thread work detail", "Mandarin collar design", "Comfortable drawstring pajama", "Perfect for festivals & occasions"], tags: ["kurta", "ethnic", "mens", "festive", "cotton", "manyavar"], createdAt: "2024-05-20" },
    { id: "prod-22", name: "Philips Air Fryer HD9200/90", slug: "philips-air-fryer-hd9200", shortDescription: "Rapid Air Technology for healthier frying with up to 90% less fat", description: "The Philips Essential Air Fryer with Rapid Air Technology.", price: 6999, compareAtPrice: 9995, images: ["/images/products/philips-air-fryer-1.jpg", "/images/products/philips-air-fryer-2.jpg"], categorySlug: "kitchen-appliances", brand: "Philips", sellerId: "seller-3", rating: 4.5, reviewCount: 7650, stock: 45, isFeatured: true, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [], specifications: { Capacity: "4.1 Litres", Power: "1400W", Technology: "Rapid Air", Temperature: "80°C - 200°C", Timer: "60 minutes", "Dishwasher Safe": "Yes (removable parts)", Warranty: "2 Years" }, highlights: ["Up to 90% less fat with Rapid Air", "4.1L capacity — family size", "Fry, bake, grill & roast", "Touchscreen controls", "Dishwasher-safe parts"], tags: ["air-fryer", "philips", "kitchen", "healthy-cooking", "appliance"], createdAt: "2024-06-15" },
    { id: "prod-23", name: "Apple Watch Series 9 GPS 45mm", slug: "apple-watch-series-9-gps-45mm", shortDescription: "Advanced health tracking with Double Tap gesture and S9 chip", description: "Apple Watch Series 9 with the powerful S9 SiP chip.", price: 41900, compareAtPrice: 44900, images: ["/images/products/apple-watch-9-1.jpg", "/images/products/apple-watch-9-2.jpg"], categorySlug: "wearables", brand: "Apple", sellerId: "seller-1", rating: 4.7, reviewCount: 3210, stock: 35, isFeatured: true, isTrending: false, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Case", type: "select", options: [{ label: "Aluminium", value: "aluminium", stock: 20 }, { label: "Stainless Steel", value: "steel", stock: 15 }] }, { id: "v2", name: "Color", type: "color", options: [{ label: "Midnight", value: "#1d1d2b", stock: 12 }, { label: "Starlight", value: "#f0e6d3", stock: 8 }, { label: "Silver", value: "#e3e3e3", stock: 8 }, { label: "(PRODUCT)RED", value: "#ff0000", stock: 7 }] }], specifications: { Display: "45mm Always-On Retina LTPO OLED", Chip: "S9 SiP", "Health Sensors": "Blood Oxygen, ECG, Heart Rate, Temperature", Storage: "64GB", "Water Resistance": "WR50", Battery: "Up to 18 hours", OS: "watchOS 10" }, highlights: ["New Double Tap gesture", "Brightest Apple Watch display at 2000 nits", "Advanced health monitoring suite", "S9 chip with on-device Siri", "Carbon neutral options available"], tags: ["smartwatch", "apple", "wearable", "health", "fitness"], createdAt: "2024-02-10" },
    { id: "prod-24", name: "W Women Printed A-Line Kurta", slug: "w-women-printed-aline-kurta", shortDescription: "Elegant printed A-line kurta for everyday and office wear", description: "Beautifully printed A-line kurta from W.", price: 799, compareAtPrice: 1399, images: ["/images/products/w-kurta-women-1.jpg", "/images/products/w-kurta-women-2.jpg"], categorySlug: "womens-clothing", brand: "W", sellerId: "seller-2", rating: 4.4, reviewCount: 6780, stock: 100, isFeatured: false, isTrending: true, isFlashDeal: false, flashDealEndsAt: null, variants: [{ id: "v1", name: "Size", type: "select", options: [{ label: "XS", value: "xs", stock: 15 }, { label: "S", value: "s", stock: 25 }, { label: "M", value: "m", stock: 25 }, { label: "L", value: "l", stock: 20 }, { label: "XL", value: "xl", stock: 15 }] }], specifications: { Fabric: "Rayon", Fit: "A-Line", Sleeve: "Three-Quarter", Neck: "Round Neck", Pattern: "Printed", Length: "Calf Length", "Wash Care": "Hand Wash" }, highlights: ["Lightweight rayon fabric", "Flattering A-line silhouette", "Vibrant all-over print", "Versatile for office and casual wear", "43% off MRP"], tags: ["kurta", "women", "ethnic", "w-brand", "casual"], createdAt: "2024-04-25" },
  ];

  for (const p of productsData) {
    const categoryId = categorySlugToId[p.categorySlug];
    if (!categoryId) {
      console.warn(`⚠️  Category slug "${p.categorySlug}" not found for product "${p.name}"`);
      continue;
    }
    await prisma.product.create({
      data: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        images: p.images,
        categoryId,
        brand: p.brand,
        sellerId: p.sellerId,
        rating: p.rating,
        reviewCount: p.reviewCount,
        stock: p.stock,
        isFeatured: p.isFeatured,
        isTrending: p.isTrending,
        isFlashDeal: p.isFlashDeal,
        flashDealEndsAt: p.flashDealEndsAt ? new Date(p.flashDealEndsAt) : null,
        variants: p.variants.length > 0 ? p.variants : undefined,
        specifications: p.specifications,
        highlights: p.highlights,
        tags: p.tags,
        createdAt: new Date(p.createdAt),
      },
    });
  }
  console.log(`✅ ${productsData.length} products created\n`);

  // ─── Reviews ───
  console.log("⭐ Creating reviews...");
  const reviewsData = [
    { id: "rev-1", productId: "prod-1", userId: "user-1", rating: 5, title: "Best smartphone I ever used!", comment: "The Galaxy S24 Ultra is an absolute beast. The camera quality is mind-blowing.", images: ["/images/reviews/s24-review-1.jpg"], verified: true, helpful: 245, createdAt: "2024-02-15" },
    { id: "rev-2", productId: "prod-1", userId: "user-1", rating: 4, title: "Amazing but pricey", comment: "Excellent phone with outstanding cameras and AI features.", images: [], verified: true, helpful: 128, createdAt: "2024-03-01" },
    { id: "rev-3", productId: "prod-2", userId: "user-1", rating: 5, title: "Perfect laptop for productivity", comment: "The M3 MacBook Air is incredibly fast and the 15-inch screen is perfect.", images: ["/images/reviews/macbook-review-1.jpg"], verified: true, helpful: 187, createdAt: "2024-04-10" },
    { id: "rev-4", productId: "prod-3", userId: "user-1", rating: 5, title: "Noise cancellation is magical", comment: "The XM5 headphones have the best noise cancellation I have ever experienced.", images: [], verified: true, helpful: 312, createdAt: "2024-03-20" },
    { id: "rev-5", productId: "prod-4", userId: "user-1", rating: 4, title: "Great jeans, good fit", comment: "Levi's 511 never disappoints. The slim fit is perfect.", images: [], verified: true, helpful: 89, createdAt: "2024-02-28" },
    { id: "rev-6", productId: "prod-5", userId: "user-1", rating: 5, title: "Kitchen workhorse!", comment: "This Prestige mixer grinder handles everything.", images: ["/images/reviews/prestige-review-1.jpg"], verified: true, helpful: 156, createdAt: "2024-05-05" },
    { id: "rev-7", productId: "prod-7", userId: "user-1", rating: 5, title: "My go-to running shoes", comment: "The Pegasus 41 is incredibly comfortable right out of the box.", images: ["/images/reviews/nike-review-1.jpg"], verified: true, helpful: 203, createdAt: "2024-06-10" },
    { id: "rev-8", productId: "prod-8", userId: "user-1", rating: 5, title: "The best iPhone ever made", comment: "iPhone 15 Pro Max is perfection. The titanium build is lighter.", images: ["/images/reviews/iphone-review-1.jpg"], verified: true, helpful: 445, createdAt: "2024-01-25" },
    { id: "rev-9", productId: "prod-9", userId: "user-1", rating: 4, title: "Best budget earbuds", comment: "At this price, the boAt Airdopes 141 are unbeatable.", images: [], verified: true, helpful: 567, createdAt: "2024-04-15" },
    { id: "rev-10", productId: "prod-10", userId: "user-1", rating: 5, title: "Back pain is gone!", comment: "This Wakefit mattress has been life-changing.", images: [], verified: true, helpful: 890, createdAt: "2024-03-10" },
    { id: "rev-11", productId: "prod-13", userId: "user-1", rating: 5, title: "Life-changing book", comment: "Atomic Habits completely changed how I think about building habits.", images: [], verified: true, helpful: 1200, createdAt: "2024-02-05" },
    { id: "rev-12", productId: "prod-22", userId: "user-1", rating: 4, title: "Healthy cooking made easy", comment: "The Philips Air Fryer is excellent for making healthier fried food.", images: ["/images/reviews/airfryer-review-1.jpg"], verified: true, helpful: 234, createdAt: "2024-07-01" },
  ];

  for (const r of reviewsData) {
    await prisma.review.create({
      data: {
        id: r.id,
        productId: r.productId,
        userId: r.userId,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        images: r.images,
        verified: r.verified,
        helpful: r.helpful,
        createdAt: new Date(r.createdAt),
      },
    });
  }
  console.log(`✅ ${reviewsData.length} reviews created\n`);

  // ─── Coupons ───
  console.log("🏷️  Creating coupons...");
  await prisma.coupon.createMany({
    data: [
      { code: "XELNOVA10", description: "Get 10% off on your order", discountType: "PERCENTAGE", discountValue: 10, minOrderAmount: 999, maxDiscount: 2000, validUntil: new Date("2026-12-31"), isActive: true },
      { code: "FIRST50", description: "Flat ₹50 off on your first order", discountType: "FLAT", discountValue: 50, minOrderAmount: 299, maxDiscount: 50, validUntil: new Date("2026-12-31"), isActive: true },
      { code: "TECH15", description: "15% off on electronics", discountType: "PERCENTAGE", discountValue: 15, minOrderAmount: 4999, maxDiscount: 5000, validUntil: new Date("2026-06-30"), isActive: true },
      { code: "FASHION20", description: "20% off on fashion", discountType: "PERCENTAGE", discountValue: 20, minOrderAmount: 1499, maxDiscount: 3000, validUntil: new Date("2026-09-30"), isActive: true },
      { code: "FREESHIP", description: "Free shipping on orders above ₹499", discountType: "FLAT", discountValue: 99, minOrderAmount: 499, maxDiscount: 99, validUntil: new Date("2026-12-31"), isActive: true },
      { code: "SAVE500", description: "Flat ₹500 off on orders above ₹4999", discountType: "FLAT", discountValue: 500, minOrderAmount: 4999, maxDiscount: 500, validUntil: new Date("2026-12-31"), isActive: true },
      { code: "MEGA30", description: "30% off — Mega sale special", discountType: "PERCENTAGE", discountValue: 30, minOrderAmount: 2999, maxDiscount: 7500, validUntil: new Date("2026-04-01"), isActive: true },
    ],
  });
  console.log("✅ 7 coupons created\n");

  // ─── Banners ───
  console.log("🖼️  Creating banners...");
  await prisma.banner.createMany({
    data: [
      { id: "banner-1", title: "Summer Sale is LIVE!", subtitle: "Up to 70% Off", description: "Shop the biggest deals on electronics, fashion, home & more.", image: "/images/banners/summer-sale.jpg", ctaText: "Shop Now", ctaLink: "/products?tag=sale", bgColor: "#ff6b35", sortOrder: 1 },
      { id: "banner-2", title: "New Arrivals in Tech", subtitle: "Galaxy S24 Ultra | iPhone 15 Pro | MacBook Air M3", description: "Get the latest gadgets with exclusive launch offers.", image: "/images/banners/tech-arrivals.jpg", ctaText: "Explore Tech", ctaLink: "/categories/electronics", bgColor: "#1a1a2e", sortOrder: 2 },
      { id: "banner-3", title: "Fashion Festival", subtitle: "Flat 50% Off on Top Brands", description: "Refresh your wardrobe with Levi's, Allen Solly, W, and more.", image: "/images/banners/fashion-festival.jpg", ctaText: "Shop Fashion", ctaLink: "/categories/fashion", bgColor: "#e91e63", sortOrder: 3 },
      { id: "banner-4", title: "Healthy Home, Happy Life", subtitle: "Kitchen Appliances from ₹999", description: "Air fryers, mixer grinders, OTGs and more from top brands.", image: "/images/banners/home-appliances.jpg", ctaText: "Shop Kitchen", ctaLink: "/categories/home-kitchen", bgColor: "#4caf50", sortOrder: 4 },
      { id: "banner-5", title: "Beauty Bonanza", subtitle: "Buy 2, Get 1 Free", description: "Skincare, makeup & haircare from Mamaearth, Lakme, Himalaya & more.", image: "/images/banners/beauty-bonanza.jpg", ctaText: "Shop Beauty", ctaLink: "/categories/beauty", bgColor: "#9c27b0", sortOrder: 5 },
      { id: "banner-6", title: "Fitness Starts Here", subtitle: "Sports & Fitness Gear from ₹499", description: "Running shoes, cricket bats, gym equipment — all at unbeatable prices.", image: "/images/banners/fitness.jpg", ctaText: "Get Fit", ctaLink: "/categories/sports", bgColor: "#2196f3", sortOrder: 6 },
    ],
  });
  console.log("✅ 6 banners created\n");

  // ─── Wishlist ───
  console.log("❤️  Creating wishlist...");
  await prisma.wishlist.createMany({
    data: [
      { userId: "user-1", productId: "prod-2" },
      { userId: "user-1", productId: "prod-8" },
      { userId: "user-1", productId: "prod-10" },
      { userId: "user-1", productId: "prod-23" },
    ],
  });
  console.log("✅ 4 wishlist items created\n");

  // ─── Orders ───
  console.log("📋 Creating orders...");
  const address1 = await prisma.address.findFirst({ where: { userId: "user-1", isDefault: true } });

  await prisma.order.create({
    data: {
      orderNumber: "XN-2024-001234",
      userId: "user-1",
      subtotal: 156989,
      discount: 5000,
      shipping: 0,
      tax: 27338,
      total: 179327,
      status: "DELIVERED",
      paymentMethod: "UPI",
      shippingAddressId: address1?.id,
      createdAt: new Date("2024-02-10"),
      estimatedDelivery: new Date("2024-02-15"),
      items: {
        create: [
          { productId: "prod-1", productName: "Samsung Galaxy S24 Ultra 5G", productImage: "/images/products/samsung-s24-ultra-1.jpg", quantity: 1, price: 129999, variant: "256GB / Titanium Black" },
          { productId: "prod-3", productName: "Sony WH-1000XM5 Wireless Headphones", productImage: "/images/products/sony-xm5-1.jpg", quantity: 1, price: 26990, variant: "Black" },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: "XN-2024-001567",
      userId: "user-1",
      subtotal: 1147,
      discount: 100,
      shipping: 40,
      tax: 195,
      total: 1282,
      status: "SHIPPED",
      paymentMethod: "Credit Card",
      shippingAddressId: address1?.id,
      createdAt: new Date("2024-06-20"),
      estimatedDelivery: new Date("2024-06-25"),
      items: {
        create: [
          { productId: "prod-13", productName: "Atomic Habits by James Clear", productImage: "/images/products/atomic-habits-1.jpg", quantity: 2, price: 399, variant: "Paperback" },
          { productId: "prod-6", productName: "Mamaearth Vitamin C Face Wash", productImage: "/images/products/mamaearth-facewash-1.jpg", quantity: 1, price: 349 },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: "XN-2024-002890",
      userId: "user-1",
      subtotal: 6999,
      discount: 0,
      shipping: 0,
      tax: 1260,
      total: 8259,
      status: "PROCESSING",
      paymentMethod: "Net Banking",
      shippingAddressId: address1?.id,
      createdAt: new Date("2024-07-05"),
      estimatedDelivery: new Date("2024-07-12"),
      items: {
        create: [
          { productId: "prod-22", productName: "Philips Air Fryer HD9200/90", productImage: "/images/products/philips-air-fryer-1.jpg", quantity: 1, price: 6999 },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: "XN-2024-003421",
      userId: "user-1",
      subtotal: 14294,
      discount: 1000,
      shipping: 0,
      tax: 2393,
      total: 15687,
      status: "CANCELLED",
      paymentMethod: "Debit Card",
      shippingAddressId: address1?.id,
      createdAt: new Date("2024-07-15"),
      estimatedDelivery: new Date("2024-07-22"),
      items: {
        create: [
          { productId: "prod-7", productName: "Nike Air Zoom Pegasus 41", productImage: "/images/products/nike-pegasus-41-1.jpg", quantity: 1, price: 10795, variant: "UK 9 / Black/White" },
          { productId: "prod-20", productName: "MuscleBlaze Biozyme Whey Protein", productImage: "/images/products/muscleblaze-whey-1.jpg", quantity: 1, price: 3499, variant: "Rich Chocolate / 1 kg" },
        ],
      },
    },
  });
  console.log("✅ 4 orders created\n");

  console.log("🎉 Seeding complete!");
  console.log("─".repeat(40));
  console.log("Users:           8 (1 customer, 6 sellers, 1 admin)");
  console.log("Addresses:       2");
  console.log("Seller Profiles: 6");
  console.log("Categories:      " + Object.keys(categorySlugToId).length);
  console.log("Products:        " + productsData.length);
  console.log("Reviews:         " + reviewsData.length);
  console.log("Coupons:         7");
  console.log("Banners:         6");
  console.log("Wishlist Items:  4");
  console.log("Orders:          4");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
