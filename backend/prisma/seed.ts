import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
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

  // ─── Admin User ───
  console.log("👤 Creating admin user...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      id: "admin-user-1",
      name: "Admin",
      email: "admin@xelnova.in",
      phone: "+91-9000000099",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created\n");

  // ─── Categories ───
  console.log("📂 Creating categories...");

  type SubcategoryData = {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
  };

  const categoryTree: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    children: SubcategoryData[];
  }[] = [
    {
      id: "cat-1",
      name: "Electronics",
      slug: "electronics",
      description: "Latest gadgets, smartphones, laptops, and accessories",
      image: "",
      children: [
        { id: "cat-1-1", name: "Smartphones", slug: "smartphones", description: "Latest smartphones", image: "" },
        { id: "cat-1-2", name: "Laptops", slug: "laptops", description: "Laptops & Notebooks", image: "" },
        { id: "cat-1-3", name: "Audio", slug: "audio", description: "Headphones, Speakers & Earbuds", image: "" },
        { id: "cat-1-4", name: "Wearables", slug: "wearables", description: "Smartwatches & Fitness Bands", image: "" },
        { id: "cat-1-5", name: "Cameras", slug: "cameras", description: "Cameras & Photography", image: "" },
        { id: "cat-1-6", name: "Accessories", slug: "electronics-accessories", description: "Phone cases, chargers, cables", image: "" },
      ],
    },
    {
      id: "cat-2",
      name: "Fashion",
      slug: "fashion",
      description: "Clothing, footwear, and accessories for men and women",
      image: "",
      children: [
        { id: "cat-2-1", name: "Men's Clothing", slug: "mens-clothing", description: "Men's fashion", image: "" },
        { id: "cat-2-2", name: "Women's Clothing", slug: "womens-clothing", description: "Women's fashion", image: "" },
        { id: "cat-2-3", name: "Footwear", slug: "footwear", description: "Shoes, sandals & more", image: "" },
        { id: "cat-2-4", name: "Watches", slug: "watches", description: "Watches for men & women", image: "" },
        { id: "cat-2-5", name: "Jewellery", slug: "jewellery", description: "Fashion & fine jewellery", image: "" },
      ],
    },
    {
      id: "cat-3",
      name: "Home & Kitchen",
      slug: "home-kitchen",
      description: "Furniture, decor, kitchen appliances, and more",
      image: "",
      children: [
        { id: "cat-3-1", name: "Furniture", slug: "furniture", description: "Beds, sofas, tables & chairs", image: "" },
        { id: "cat-3-2", name: "Kitchen Appliances", slug: "kitchen-appliances", description: "Mixers, ovens, cookers", image: "" },
        { id: "cat-3-3", name: "Home Decor", slug: "home-decor", description: "Decor, lighting, furnishing", image: "" },
        { id: "cat-3-4", name: "Storage & Organisation", slug: "storage-organisation", description: "Organisers, racks & shelves", image: "" },
      ],
    },
    {
      id: "cat-4",
      name: "Beauty & Personal Care",
      slug: "beauty",
      description: "Skincare, makeup, haircare, and grooming essentials",
      image: "",
      children: [
        { id: "cat-4-1", name: "Skincare", slug: "skincare", description: "Face wash, moisturizers, serums", image: "" },
        { id: "cat-4-2", name: "Makeup", slug: "makeup", description: "Lipstick, foundation, eyeshadow", image: "" },
        { id: "cat-4-3", name: "Haircare", slug: "haircare", description: "Shampoo, conditioner, oils", image: "" },
        { id: "cat-4-4", name: "Men's Grooming", slug: "mens-grooming", description: "Trimmers, shaving, perfumes", image: "" },
      ],
    },
    {
      id: "cat-5",
      name: "Sports & Fitness",
      slug: "sports",
      description: "Sports equipment, fitness gear, and activewear",
      image: "",
      children: [
        { id: "cat-5-1", name: "Cricket", slug: "cricket", description: "Bats, balls, pads & more", image: "" },
        { id: "cat-5-2", name: "Fitness Equipment", slug: "fitness-equipment", description: "Dumbbells, treadmills, mats", image: "" },
        { id: "cat-5-3", name: "Activewear", slug: "activewear", description: "Workout clothes & shoes", image: "" },
      ],
    },
    {
      id: "cat-6",
      name: "Books",
      slug: "books",
      description: "Fiction, non-fiction, academic, and kids books",
      image: "",
      children: [
        { id: "cat-6-1", name: "Fiction", slug: "fiction", description: "Novels, short stories, thrillers", image: "" },
        { id: "cat-6-2", name: "Non-Fiction", slug: "non-fiction", description: "Self-help, biographies, business", image: "" },
        { id: "cat-6-3", name: "Academic", slug: "academic", description: "Textbooks & reference", image: "" },
        { id: "cat-6-4", name: "Children's Books", slug: "childrens-books", description: "Picture books, chapter books", image: "" },
      ],
    },
    {
      id: "cat-7",
      name: "Toys & Games",
      slug: "toys",
      description: "Toys, games, and activities for kids of all ages",
      image: "",
      children: [
        { id: "cat-7-1", name: "Action Figures", slug: "action-figures", description: "Action figures & collectibles", image: "" },
        { id: "cat-7-2", name: "Board Games", slug: "board-games", description: "Board games & puzzles", image: "" },
        { id: "cat-7-3", name: "Educational Toys", slug: "educational-toys", description: "STEM & learning toys", image: "" },
      ],
    },
    {
      id: "cat-8",
      name: "Groceries",
      slug: "groceries",
      description: "Daily essentials, snacks, beverages, and organic food",
      image: "",
      children: [
        { id: "cat-8-1", name: "Staples", slug: "staples", description: "Rice, dal, flour, oil", image: "" },
        { id: "cat-8-2", name: "Snacks & Beverages", slug: "snacks-beverages", description: "Chips, drinks, tea, coffee", image: "" },
        { id: "cat-8-3", name: "Organic & Health", slug: "organic-health", description: "Organic food & supplements", image: "" },
      ],
    },
    {
      id: "cat-9",
      name: "Automotive",
      slug: "automotive",
      description: "Car and bike accessories, parts, and care products",
      image: "",
      children: [
        { id: "cat-9-1", name: "Car Accessories", slug: "car-accessories", description: "Covers, mats, electronics", image: "" },
        { id: "cat-9-2", name: "Bike Accessories", slug: "bike-accessories", description: "Helmets, gloves, covers", image: "" },
      ],
    },
    {
      id: "cat-10",
      name: "Health & Wellness",
      slug: "health",
      description: "Supplements, medical devices, and wellness products",
      image: "",
      children: [
        { id: "cat-10-1", name: "Supplements", slug: "supplements", description: "Vitamins, protein, ayurveda", image: "" },
        { id: "cat-10-2", name: "Medical Devices", slug: "medical-devices", description: "BP monitors, thermometers", image: "" },
        { id: "cat-10-3", name: "Wellness", slug: "wellness", description: "Essential oils, diffusers", image: "" },
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
        productCount: 0,
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
          productCount: 0,
        },
      });
      categorySlugToId[child.slug] = child.id;
    }
  }
  console.log(
    `✅ ${Object.keys(categorySlugToId).length} categories created\n`,
  );

  // ─── Default Admin Roles ───
  console.log("🔐 Creating default admin roles...");
  await prisma.adminRole.deleteMany();
  const defaultRoles = [
    { name: "Super Admin", permissions: "All Permissions", isSystem: true, users: 1 },
    { name: "Manager", permissions: "Products, Orders, Customers, Sellers, Payouts", isSystem: true, users: 0 },
    { name: "Support", permissions: "Orders, Customers", isSystem: true, users: 0 },
    { name: "Content Editor", permissions: "Banners, Pages, Categories, Brands", isSystem: false, users: 0 },
  ];
  for (const role of defaultRoles) {
    await prisma.adminRole.create({ data: role });
  }
  console.log(`✅ ${defaultRoles.length} admin roles created\n`);

  console.log("🎉 Seeding complete!");
  console.log("─".repeat(40));
  console.log("Users:           1 (admin)");
  console.log("Categories:      " + Object.keys(categorySlugToId).length);
  console.log("Admin Roles:     " + defaultRoles.length);
  console.log("Products:        0 (sellers add their own)");
  console.log("Banners:         0 (admin adds via panel)");
  console.log("Coupons:         0 (admin adds via panel)");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
