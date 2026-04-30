import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { upsertEcommerceDemoData } from "./seed-ecommerce";

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
  await prisma.brand.deleteMany();
  await prisma.cmsPage.deleteMany();
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

  // ─── Categories (3-level tree) ───
  console.log("📂 Creating categories...");

  type GrandchildData = { id: string; name: string; slug: string; desc: string };
  type ChildData = { id: string; name: string; slug: string; desc: string; children?: GrandchildData[] };
  type RootData = { id: string; name: string; slug: string; desc: string; children: ChildData[] };

  const categoryTree: RootData[] = [
    {
      id: "cat-1", name: "Electronics", slug: "electronics", desc: "Gadgets, smartphones, laptops & accessories",
      children: [
        { id: "cat-1-1", name: "Smartphones", slug: "smartphones", desc: "Latest smartphones", children: [
          { id: "cat-1-1-1", name: "Android Phones", slug: "android-phones", desc: "Samsung, OnePlus, Xiaomi & more" },
          { id: "cat-1-1-2", name: "iPhones", slug: "iphones", desc: "Apple iPhones" },
          { id: "cat-1-1-3", name: "Feature Phones", slug: "feature-phones", desc: "Basic & keypad phones" },
        ]},
        { id: "cat-1-2", name: "Laptops & Computers", slug: "laptops", desc: "Laptops, desktops & accessories", children: [
          { id: "cat-1-2-1", name: "Gaming Laptops", slug: "gaming-laptops", desc: "High-performance gaming" },
          { id: "cat-1-2-2", name: "Business Laptops", slug: "business-laptops", desc: "Ultrabooks & thin laptops" },
          { id: "cat-1-2-3", name: "Desktop PCs", slug: "desktop-pcs", desc: "Desktop computers & monitors" },
          { id: "cat-1-2-4", name: "Computer Peripherals", slug: "computer-peripherals", desc: "Keyboards, mice, webcams" },
        ]},
        { id: "cat-1-3", name: "Audio", slug: "audio", desc: "Headphones, speakers & earbuds", children: [
          { id: "cat-1-3-1", name: "Earbuds & In-ear", slug: "earbuds", desc: "TWS & wired earbuds" },
          { id: "cat-1-3-2", name: "Headphones", slug: "headphones", desc: "Over-ear & on-ear headphones" },
          { id: "cat-1-3-3", name: "Speakers", slug: "speakers", desc: "Bluetooth & smart speakers" },
          { id: "cat-1-3-4", name: "Soundbars", slug: "soundbars", desc: "Soundbars & home theatre" },
        ]},
        { id: "cat-1-4", name: "Wearables", slug: "wearables", desc: "Smartwatches & fitness bands", children: [
          { id: "cat-1-4-1", name: "Smartwatches", slug: "smartwatches", desc: "Apple, Samsung, Noise & more" },
          { id: "cat-1-4-2", name: "Fitness Bands", slug: "fitness-bands", desc: "Activity & health trackers" },
        ]},
        { id: "cat-1-5", name: "Cameras & Photography", slug: "cameras", desc: "DSLRs, mirrorless & action cams", children: [
          { id: "cat-1-5-1", name: "DSLR Cameras", slug: "dslr-cameras", desc: "Canon, Nikon, Sony DSLRs" },
          { id: "cat-1-5-2", name: "Mirrorless Cameras", slug: "mirrorless-cameras", desc: "Compact mirrorless systems" },
          { id: "cat-1-5-3", name: "Action Cameras", slug: "action-cameras", desc: "GoPro & adventure cameras" },
          { id: "cat-1-5-4", name: "Camera Accessories", slug: "camera-accessories", desc: "Lenses, tripods, bags" },
        ]},
        { id: "cat-1-6", name: "Mobile Accessories", slug: "mobile-accessories", desc: "Cases, chargers & cables", children: [
          { id: "cat-1-6-1", name: "Phone Cases & Covers", slug: "phone-cases", desc: "Protective cases & covers" },
          { id: "cat-1-6-2", name: "Chargers & Cables", slug: "chargers-cables", desc: "Fast chargers, USB cables" },
          { id: "cat-1-6-3", name: "Screen Protectors", slug: "screen-protectors", desc: "Tempered glass & films" },
          { id: "cat-1-6-4", name: "Power Banks", slug: "power-banks", desc: "Portable power banks" },
        ]},
        { id: "cat-1-7", name: "Tablets & E-readers", slug: "tablets", desc: "iPads, Android tablets & Kindle", children: [
          { id: "cat-1-7-1", name: "iPads", slug: "ipads", desc: "Apple iPads" },
          { id: "cat-1-7-2", name: "Android Tablets", slug: "android-tablets", desc: "Samsung, Lenovo tablets" },
          { id: "cat-1-7-3", name: "E-readers", slug: "e-readers", desc: "Kindle & e-ink readers" },
        ]},
        { id: "cat-1-8", name: "TV & Home Entertainment", slug: "tv-home-entertainment", desc: "Smart TVs, projectors & streaming", children: [
          { id: "cat-1-8-1", name: "Smart TVs", slug: "smart-tvs", desc: "LED, OLED, QLED TVs" },
          { id: "cat-1-8-2", name: "Projectors", slug: "projectors", desc: "Home & portable projectors" },
          { id: "cat-1-8-3", name: "Streaming Devices", slug: "streaming-devices", desc: "Fire TV, Chromecast, Roku" },
        ]},
      ],
    },
    {
      id: "cat-2", name: "Fashion", slug: "fashion", desc: "Clothing, footwear & accessories",
      children: [
        { id: "cat-2-1", name: "Men's Clothing", slug: "mens-clothing", desc: "Men's fashion & apparel", children: [
          { id: "cat-2-1-1", name: "T-Shirts & Polos", slug: "mens-tshirts", desc: "Casual & printed t-shirts" },
          { id: "cat-2-1-2", name: "Shirts", slug: "mens-shirts", desc: "Formal & casual shirts" },
          { id: "cat-2-1-3", name: "Jeans & Trousers", slug: "mens-jeans", desc: "Denim, chinos & formals" },
          { id: "cat-2-1-4", name: "Ethnic Wear", slug: "mens-ethnic", desc: "Kurtas, sherwanis, dhotis" },
          { id: "cat-2-1-5", name: "Winter Wear", slug: "mens-winter", desc: "Jackets, sweaters, hoodies" },
          { id: "cat-2-1-6", name: "Innerwear & Loungewear", slug: "mens-innerwear", desc: "Vests, boxers, pyjamas" },
        ]},
        { id: "cat-2-2", name: "Women's Clothing", slug: "womens-clothing", desc: "Women's fashion & apparel", children: [
          { id: "cat-2-2-1", name: "Sarees", slug: "sarees", desc: "Silk, cotton, designer sarees" },
          { id: "cat-2-2-2", name: "Kurtis & Suits", slug: "kurtis-suits", desc: "Kurtis, salwar suits, dupattas" },
          { id: "cat-2-2-3", name: "Tops & T-Shirts", slug: "womens-tops", desc: "Casual tops & tees" },
          { id: "cat-2-2-4", name: "Dresses & Gowns", slug: "dresses-gowns", desc: "Party, casual & western dresses" },
          { id: "cat-2-2-5", name: "Leggings & Palazzos", slug: "leggings-palazzos", desc: "Leggings, palazzos, pants" },
          { id: "cat-2-2-6", name: "Lingerie & Sleepwear", slug: "womens-lingerie", desc: "Bras, panties, nightwear" },
        ]},
        { id: "cat-2-3", name: "Kids' Fashion", slug: "kids-fashion", desc: "Clothing for boys & girls", children: [
          { id: "cat-2-3-1", name: "Boys' Clothing", slug: "boys-clothing", desc: "T-shirts, shorts, jeans" },
          { id: "cat-2-3-2", name: "Girls' Clothing", slug: "girls-clothing", desc: "Dresses, tops, leggings" },
          { id: "cat-2-3-3", name: "Baby Clothing", slug: "baby-clothing", desc: "Infant & newborn wear (0-2 yrs)" },
          { id: "cat-2-3-4", name: "School Uniforms", slug: "school-uniforms", desc: "Uniforms, shoes, belts" },
        ]},
        { id: "cat-2-4", name: "Footwear", slug: "footwear", desc: "Shoes, sandals & more", children: [
          { id: "cat-2-4-1", name: "Men's Casual Shoes", slug: "mens-casual-shoes", desc: "Sneakers, loafers, slip-ons" },
          { id: "cat-2-4-2", name: "Men's Formal Shoes", slug: "mens-formal-shoes", desc: "Oxford, derby, brogues" },
          { id: "cat-2-4-3", name: "Women's Flats & Heels", slug: "womens-flats-heels", desc: "Flats, heels, wedges" },
          { id: "cat-2-4-4", name: "Sports Shoes", slug: "sports-shoes", desc: "Running, training & gym shoes" },
          { id: "cat-2-4-5", name: "Sandals & Slippers", slug: "sandals-slippers", desc: "Flip-flops, slides, chappals" },
          { id: "cat-2-4-6", name: "Kids' Footwear", slug: "kids-footwear", desc: "School shoes, sandals, sneakers" },
        ]},
        { id: "cat-2-5", name: "Watches", slug: "watches", desc: "Watches for men & women", children: [
          { id: "cat-2-5-1", name: "Men's Watches", slug: "mens-watches", desc: "Analog, digital, chronograph" },
          { id: "cat-2-5-2", name: "Women's Watches", slug: "womens-watches", desc: "Fashion & luxury watches" },
        ]},
        { id: "cat-2-6", name: "Jewellery", slug: "jewellery", desc: "Fashion & fine jewellery", children: [
          { id: "cat-2-6-1", name: "Gold & Diamond", slug: "gold-diamond", desc: "Gold, diamond, precious stones" },
          { id: "cat-2-6-2", name: "Silver Jewellery", slug: "silver-jewellery", desc: "Silver rings, chains, earrings" },
          { id: "cat-2-6-3", name: "Fashion Jewellery", slug: "fashion-jewellery", desc: "Imitation & costume jewellery" },
        ]},
        { id: "cat-2-7", name: "Bags & Luggage", slug: "bags-luggage", desc: "Backpacks, handbags, suitcases", children: [
          { id: "cat-2-7-1", name: "Backpacks", slug: "backpacks", desc: "Laptop, college & travel backpacks" },
          { id: "cat-2-7-2", name: "Handbags", slug: "handbags", desc: "Tote, sling, clutch bags" },
          { id: "cat-2-7-3", name: "Suitcases & Trolleys", slug: "suitcases-trolleys", desc: "Travel luggage & trolley bags" },
          { id: "cat-2-7-4", name: "Wallets & Belts", slug: "wallets-belts", desc: "Leather wallets, belts, card holders" },
        ]},
        { id: "cat-2-8", name: "Sunglasses & Eyewear", slug: "eyewear", desc: "Sunglasses, frames & lenses", children: [
          { id: "cat-2-8-1", name: "Men's Sunglasses", slug: "mens-sunglasses", desc: "Aviator, wayfarer, sport" },
          { id: "cat-2-8-2", name: "Women's Sunglasses", slug: "womens-sunglasses", desc: "Cat-eye, round, oversized" },
          { id: "cat-2-8-3", name: "Eyeglasses & Frames", slug: "eyeglasses-frames", desc: "Prescription frames & readers" },
        ]},
      ],
    },
    {
      id: "cat-3", name: "Home & Kitchen", slug: "home-kitchen", desc: "Furniture, decor, kitchen appliances & more",
      children: [
        { id: "cat-3-1", name: "Furniture", slug: "furniture", desc: "Beds, sofas, tables & chairs", children: [
          { id: "cat-3-1-1", name: "Beds & Mattresses", slug: "beds-mattresses", desc: "King, queen, single beds" },
          { id: "cat-3-1-2", name: "Sofas & Recliners", slug: "sofas-recliners", desc: "Sofas, sectionals, recliners" },
          { id: "cat-3-1-3", name: "Tables & Desks", slug: "tables-desks", desc: "Dining, study, office desks" },
          { id: "cat-3-1-4", name: "Chairs & Seating", slug: "chairs-seating", desc: "Office chairs, dining chairs" },
          { id: "cat-3-1-5", name: "Wardrobes & Storage", slug: "wardrobes-storage", desc: "Wardrobes, dressers, shoe racks" },
        ]},
        { id: "cat-3-2", name: "Kitchen & Dining", slug: "kitchen-dining", desc: "Cookware, appliances & dining", children: [
          { id: "cat-3-2-1", name: "Cookware", slug: "cookware", desc: "Pans, pots, kadhai, tawas" },
          { id: "cat-3-2-2", name: "Kitchen Appliances", slug: "kitchen-appliances", desc: "Mixers, ovens, cookers, blenders" },
          { id: "cat-3-2-3", name: "Dinnerware", slug: "dinnerware", desc: "Plates, cups, cutlery sets" },
          { id: "cat-3-2-4", name: "Kitchen Storage", slug: "kitchen-storage", desc: "Containers, racks, organisers" },
          { id: "cat-3-2-5", name: "Water Purifiers", slug: "water-purifiers", desc: "RO, UV & gravity purifiers" },
        ]},
        { id: "cat-3-3", name: "Home Decor", slug: "home-decor", desc: "Decor, lighting & furnishing", children: [
          { id: "cat-3-3-1", name: "Wall Decor", slug: "wall-decor", desc: "Paintings, mirrors, wall shelves" },
          { id: "cat-3-3-2", name: "Lighting", slug: "lighting", desc: "Lamps, fairy lights, chandeliers" },
          { id: "cat-3-3-3", name: "Curtains & Blinds", slug: "curtains-blinds", desc: "Window curtains & Roman blinds" },
          { id: "cat-3-3-4", name: "Cushions & Throws", slug: "cushions-throws", desc: "Decorative cushions & pillows" },
        ]},
        { id: "cat-3-4", name: "Home Improvement", slug: "home-improvement", desc: "Tools, electrical & plumbing", children: [
          { id: "cat-3-4-1", name: "Power Tools", slug: "power-tools", desc: "Drills, saws, sanders" },
          { id: "cat-3-4-2", name: "Hand Tools", slug: "hand-tools", desc: "Screwdrivers, hammers, pliers" },
          { id: "cat-3-4-3", name: "Electrical Fittings", slug: "electrical-fittings", desc: "Switches, LEDs, wiring" },
          { id: "cat-3-4-4", name: "Bathroom Fittings", slug: "bathroom-fittings", desc: "Faucets, showers, accessories" },
        ]},
        { id: "cat-3-5", name: "Bed & Bath", slug: "bed-bath", desc: "Bedsheets, towels & bath essentials", children: [
          { id: "cat-3-5-1", name: "Bedsheets & Pillows", slug: "bedsheets-pillows", desc: "Cotton, satin, microfiber" },
          { id: "cat-3-5-2", name: "Towels & Bath Robes", slug: "towels-bath-robes", desc: "Bath towels, hand towels" },
          { id: "cat-3-5-3", name: "Blankets & Quilts", slug: "blankets-quilts", desc: "Comforters, duvets, AC blankets" },
        ]},
        { id: "cat-3-6", name: "Garden & Outdoors", slug: "garden-outdoors", desc: "Plants, pots, garden tools", children: [
          { id: "cat-3-6-1", name: "Planters & Pots", slug: "planters-pots", desc: "Ceramic, plastic, hanging pots" },
          { id: "cat-3-6-2", name: "Garden Tools", slug: "garden-tools", desc: "Shovels, hoses, sprinklers" },
          { id: "cat-3-6-3", name: "Outdoor Furniture", slug: "outdoor-furniture", desc: "Patio sets, swings, hammocks" },
        ]},
      ],
    },
    {
      id: "cat-4", name: "Beauty & Personal Care", slug: "beauty", desc: "Skincare, makeup, haircare & grooming",
      children: [
        { id: "cat-4-1", name: "Skincare", slug: "skincare", desc: "Face wash, moisturizers, serums", children: [
          { id: "cat-4-1-1", name: "Face Wash & Cleansers", slug: "face-wash-cleansers", desc: "Gel, foam, micellar water" },
          { id: "cat-4-1-2", name: "Moisturizers & Creams", slug: "moisturizers-creams", desc: "Day cream, night cream, gel" },
          { id: "cat-4-1-3", name: "Serums & Essences", slug: "serums-essences", desc: "Vitamin C, hyaluronic, niacinamide" },
          { id: "cat-4-1-4", name: "Sunscreen", slug: "sunscreen", desc: "SPF lotions & gels" },
          { id: "cat-4-1-5", name: "Face Masks & Packs", slug: "face-masks", desc: "Sheet masks, clay masks, peels" },
        ]},
        { id: "cat-4-2", name: "Makeup", slug: "makeup", desc: "Lipstick, foundation, eyeshadow", children: [
          { id: "cat-4-2-1", name: "Lipstick & Lip Care", slug: "lipstick-lip-care", desc: "Lipstick, gloss, lip balm" },
          { id: "cat-4-2-2", name: "Foundation & Concealer", slug: "foundation-concealer", desc: "Foundation, BB cream, primer" },
          { id: "cat-4-2-3", name: "Eye Makeup", slug: "eye-makeup", desc: "Eyeliner, mascara, eyeshadow" },
          { id: "cat-4-2-4", name: "Nail Polish", slug: "nail-polish", desc: "Nail polish, art, removers" },
        ]},
        { id: "cat-4-3", name: "Haircare", slug: "haircare", desc: "Shampoo, conditioner, oils", children: [
          { id: "cat-4-3-1", name: "Shampoo & Conditioner", slug: "shampoo-conditioner", desc: "Anti-dandruff, keratin, herbal" },
          { id: "cat-4-3-2", name: "Hair Oil & Serum", slug: "hair-oil-serum", desc: "Coconut, argan, growth serums" },
          { id: "cat-4-3-3", name: "Hair Styling", slug: "hair-styling", desc: "Dryers, straighteners, curlers" },
          { id: "cat-4-3-4", name: "Hair Colour", slug: "hair-colour", desc: "Permanent, temporary, henna" },
        ]},
        { id: "cat-4-4", name: "Men's Grooming", slug: "mens-grooming", desc: "Trimmers, shaving, perfumes", children: [
          { id: "cat-4-4-1", name: "Trimmers & Shavers", slug: "trimmers-shavers", desc: "Electric trimmers, razors" },
          { id: "cat-4-4-2", name: "Shaving Cream & Gel", slug: "shaving-cream-gel", desc: "Pre-shave & after-shave" },
          { id: "cat-4-4-3", name: "Beard Care", slug: "beard-care", desc: "Beard oil, wax, balm" },
        ]},
        { id: "cat-4-5", name: "Fragrances", slug: "fragrances", desc: "Perfumes, deodorants & body mist", children: [
          { id: "cat-4-5-1", name: "Perfumes", slug: "perfumes", desc: "EDP, EDT, luxury perfumes" },
          { id: "cat-4-5-2", name: "Deodorants", slug: "deodorants", desc: "Roll-on, spray, sticks" },
          { id: "cat-4-5-3", name: "Body Mists", slug: "body-mists", desc: "Light body sprays & mists" },
        ]},
        { id: "cat-4-6", name: "Bath & Body", slug: "bath-body", desc: "Soap, shower gel, body lotion", children: [
          { id: "cat-4-6-1", name: "Soap & Shower Gel", slug: "soap-shower-gel", desc: "Body wash, bathing bars" },
          { id: "cat-4-6-2", name: "Body Lotion & Cream", slug: "body-lotion-cream", desc: "Moisturizing lotions, butters" },
          { id: "cat-4-6-3", name: "Hand Wash & Sanitizer", slug: "hand-wash-sanitizer", desc: "Liquid hand wash, sanitizers" },
        ]},
      ],
    },
    {
      id: "cat-5", name: "Sports & Fitness", slug: "sports", desc: "Sports equipment, fitness gear & activewear",
      children: [
        { id: "cat-5-1", name: "Cricket", slug: "cricket", desc: "Bats, balls, pads & more", children: [
          { id: "cat-5-1-1", name: "Cricket Bats", slug: "cricket-bats", desc: "English willow, Kashmir willow" },
          { id: "cat-5-1-2", name: "Cricket Balls", slug: "cricket-balls", desc: "Leather, tennis, practice balls" },
          { id: "cat-5-1-3", name: "Protective Gear", slug: "cricket-protective", desc: "Pads, gloves, helmets, guards" },
        ]},
        { id: "cat-5-2", name: "Fitness Equipment", slug: "fitness-equipment", desc: "Dumbbells, treadmills, mats", children: [
          { id: "cat-5-2-1", name: "Dumbbells & Weights", slug: "dumbbells-weights", desc: "Free weights, kettlebells" },
          { id: "cat-5-2-2", name: "Treadmills & Cycles", slug: "treadmills-cycles", desc: "Running, cycling machines" },
          { id: "cat-5-2-3", name: "Yoga & Pilates", slug: "yoga-pilates", desc: "Mats, blocks, resistance bands" },
          { id: "cat-5-2-4", name: "Gym Accessories", slug: "gym-accessories", desc: "Gloves, straps, shakers" },
        ]},
        { id: "cat-5-3", name: "Activewear", slug: "activewear", desc: "Workout clothes & shoes", children: [
          { id: "cat-5-3-1", name: "Men's Activewear", slug: "mens-activewear", desc: "Shorts, t-shirts, track pants" },
          { id: "cat-5-3-2", name: "Women's Activewear", slug: "womens-activewear", desc: "Sports bras, leggings, tanks" },
        ]},
        { id: "cat-5-4", name: "Badminton", slug: "badminton", desc: "Rackets, shuttles & shoes", children: [
          { id: "cat-5-4-1", name: "Badminton Rackets", slug: "badminton-rackets", desc: "Yonex, Li-Ning, Victor" },
          { id: "cat-5-4-2", name: "Shuttlecocks", slug: "shuttlecocks", desc: "Feather & nylon shuttles" },
        ]},
        { id: "cat-5-5", name: "Football", slug: "football", desc: "Footballs, boots & gear", children: [
          { id: "cat-5-5-1", name: "Footballs", slug: "footballs", desc: "Match, training, futsal balls" },
          { id: "cat-5-5-2", name: "Football Boots", slug: "football-boots", desc: "Studs, turf, indoor shoes" },
        ]},
        { id: "cat-5-6", name: "Cycling", slug: "cycling", desc: "Bicycles, helmets & accessories", children: [
          { id: "cat-5-6-1", name: "Bicycles", slug: "bicycles", desc: "Mountain, road, hybrid bikes" },
          { id: "cat-5-6-2", name: "Cycling Gear", slug: "cycling-gear", desc: "Helmets, gloves, lights" },
        ]},
        { id: "cat-5-7", name: "Swimming", slug: "swimming", desc: "Swimwear, goggles, caps", children: [
          { id: "cat-5-7-1", name: "Swimwear", slug: "swimwear", desc: "Swimsuits, trunks, bikinis" },
          { id: "cat-5-7-2", name: "Swimming Accessories", slug: "swimming-accessories", desc: "Goggles, caps, floats" },
        ]},
      ],
    },
    {
      id: "cat-6", name: "Books", slug: "books", desc: "Fiction, non-fiction, academic & kids books",
      children: [
        { id: "cat-6-1", name: "Fiction", slug: "fiction", desc: "Novels, short stories, thrillers", children: [
          { id: "cat-6-1-1", name: "Literary Fiction", slug: "literary-fiction", desc: "Classic & contemporary literature" },
          { id: "cat-6-1-2", name: "Thriller & Mystery", slug: "thriller-mystery", desc: "Crime, suspense, detective" },
          { id: "cat-6-1-3", name: "Romance", slug: "romance", desc: "Contemporary & historical romance" },
          { id: "cat-6-1-4", name: "Science Fiction & Fantasy", slug: "sci-fi-fantasy", desc: "Sci-fi, fantasy, dystopian" },
        ]},
        { id: "cat-6-2", name: "Non-Fiction", slug: "non-fiction", desc: "Self-help, biographies, business", children: [
          { id: "cat-6-2-1", name: "Self-Help", slug: "self-help", desc: "Personal development & motivation" },
          { id: "cat-6-2-2", name: "Biographies", slug: "biographies", desc: "Autobiographies & memoirs" },
          { id: "cat-6-2-3", name: "Business & Finance", slug: "business-finance", desc: "Investing, entrepreneurship" },
          { id: "cat-6-2-4", name: "Health & Wellness", slug: "health-wellness-books", desc: "Diet, fitness, mental health" },
        ]},
        { id: "cat-6-3", name: "Academic & Exam Prep", slug: "academic", desc: "Textbooks, competitive exams", children: [
          { id: "cat-6-3-1", name: "School Textbooks", slug: "school-textbooks", desc: "NCERT, ICSE, state boards" },
          { id: "cat-6-3-2", name: "Competitive Exams", slug: "competitive-exams", desc: "UPSC, SSC, Banking, CAT" },
          { id: "cat-6-3-3", name: "Engineering & Medical", slug: "engineering-medical", desc: "JEE, NEET, GATE preparation" },
        ]},
        { id: "cat-6-4", name: "Children's Books", slug: "childrens-books", desc: "Picture books, story books", children: [
          { id: "cat-6-4-1", name: "Picture Books", slug: "picture-books", desc: "Illustrated books for ages 0-5" },
          { id: "cat-6-4-2", name: "Chapter Books", slug: "chapter-books", desc: "Early readers for ages 5-10" },
          { id: "cat-6-4-3", name: "Comics & Graphic Novels", slug: "comics-graphic-novels", desc: "Amar Chitra Katha, Tinkle, Marvel" },
        ]},
      ],
    },
    {
      id: "cat-7", name: "Toys & Games", slug: "toys", desc: "Toys, games & activities for all ages",
      children: [
        { id: "cat-7-1", name: "Action Figures & Dolls", slug: "action-figures", desc: "Action figures, dolls, collectibles", children: [
          { id: "cat-7-1-1", name: "Action Figures", slug: "action-figures-toys", desc: "Marvel, DC, Transformers" },
          { id: "cat-7-1-2", name: "Dolls & Accessories", slug: "dolls-accessories", desc: "Barbie, baby dolls, doll houses" },
          { id: "cat-7-1-3", name: "Soft Toys", slug: "soft-toys", desc: "Teddy bears, stuffed animals" },
        ]},
        { id: "cat-7-2", name: "Board Games & Puzzles", slug: "board-games", desc: "Board games, puzzles, card games", children: [
          { id: "cat-7-2-1", name: "Board Games", slug: "board-games-classic", desc: "Monopoly, Ludo, Chess, Scrabble" },
          { id: "cat-7-2-2", name: "Jigsaw Puzzles", slug: "jigsaw-puzzles", desc: "100 to 1000+ piece puzzles" },
          { id: "cat-7-2-3", name: "Card Games", slug: "card-games", desc: "UNO, playing cards, trading cards" },
        ]},
        { id: "cat-7-3", name: "Educational Toys", slug: "educational-toys", desc: "STEM, learning & development", children: [
          { id: "cat-7-3-1", name: "STEM Toys", slug: "stem-toys", desc: "Science kits, robotics, coding" },
          { id: "cat-7-3-2", name: "Building Blocks", slug: "building-blocks", desc: "LEGO, Mechanix, magnetic tiles" },
          { id: "cat-7-3-3", name: "Learning Tablets", slug: "learning-tablets", desc: "Kids tablets, e-learning devices" },
        ]},
        { id: "cat-7-4", name: "Remote Control Toys", slug: "rc-toys", desc: "RC cars, drones, helicopters", children: [
          { id: "cat-7-4-1", name: "RC Cars & Trucks", slug: "rc-cars-trucks", desc: "Off-road, racing, monster trucks" },
          { id: "cat-7-4-2", name: "Drones", slug: "drones", desc: "Camera drones, mini drones" },
        ]},
        { id: "cat-7-5", name: "Outdoor Play", slug: "outdoor-play", desc: "Cycles, scooters, slides", children: [
          { id: "cat-7-5-1", name: "Kids' Cycles", slug: "kids-cycles", desc: "Training wheels, balance bikes" },
          { id: "cat-7-5-2", name: "Scooters & Skates", slug: "scooters-skates", desc: "Kick scooters, roller skates" },
          { id: "cat-7-5-3", name: "Swings & Slides", slug: "swings-slides", desc: "Garden swings, play sets" },
        ]},
      ],
    },
    {
      id: "cat-8", name: "Groceries & Gourmet", slug: "groceries", desc: "Daily essentials, snacks, beverages & organic food",
      children: [
        { id: "cat-8-1", name: "Staples", slug: "staples", desc: "Rice, dal, flour, oil", children: [
          { id: "cat-8-1-1", name: "Rice & Grains", slug: "rice-grains", desc: "Basmati, brown rice, millets" },
          { id: "cat-8-1-2", name: "Dals & Pulses", slug: "dals-pulses", desc: "Toor, moong, chana, masoor" },
          { id: "cat-8-1-3", name: "Flour & Atta", slug: "flour-atta", desc: "Wheat atta, maida, besan" },
          { id: "cat-8-1-4", name: "Cooking Oil & Ghee", slug: "cooking-oil-ghee", desc: "Mustard, sunflower, ghee" },
          { id: "cat-8-1-5", name: "Sugar, Salt & Spices", slug: "sugar-salt-spices", desc: "Masala, turmeric, salt" },
        ]},
        { id: "cat-8-2", name: "Snacks & Beverages", slug: "snacks-beverages", desc: "Chips, drinks, tea, coffee", children: [
          { id: "cat-8-2-1", name: "Biscuits & Cookies", slug: "biscuits-cookies", desc: "Cream, digestive, premium cookies" },
          { id: "cat-8-2-2", name: "Namkeen & Chips", slug: "namkeen-chips", desc: "Haldiram's, Lay's, bhujia" },
          { id: "cat-8-2-3", name: "Tea & Coffee", slug: "tea-coffee", desc: "Green tea, filter coffee, instant" },
          { id: "cat-8-2-4", name: "Chocolates & Sweets", slug: "chocolates-sweets", desc: "Cadbury, Ferrero, traditional mithai" },
          { id: "cat-8-2-5", name: "Juices & Drinks", slug: "juices-drinks", desc: "Fruit juices, health drinks" },
        ]},
        { id: "cat-8-3", name: "Dairy & Eggs", slug: "dairy-eggs", desc: "Milk, curd, paneer, eggs", children: [
          { id: "cat-8-3-1", name: "Milk & Cream", slug: "milk-cream", desc: "Fresh milk, cream, buttermilk" },
          { id: "cat-8-3-2", name: "Cheese & Paneer", slug: "cheese-paneer", desc: "Mozzarella, cheddar, tofu" },
          { id: "cat-8-3-3", name: "Eggs", slug: "eggs", desc: "Farm fresh & organic eggs" },
        ]},
        { id: "cat-8-4", name: "Organic & Health Food", slug: "organic-health", desc: "Organic food & superfoods", children: [
          { id: "cat-8-4-1", name: "Organic Staples", slug: "organic-staples", desc: "Organic rice, dal, atta" },
          { id: "cat-8-4-2", name: "Superfoods", slug: "superfoods", desc: "Quinoa, chia seeds, flax seeds" },
          { id: "cat-8-4-3", name: "Health Bars & Snacks", slug: "health-bars-snacks", desc: "Protein bars, dried fruits" },
        ]},
        { id: "cat-8-5", name: "Frozen & Ready-to-eat", slug: "frozen-ready-eat", desc: "Frozen foods & instant meals", children: [
          { id: "cat-8-5-1", name: "Frozen Vegetables", slug: "frozen-vegetables", desc: "Peas, corn, mixed veggies" },
          { id: "cat-8-5-2", name: "Frozen Snacks", slug: "frozen-snacks", desc: "Samosas, parathas, nuggets" },
          { id: "cat-8-5-3", name: "Instant Noodles & Pasta", slug: "instant-noodles-pasta", desc: "Maggi, pasta, cup noodles" },
        ]},
      ],
    },
    {
      id: "cat-9", name: "Automotive", slug: "automotive", desc: "Car & bike accessories, parts & care",
      children: [
        { id: "cat-9-1", name: "Car Accessories", slug: "car-accessories", desc: "Covers, mats, electronics", children: [
          { id: "cat-9-1-1", name: "Car Electronics", slug: "car-electronics", desc: "Dash cams, GPS, chargers" },
          { id: "cat-9-1-2", name: "Car Interior", slug: "car-interior", desc: "Seat covers, mats, cushions" },
          { id: "cat-9-1-3", name: "Car Exterior", slug: "car-exterior", desc: "Body covers, sun shades" },
          { id: "cat-9-1-4", name: "Car Care", slug: "car-care", desc: "Polish, wax, cleaning kits" },
        ]},
        { id: "cat-9-2", name: "Bike Accessories", slug: "bike-accessories", desc: "Helmets, gloves, riding gear", children: [
          { id: "cat-9-2-1", name: "Helmets", slug: "helmets", desc: "Full-face, half-face, modular" },
          { id: "cat-9-2-2", name: "Riding Gear", slug: "riding-gear", desc: "Jackets, gloves, knee guards" },
          { id: "cat-9-2-3", name: "Bike Covers", slug: "bike-covers", desc: "Waterproof & UV-resistant covers" },
        ]},
        { id: "cat-9-3", name: "Car & Bike Parts", slug: "auto-parts", desc: "Tyres, batteries, spares", children: [
          { id: "cat-9-3-1", name: "Tyres & Alloys", slug: "tyres-alloys", desc: "Car & bike tyres, alloy wheels" },
          { id: "cat-9-3-2", name: "Batteries", slug: "auto-batteries", desc: "Car & bike batteries" },
          { id: "cat-9-3-3", name: "Oils & Lubricants", slug: "oils-lubricants", desc: "Engine oil, brake fluid" },
        ]},
      ],
    },
    {
      id: "cat-10", name: "Health & Wellness", slug: "health", desc: "Supplements, medical devices & wellness",
      children: [
        { id: "cat-10-1", name: "Vitamins & Supplements", slug: "supplements", desc: "Vitamins, protein, omega-3", children: [
          { id: "cat-10-1-1", name: "Multivitamins", slug: "multivitamins", desc: "Daily multivitamin capsules & tablets" },
          { id: "cat-10-1-2", name: "Protein & Nutrition", slug: "protein-nutrition", desc: "Whey, plant protein, mass gainers" },
          { id: "cat-10-1-3", name: "Ayurveda & Herbal", slug: "ayurveda-herbal", desc: "Ashwagandha, triphala, giloy" },
        ]},
        { id: "cat-10-2", name: "Medical Devices", slug: "medical-devices", desc: "BP monitors, thermometers", children: [
          { id: "cat-10-2-1", name: "BP Monitors", slug: "bp-monitors", desc: "Digital blood pressure monitors" },
          { id: "cat-10-2-2", name: "Glucometers", slug: "glucometers", desc: "Blood sugar testing kits" },
          { id: "cat-10-2-3", name: "Thermometers", slug: "thermometers", desc: "Digital & infrared thermometers" },
          { id: "cat-10-2-4", name: "Oximeters", slug: "oximeters", desc: "Pulse oximeters" },
        ]},
        { id: "cat-10-3", name: "Wellness & Relaxation", slug: "wellness", desc: "Essential oils, diffusers, massagers", children: [
          { id: "cat-10-3-1", name: "Essential Oils", slug: "essential-oils", desc: "Lavender, tea tree, eucalyptus" },
          { id: "cat-10-3-2", name: "Diffusers & Humidifiers", slug: "diffusers-humidifiers", desc: "Aroma diffusers, cool mist" },
          { id: "cat-10-3-3", name: "Massagers", slug: "massagers", desc: "Foot, neck, body massagers" },
        ]},
        { id: "cat-10-4", name: "Sexual Wellness", slug: "sexual-wellness", desc: "Condoms, lubricants & wellness", children: [
          { id: "cat-10-4-1", name: "Condoms", slug: "condoms", desc: "Durex, Manforce, Skore" },
          { id: "cat-10-4-2", name: "Lubricants", slug: "lubricants", desc: "Water-based, silicone-based" },
        ]},
      ],
    },
    {
      id: "cat-11", name: "Baby & Kids", slug: "baby-kids", desc: "Diapers, feeding, baby care & nursery",
      children: [
        { id: "cat-11-1", name: "Diapering", slug: "diapering", desc: "Diapers, wipes & rash cream", children: [
          { id: "cat-11-1-1", name: "Diapers", slug: "diapers", desc: "Pampers, Huggies, MamyPoko" },
          { id: "cat-11-1-2", name: "Baby Wipes", slug: "baby-wipes", desc: "Wet wipes & dry wipes" },
          { id: "cat-11-1-3", name: "Diaper Rash Cream", slug: "rash-cream", desc: "Zinc oxide, calendula creams" },
        ]},
        { id: "cat-11-2", name: "Feeding", slug: "feeding", desc: "Bottles, formula, food", children: [
          { id: "cat-11-2-1", name: "Bottles & Sippers", slug: "bottles-sippers", desc: "Feeding bottles, water sippers" },
          { id: "cat-11-2-2", name: "Baby Food & Formula", slug: "baby-food-formula", desc: "Cerelac, Aptamil, Nan Pro" },
          { id: "cat-11-2-3", name: "Breast Pumps", slug: "breast-pumps", desc: "Electric & manual pumps" },
        ]},
        { id: "cat-11-3", name: "Baby Care", slug: "baby-care", desc: "Skin, bath & health care", children: [
          { id: "cat-11-3-1", name: "Baby Bath & Skin", slug: "baby-bath-skin", desc: "Baby soap, shampoo, lotion" },
          { id: "cat-11-3-2", name: "Baby Health", slug: "baby-health", desc: "Thermometer, nasal aspirator" },
        ]},
        { id: "cat-11-4", name: "Nursery", slug: "nursery", desc: "Cribs, strollers, car seats", children: [
          { id: "cat-11-4-1", name: "Strollers & Prams", slug: "strollers-prams", desc: "Lightweight, travel, jogger" },
          { id: "cat-11-4-2", name: "Car Seats", slug: "car-seats", desc: "Infant, convertible, booster" },
          { id: "cat-11-4-3", name: "Cribs & Bedding", slug: "cribs-bedding", desc: "Baby cots, cradles, bedding sets" },
        ]},
      ],
    },
    {
      id: "cat-12", name: "Pet Supplies", slug: "pet-supplies", desc: "Food, toys, accessories for dogs, cats & more",
      children: [
        { id: "cat-12-1", name: "Dog Supplies", slug: "dog-supplies", desc: "Food, treats, toys & grooming", children: [
          { id: "cat-12-1-1", name: "Dog Food", slug: "dog-food", desc: "Dry, wet, grain-free food" },
          { id: "cat-12-1-2", name: "Dog Toys", slug: "dog-toys", desc: "Chew toys, balls, plush toys" },
          { id: "cat-12-1-3", name: "Dog Grooming", slug: "dog-grooming", desc: "Shampoo, brushes, nail clippers" },
          { id: "cat-12-1-4", name: "Collars & Leashes", slug: "collars-leashes", desc: "Harness, leash, collar, tags" },
        ]},
        { id: "cat-12-2", name: "Cat Supplies", slug: "cat-supplies", desc: "Food, litter, toys & scratchers", children: [
          { id: "cat-12-2-1", name: "Cat Food", slug: "cat-food", desc: "Dry, wet, kitten food" },
          { id: "cat-12-2-2", name: "Cat Litter & Accessories", slug: "cat-litter", desc: "Litter, litter box, scoops" },
          { id: "cat-12-2-3", name: "Cat Toys & Scratchers", slug: "cat-toys-scratchers", desc: "Feather wands, scratching posts" },
        ]},
        { id: "cat-12-3", name: "Fish & Aquatics", slug: "fish-aquatics", desc: "Tanks, food & accessories", children: [
          { id: "cat-12-3-1", name: "Aquariums & Tanks", slug: "aquariums-tanks", desc: "Fish tanks, bowls, stands" },
          { id: "cat-12-3-2", name: "Fish Food", slug: "fish-food", desc: "Flakes, pellets, frozen food" },
        ]},
      ],
    },
    {
      id: "cat-13", name: "Office & Stationery", slug: "office-stationery", desc: "Office supplies, art materials & school essentials",
      children: [
        { id: "cat-13-1", name: "Office Supplies", slug: "office-supplies", desc: "Paper, files, organizers", children: [
          { id: "cat-13-1-1", name: "Paper & Notebooks", slug: "paper-notebooks", desc: "A4 reams, ruled notebooks, diaries" },
          { id: "cat-13-1-2", name: "Pens & Writing", slug: "pens-writing", desc: "Ball pens, gel pens, markers" },
          { id: "cat-13-1-3", name: "Desk Organizers", slug: "desk-organizers", desc: "Pen stands, file holders, trays" },
          { id: "cat-13-1-4", name: "Printers & Ink", slug: "printers-ink", desc: "Printers, cartridges, toner" },
        ]},
        { id: "cat-13-2", name: "Art & Craft", slug: "art-craft", desc: "Colours, craft supplies, drawing tools", children: [
          { id: "cat-13-2-1", name: "Colours & Paints", slug: "colours-paints", desc: "Watercolours, acrylics, oil pastels" },
          { id: "cat-13-2-2", name: "Drawing & Sketching", slug: "drawing-sketching", desc: "Pencils, sketch pads, charcoal" },
          { id: "cat-13-2-3", name: "Craft Supplies", slug: "craft-supplies", desc: "Glue, scissors, paper, stickers" },
        ]},
        { id: "cat-13-3", name: "School Supplies", slug: "school-supplies", desc: "Bags, lunch boxes, water bottles", children: [
          { id: "cat-13-3-1", name: "School Bags", slug: "school-bags", desc: "Backpacks, trolley bags for kids" },
          { id: "cat-13-3-2", name: "Lunch Boxes & Bottles", slug: "lunch-boxes-bottles", desc: "Tiffin, water bottles, flask" },
          { id: "cat-13-3-3", name: "Geometry & Math", slug: "geometry-math", desc: "Box sets, calculators, rulers" },
        ]},
      ],
    },
    {
      id: "cat-14", name: "Musical Instruments", slug: "musical-instruments", desc: "Guitars, keyboards, drums & accessories",
      children: [
        { id: "cat-14-1", name: "Guitars", slug: "guitars", desc: "Acoustic, electric, bass", children: [
          { id: "cat-14-1-1", name: "Acoustic Guitars", slug: "acoustic-guitars", desc: "Classical, folk, travel guitars" },
          { id: "cat-14-1-2", name: "Electric Guitars", slug: "electric-guitars", desc: "Solid body, hollow body" },
          { id: "cat-14-1-3", name: "Guitar Accessories", slug: "guitar-accessories", desc: "Strings, picks, capos, tuners" },
        ]},
        { id: "cat-14-2", name: "Keyboards & Pianos", slug: "keyboards-pianos", desc: "Synths, digital pianos & MIDI", children: [
          { id: "cat-14-2-1", name: "Digital Pianos", slug: "digital-pianos", desc: "88-key, portable, weighted" },
          { id: "cat-14-2-2", name: "Synthesizers", slug: "synthesizers", desc: "Analog, digital, MIDI controllers" },
        ]},
        { id: "cat-14-3", name: "Drums & Percussion", slug: "drums-percussion", desc: "Drum kits, cajons, tabla", children: [
          { id: "cat-14-3-1", name: "Drum Kits", slug: "drum-kits", desc: "Acoustic & electronic drum sets" },
          { id: "cat-14-3-2", name: "Indian Percussion", slug: "indian-percussion", desc: "Tabla, dholak, mridangam" },
        ]},
        { id: "cat-14-4", name: "Indian Classical", slug: "indian-classical", desc: "Sitar, harmonium, flute", children: [
          { id: "cat-14-4-1", name: "Harmonium", slug: "harmonium", desc: "Portable & scale-changer" },
          { id: "cat-14-4-2", name: "Sitar & Veena", slug: "sitar-veena", desc: "String instruments" },
          { id: "cat-14-4-3", name: "Flutes & Wind", slug: "flutes-wind", desc: "Bansuri, shehnai, mouth organ" },
        ]},
      ],
    },
    {
      id: "cat-15", name: "Garden & Outdoor Living", slug: "garden-outdoor", desc: "Plants, seeds, garden decor & BBQ",
      children: [
        { id: "cat-15-1", name: "Plants & Seeds", slug: "plants-seeds", desc: "Indoor plants, seeds, bulbs", children: [
          { id: "cat-15-1-1", name: "Indoor Plants", slug: "indoor-plants", desc: "Money plant, pothos, succulents" },
          { id: "cat-15-1-2", name: "Seeds & Bulbs", slug: "seeds-bulbs", desc: "Flower, vegetable, herb seeds" },
          { id: "cat-15-1-3", name: "Fertilizers & Soil", slug: "fertilizers-soil", desc: "Potting mix, compost, fertilizers" },
        ]},
        { id: "cat-15-2", name: "Garden Decor", slug: "garden-decor", desc: "Lights, fountains, statues", children: [
          { id: "cat-15-2-1", name: "Solar & LED Lights", slug: "solar-led-lights", desc: "Solar garden lights, string lights" },
          { id: "cat-15-2-2", name: "Fountains & Statues", slug: "fountains-statues", desc: "Table-top fountains, Buddha statues" },
        ]},
        { id: "cat-15-3", name: "BBQ & Outdoor Cooking", slug: "bbq-outdoor-cooking", desc: "Grills, tandoor, picnic essentials", children: [
          { id: "cat-15-3-1", name: "Grills & Tandoors", slug: "grills-tandoors", desc: "Charcoal, gas, electric grills" },
          { id: "cat-15-3-2", name: "Picnic & Camping", slug: "picnic-camping", desc: "Coolers, tents, camping stoves" },
        ]},
      ],
    },
  ];

  const categorySlugToId: Record<string, string> = {};
  let totalCategories = 0;

  for (const root of categoryTree) {
    await prisma.category.create({
      data: {
        id: root.id,
        name: root.name,
        slug: root.slug,
        description: root.desc,
        productCount: 0,
      },
    });
    categorySlugToId[root.slug] = root.id;
    totalCategories++;

    for (const child of root.children) {
      await prisma.category.create({
        data: {
          id: child.id,
          name: child.name,
          slug: child.slug,
          description: child.desc,
          parentId: root.id,
          productCount: 0,
        },
      });
      categorySlugToId[child.slug] = child.id;
      totalCategories++;

      if (child.children) {
        for (const grandchild of child.children) {
          await prisma.category.create({
            data: {
              id: grandchild.id,
              name: grandchild.name,
              slug: grandchild.slug,
              description: grandchild.desc,
              parentId: child.id,
              productCount: 0,
            },
          });
          categorySlugToId[grandchild.slug] = grandchild.id;
          totalCategories++;
        }
      }
    }
  }
  console.log(
    `✅ ${totalCategories} categories created (${categoryTree.length} root, 3 levels)\n`,
  );

  // ─── Brands, banners, coupons, CMS (idempotent upserts) ───
  console.log("🛒 Seeding ecommerce demo (brands, banners, coupons, CMS)...");
  const ec = await upsertEcommerceDemoData(prisma);
  const extra =
    ec.categoriesEnsured > 0
      ? ` (+ ${ec.categoriesEnsured} root categories; DB had none)`
      : "";
  console.log(
    `✅ ${ec.brands} brands, ${ec.banners} banners, ${ec.coupons} coupons, ${ec.cmsPages} CMS pages${extra}\n`,
  );

  // ─── Default Admin Roles ───
  console.log("🔐 Creating default admin roles...");
  await prisma.adminRole.deleteMany();
  const defaultRoles = [
    { name: "Super Admin", permissions: "All Permissions", isSystem: true },
    { name: "Manager", permissions: "Products, Orders, Customers, Sellers, Payouts", isSystem: true },
    { name: "Support", permissions: "Orders, Customers", isSystem: true },
    { name: "Content Editor", permissions: "Banners, Pages, Categories, Brands", isSystem: false },
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
  console.log("Brands:          " + ec.brands);
  console.log("Banners:         " + ec.banners);
  console.log("Coupons:         " + ec.coupons);
  console.log("CMS pages:       " + ec.cmsPages);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
