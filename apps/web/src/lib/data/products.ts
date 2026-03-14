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

export const products: Product[] = [
  {
    id: "prod-1",
    slug: "samsung-galaxy-s24-ultra",
    name: "Samsung Galaxy S24 Ultra 5G (Titanium Black, 256 GB)",
    description:
      "Experience the pinnacle of mobile technology with the Samsung Galaxy S24 Ultra. Featuring a stunning 6.8-inch Dynamic AMOLED 2X display with 120Hz refresh rate, the powerful Snapdragon 8 Gen 3 processor, and an incredible 200MP camera system. The built-in S Pen and Galaxy AI features make this the ultimate productivity and creativity tool.",
    price: 129999,
    comparePrice: 149999,
    discount: 13,
    images: [
      "https://picsum.photos/seed/s24ultra1/600/600",
      "https://picsum.photos/seed/s24ultra2/600/600",
      "https://picsum.photos/seed/s24ultra3/600/600",
      "https://picsum.photos/seed/s24ultra4/600/600",
    ],
    category: "electronics",
    brand: "Samsung",
    rating: 4.5,
    reviewCount: 12847,
    boughtLastMonth: 5200,
    inStock: true,
    stockCount: 342,
    seller: { name: "Samsung India Official", rating: 4.8 },
    isFeatured: true,
    variants: [
      {
        type: "color",
        label: "Color",
        options: [
          { value: "titanium-black", label: "Titanium Black", available: true, hex: "#1a1a1a" },
          { value: "titanium-gray", label: "Titanium Gray", available: true, hex: "#8a8a8a" },
          { value: "titanium-violet", label: "Titanium Violet", available: true, hex: "#7c5cbf" },
          { value: "titanium-yellow", label: "Titanium Yellow", available: false, hex: "#e8c547" },
        ],
      },
      {
        type: "size",
        label: "Storage",
        options: [
          { value: "256gb", label: "256 GB", available: true },
          { value: "512gb", label: "512 GB", available: true },
          { value: "1tb", label: "1 TB", available: true },
        ],
      },
    ],
    specifications: {
      Display: "6.8\" Dynamic AMOLED 2X, 120Hz",
      Processor: "Snapdragon 8 Gen 3 for Galaxy",
      RAM: "12 GB",
      Storage: "256 GB",
      "Rear Camera": "200MP + 50MP + 12MP + 10MP",
      "Front Camera": "12MP",
      Battery: "5000 mAh",
      OS: "Android 14, One UI 6.1",
      "5G": "Yes",
      Weight: "232g",
    },
    reviews: [
      {
        id: "rev-1-1",
        author: "Rahul M.",
        rating: 5,
        title: "Best phone I've ever owned",
        content: "The camera quality is outstanding, especially in low light. Galaxy AI features are genuinely useful. Battery easily lasts a full day with heavy usage.",
        date: "2025-12-15",
        helpful: 234,
        verified: true,
      },
      {
        id: "rev-1-2",
        author: "Priya S.",
        rating: 4,
        title: "Great phone, slightly heavy",
        content: "Everything about this phone is premium. The display is gorgeous and the S Pen is handy. Only downside is the weight - it's noticeably heavier than my previous phone.",
        date: "2026-01-08",
        helpful: 89,
        verified: true,
      },
      {
        id: "rev-1-3",
        author: "Amit K.",
        rating: 5,
        title: "Worth every rupee",
        content: "Upgraded from S22 Ultra and the difference is significant. The AI photo editing features are magical. Titanium frame feels incredibly premium.",
        date: "2026-02-20",
        helpful: 156,
        verified: true,
      },
    ],
    tags: ["smartphone", "5g", "samsung", "galaxy", "flagship", "android"],
    createdAt: "2025-11-01",
  },
  {
    id: "prod-2",
    slug: "sony-wh-1000xm5-headphones",
    name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    description:
      "Industry-leading noise cancellation with Auto NC Optimizer. Exceptional sound quality with 30mm drivers, crystal clear hands-free calling with 4 beamforming microphones. Up to 30 hours of battery life and ultra-comfortable design for all-day wear.",
    price: 26990,
    comparePrice: 34990,
    discount: 23,
    images: [
      "https://picsum.photos/seed/sonyxm51/600/600",
      "https://picsum.photos/seed/sonyxm52/600/600",
      "https://picsum.photos/seed/sonyxm53/600/600",
    ],
    category: "electronics",
    brand: "Sony",
    rating: 4.6,
    reviewCount: 8934,
    boughtLastMonth: 3100,
    inStock: true,
    stockCount: 567,
    seller: { name: "Sony Official Store", rating: 4.7 },
    variants: [
      {
        type: "color",
        label: "Color",
        options: [
          { value: "black", label: "Black", available: true, hex: "#000000" },
          { value: "silver", label: "Platinum Silver", available: true, hex: "#c0c0c0" },
          { value: "blue", label: "Midnight Blue", available: false, hex: "#191970" },
        ],
      },
    ],
    specifications: {
      "Driver Unit": "30mm",
      "Frequency Response": "4Hz - 40,000Hz",
      "Noise Cancellation": "Yes (Auto NC Optimizer)",
      "Battery Life": "Up to 30 hours",
      "Charging Time": "3.5 hours (full), 3 min for 3 hours playback",
      Weight: "250g",
      Bluetooth: "5.3",
      Codecs: "SBC, AAC, LDAC",
      Multipoint: "Yes (2 devices)",
      "Folding Design": "No (flat-fold)",
    },
    reviews: [
      {
        id: "rev-2-1",
        author: "Sneha R.",
        rating: 5,
        title: "ANC is unreal",
        content: "The noise cancellation on these is phenomenal. I use them daily during my commute and in the office. Sound quality is warm and detailed.",
        date: "2026-01-10",
        helpful: 312,
        verified: true,
      },
      {
        id: "rev-2-2",
        author: "Vikram P.",
        rating: 4,
        title: "Great headphones, minor gripes",
        content: "Sound and ANC are top-notch. Comfort is excellent for long sessions. Wish the case was more compact and that they had a more premium carrying case.",
        date: "2025-11-22",
        helpful: 67,
        verified: true,
      },
    ],
    tags: ["headphones", "wireless", "noise-cancelling", "sony", "premium-audio"],
    createdAt: "2025-09-15",
  },
  {
    id: "prod-3",
    slug: "apple-macbook-air-m3",
    name: "Apple MacBook Air 15\" M3 Chip (16GB RAM, 512GB SSD)",
    description:
      "Supercharged by the M3 chip, the redesigned MacBook Air is strikingly thin with a 15.3-inch Liquid Retina display. With up to 18 hours of battery life, a fanless design for silent operation, and support for two external displays, it's the perfect laptop for work and play.",
    price: 149900,
    comparePrice: 164900,
    discount: 9,
    images: [
      "https://picsum.photos/seed/macbookm31/600/600",
      "https://picsum.photos/seed/macbookm32/600/600",
      "https://picsum.photos/seed/macbookm33/600/600",
      "https://picsum.photos/seed/macbookm34/600/600",
    ],
    category: "electronics",
    brand: "Apple",
    rating: 4.7,
    reviewCount: 5621,
    boughtLastMonth: 1800,
    inStock: true,
    stockCount: 128,
    seller: { name: "Apple Premium Reseller", rating: 4.9 },
    variants: [
      {
        type: "color",
        label: "Finish",
        options: [
          { value: "midnight", label: "Midnight", available: true, hex: "#1d1d2c" },
          { value: "starlight", label: "Starlight", available: true, hex: "#f0e6d3" },
          { value: "space-gray", label: "Space Gray", available: true, hex: "#7d7d7d" },
          { value: "silver", label: "Silver", available: true, hex: "#e3e4e5" },
        ],
      },
    ],
    specifications: {
      Chip: "Apple M3 (8-core CPU, 10-core GPU)",
      Memory: "16 GB Unified",
      Storage: "512 GB SSD",
      Display: "15.3\" Liquid Retina, 500 nits",
      Battery: "Up to 18 hours",
      Weight: "1.51 kg",
      Ports: "2x Thunderbolt/USB 4, MagSafe 3, 3.5mm jack",
      Camera: "1080p FaceTime HD",
      Speakers: "6-speaker system with Spatial Audio",
      OS: "macOS Sonoma",
    },
    reviews: [
      {
        id: "rev-3-1",
        author: "Ananya D.",
        rating: 5,
        title: "Perfect laptop for everything",
        content: "I use it for development, design, and video editing. The 15-inch screen is gorgeous, M3 handles everything smoothly, and the battery life is incredible.",
        date: "2026-02-05",
        helpful: 198,
        verified: true,
      },
      {
        id: "rev-3-2",
        author: "Karthik N.",
        rating: 4,
        title: "Almost perfect",
        content: "Amazing display, silent operation, great trackpad. Only 2 USB-C ports is limiting. The midnight color shows fingerprints easily.",
        date: "2026-01-18",
        helpful: 87,
        verified: true,
      },
    ],
    tags: ["laptop", "macbook", "apple", "m3", "ultrabook"],
    createdAt: "2025-10-20",
  },
  {
    id: "prod-4",
    slug: "nike-air-max-270",
    name: "Nike Air Max 270 Men's Running Shoes",
    description:
      "Nike's first lifestyle Air Max shoe features the biggest heel Air unit yet for a super-soft ride. The stretchy inner sleeve and foam midsole keep your foot comfortable, while the bold design turns heads everywhere you go.",
    price: 8995,
    comparePrice: 13995,
    discount: 36,
    images: [
      "https://picsum.photos/seed/nikeairmax1/600/600",
      "https://picsum.photos/seed/nikeairmax2/600/600",
      "https://picsum.photos/seed/nikeairmax3/600/600",
    ],
    category: "fashion",
    brand: "Nike",
    rating: 4.3,
    reviewCount: 15240,
    boughtLastMonth: 8400,
    inStock: true,
    stockCount: 890,
    seller: { name: "Nike India Store", rating: 4.6 },
    variants: [
      {
        type: "size",
        label: "Size (UK)",
        options: [
          { value: "6", label: "UK 6", available: true },
          { value: "7", label: "UK 7", available: true },
          { value: "8", label: "UK 8", available: true },
          { value: "9", label: "UK 9", available: true },
          { value: "10", label: "UK 10", available: false },
          { value: "11", label: "UK 11", available: true },
        ],
      },
      {
        type: "color",
        label: "Color",
        options: [
          { value: "black-white", label: "Black/White", available: true, hex: "#1a1a1a" },
          { value: "white-navy", label: "White/Navy", available: true, hex: "#ffffff" },
          { value: "red-black", label: "Red/Black", available: true, hex: "#cc0000" },
        ],
      },
    ],
    specifications: {
      "Closure Type": "Lace-Up",
      "Outer Material": "Mesh & Synthetic",
      "Inner Material": "Textile",
      "Sole Material": "Rubber",
      "Heel Type": "Air Max",
      "Shoe Width": "Medium",
      "Arch Type": "Neutral",
      Origin: "Vietnam",
    },
    reviews: [
      {
        id: "rev-4-1",
        author: "Rohit V.",
        rating: 5,
        title: "Super comfortable!",
        content: "Best shoes I've bought in a while. The Air Max unit makes walking a breeze. Great for daily wear and light jogging.",
        date: "2026-02-12",
        helpful: 445,
        verified: true,
      },
      {
        id: "rev-4-2",
        author: "Deepak J.",
        rating: 4,
        title: "Good shoes, runs slightly small",
        content: "Stylish and comfortable. I'd recommend ordering half a size up as they run a bit tight initially. Broke in nicely after a week.",
        date: "2025-12-30",
        helpful: 132,
        verified: true,
      },
    ],
    tags: ["shoes", "running", "nike", "air-max", "sneakers", "men"],
    createdAt: "2025-08-10",
  },
  {
    id: "prod-5",
    slug: "levis-511-slim-fit-jeans",
    name: "Levi's 511 Slim Fit Stretch Jeans (Blue)",
    description:
      "The Levi's 511 sits below the waist with a slim fit from hip to ankle. Made with advanced stretch denim for maximum comfort and flexibility throughout the day. Classic 5-pocket styling with the iconic Levi's back patch.",
    price: 2499,
    comparePrice: 4299,
    discount: 42,
    images: [
      "https://picsum.photos/seed/levis5111/600/600",
      "https://picsum.photos/seed/levis5112/600/600",
      "https://picsum.photos/seed/levis5113/600/600",
    ],
    category: "fashion",
    brand: "Levi's",
    rating: 4.2,
    reviewCount: 23456,
    boughtLastMonth: 12300,
    inStock: true,
    stockCount: 2340,
    seller: { name: "Levi's Official", rating: 4.5 },
    variants: [
      {
        type: "size",
        label: "Waist Size",
        options: [
          { value: "28", label: "28", available: true },
          { value: "30", label: "30", available: true },
          { value: "32", label: "32", available: true },
          { value: "34", label: "34", available: true },
          { value: "36", label: "36", available: false },
          { value: "38", label: "38", available: true },
        ],
      },
      {
        type: "color",
        label: "Wash",
        options: [
          { value: "dark-indigo", label: "Dark Indigo", available: true, hex: "#2c2c54" },
          { value: "mid-blue", label: "Mid Blue", available: true, hex: "#4a6fa5" },
          { value: "light-wash", label: "Light Wash", available: true, hex: "#8ab4f8" },
          { value: "black", label: "Jet Black", available: true, hex: "#111111" },
        ],
      },
    ],
    specifications: {
      Fit: "Slim Fit",
      Rise: "Mid Rise",
      Fabric: "98% Cotton, 2% Elastane",
      "Stretch Type": "Advanced Stretch",
      Closure: "Zip Fly with Button",
      "Leg Opening": "14.5\"",
      Care: "Machine Wash Cold",
    },
    reviews: [
      {
        id: "rev-5-1",
        author: "Arjun M.",
        rating: 4,
        title: "Perfect everyday jeans",
        content: "Great fit, comfortable stretch. The dark indigo color is exactly as shown. Have washed multiple times and no fading.",
        date: "2026-01-25",
        helpful: 567,
        verified: true,
      },
      {
        id: "rev-5-2",
        author: "Siddharth K.",
        rating: 5,
        title: "Best jeans under 3000",
        content: "At the discounted price, these are unbeatable. The slim fit is flattering without being too tight. Stretch makes them very comfortable.",
        date: "2026-02-14",
        helpful: 234,
        verified: true,
      },
    ],
    tags: ["jeans", "levis", "slim-fit", "denim", "men", "casual"],
    createdAt: "2025-07-05",
  },
  {
    id: "prod-6",
    slug: "prestige-induction-cooktop",
    name: "Prestige PIC 20.0 1600W Induction Cooktop (Black)",
    description:
      "The Prestige PIC 20.0 induction cooktop comes with anti-magnetic wall to keep the body cool while cooking. Features Indian menu options, automatic voltage regulator, and a feather touch control panel. Energy efficient and easy to clean.",
    price: 2199,
    comparePrice: 3495,
    discount: 37,
    images: [
      "https://picsum.photos/seed/prestige1/600/600",
      "https://picsum.photos/seed/prestige2/600/600",
      "https://picsum.photos/seed/prestige3/600/600",
    ],
    category: "home-kitchen",
    brand: "Prestige",
    rating: 4.1,
    reviewCount: 34567,
    boughtLastMonth: 15600,
    inStock: true,
    stockCount: 4500,
    seller: { name: "Prestige Store India", rating: 4.4 },
    variants: [],
    specifications: {
      Wattage: "1600W",
      "Voltage Range": "120V - 270V",
      "Cooking Modes": "Indian Menu (Roti, Dosa, Idli, Paneer, etc.)",
      Timer: "Yes (up to 3 hours)",
      "Auto Shut-off": "Yes",
      "Body Material": "ABS Plastic",
      "Cooktop Material": "Polished Crystal Glass",
      Warranty: "1 Year",
      Dimensions: "40 x 33 x 7 cm",
    },
    reviews: [
      {
        id: "rev-6-1",
        author: "Meera L.",
        rating: 4,
        title: "Great for daily cooking",
        content: "Using it daily for 6 months now. Heats up quickly, Indian menu options are surprisingly accurate. Easy to clean the glass surface.",
        date: "2026-01-05",
        helpful: 890,
        verified: true,
      },
      {
        id: "rev-6-2",
        author: "Rajesh G.",
        rating: 4,
        title: "Value for money",
        content: "Good induction cooktop at this price. Works well with all induction-compatible utensils. The timer feature is very handy.",
        date: "2025-12-18",
        helpful: 234,
        verified: true,
      },
    ],
    tags: ["induction", "cooktop", "kitchen", "prestige", "appliance"],
    createdAt: "2025-06-20",
  },
  {
    id: "prod-7",
    slug: "dyson-v15-detect-vacuum",
    name: "Dyson V15 Detect Absolute Cordless Vacuum Cleaner",
    description:
      "The Dyson V15 Detect reveals microscopic dust with a precisely-angled laser. The integrated acoustic piezo sensor counts and sizes dust particles, automatically adapting suction power. Up to 60 minutes of runtime with the Hyperdymium motor spinning at 125,000rpm.",
    price: 52900,
    comparePrice: 62900,
    discount: 16,
    images: [
      "https://picsum.photos/seed/dysonv151/600/600",
      "https://picsum.photos/seed/dysonv152/600/600",
      "https://picsum.photos/seed/dysonv153/600/600",
      "https://picsum.photos/seed/dysonv154/600/600",
    ],
    category: "home-kitchen",
    brand: "Dyson",
    rating: 4.7,
    reviewCount: 3245,
    boughtLastMonth: 890,
    inStock: true,
    stockCount: 56,
    seller: { name: "Dyson India Official", rating: 4.9 },
    variants: [],
    specifications: {
      "Motor Speed": "125,000 rpm",
      Suction: "240 AW",
      "Run Time": "Up to 60 minutes",
      "Bin Volume": "0.76 litres",
      Weight: "3.1 kg",
      "Filtration": "Whole-machine HEPA",
      "Charge Time": "4.5 hours",
      Attachments: "Laser Slim Fluffy, Hair Screw, Motorbar, Crevice, Combination, Stubborn Dirt",
      "Display": "LCD showing runtime, power mode, maintenance",
    },
    reviews: [
      {
        id: "rev-7-1",
        author: "Kavita T.",
        rating: 5,
        title: "Game changer for home cleaning",
        content: "The laser detecting dust is not a gimmick - it genuinely makes you clean better. The suction power is incredible. Worth every penny.",
        date: "2026-02-28",
        helpful: 178,
        verified: true,
      },
      {
        id: "rev-7-2",
        author: "Suresh B.",
        rating: 4,
        title: "Excellent vacuum, pricey though",
        content: "Performance is unmatched. Cleans carpets, hard floors, sofas beautifully. Battery lasts about 40-45 mins in auto mode. The price is steep but quality is premium.",
        date: "2026-01-15",
        helpful: 92,
        verified: true,
      },
    ],
    tags: ["vacuum", "cordless", "dyson", "cleaning", "home-appliance"],
    createdAt: "2025-09-01",
  },
  {
    id: "prod-8",
    slug: "atomic-habits-james-clear",
    name: "Atomic Habits: An Easy & Proven Way to Build Good Habits",
    description:
      "No matter your goals, Atomic Habits offers a proven framework for improving every day. James Clear reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.",
    price: 399,
    comparePrice: 699,
    discount: 43,
    images: [
      "https://picsum.photos/seed/atomichabits1/600/600",
      "https://picsum.photos/seed/atomichabits2/600/600",
    ],
    category: "books",
    brand: "Penguin Random House",
    rating: 4.6,
    reviewCount: 98234,
    boughtLastMonth: 42000,
    inStock: true,
    stockCount: 15000,
    seller: { name: "Bookworld India", rating: 4.7 },
    variants: [
      {
        type: "size",
        label: "Format",
        options: [
          { value: "paperback", label: "Paperback", available: true },
          { value: "hardcover", label: "Hardcover", available: true },
          { value: "kindle", label: "Kindle Edition", available: true },
        ],
      },
    ],
    specifications: {
      Author: "James Clear",
      Publisher: "Penguin Random House",
      Language: "English",
      Pages: "320",
      ISBN: "978-0735211292",
      "Publication Date": "October 16, 2018",
      Dimensions: "20.8 x 13.7 x 2.3 cm",
      Weight: "290g",
    },
    reviews: [
      {
        id: "rev-8-1",
        author: "Neha P.",
        rating: 5,
        title: "Life-changing book",
        content: "This book genuinely changed how I approach habits. The 1% better every day philosophy is simple yet profound. A must-read for everyone.",
        date: "2026-03-01",
        helpful: 3456,
        verified: true,
      },
      {
        id: "rev-8-2",
        author: "Arun S.",
        rating: 4,
        title: "Practical and well-written",
        content: "Very actionable advice. Not just theory but real strategies you can implement immediately. The habit stacking concept is brilliant.",
        date: "2026-02-15",
        helpful: 1234,
        verified: true,
      },
    ],
    tags: ["book", "self-help", "habits", "productivity", "bestseller"],
    createdAt: "2025-01-15",
  },
  {
    id: "prod-9",
    slug: "yonex-astrox-88d-pro",
    name: "Yonex Astrox 88D Pro Badminton Racquet (Cherry Sunburst)",
    description:
      "Designed for aggressive doubles play with powerful smashes. The Astrox 88D Pro features Rotational Generator System for smooth transition between shots, Namd graphite for increased shaft flex, and a compact frame for lightning-fast drives and flat exchanges.",
    price: 14990,
    comparePrice: 18990,
    discount: 21,
    images: [
      "https://picsum.photos/seed/yonex88d1/600/600",
      "https://picsum.photos/seed/yonex88d2/600/600",
      "https://picsum.photos/seed/yonex88d3/600/600",
    ],
    category: "sports-outdoors",
    brand: "Yonex",
    rating: 4.5,
    reviewCount: 2341,
    boughtLastMonth: 670,
    inStock: true,
    stockCount: 89,
    seller: { name: "Yonex India", rating: 4.6 },
    variants: [
      {
        type: "size",
        label: "Grip Size",
        options: [
          { value: "g4", label: "G4 (Smaller)", available: true },
          { value: "g5", label: "G5 (Larger)", available: true },
        ],
      },
    ],
    specifications: {
      "Flex": "Stiff",
      "Frame Material": "HM Graphite, Namd, Tungsten",
      "Shaft Material": "HM Graphite, Namd",
      Weight: "83g (4U)",
      "Balance Point": "Head Heavy",
      "Max Tension": "28 lbs",
      Length: "675 mm",
      "Stringing Pattern": "Aero Frame",
      "Made In": "Japan",
    },
    reviews: [
      {
        id: "rev-9-1",
        author: "Dhruv A.",
        rating: 5,
        title: "Perfect for power players",
        content: "The smash power with this racquet is insane. Head-heavy balance gives devastating smashes. Build quality is exceptional as expected from Yonex.",
        date: "2026-02-10",
        helpful: 78,
        verified: true,
      },
      {
        id: "rev-9-2",
        author: "Manish T.",
        rating: 4,
        title: "Great racquet for advanced players",
        content: "Not for beginners due to stiff flex. But if you have the technique, this racquet rewards you with incredible control and power.",
        date: "2026-01-22",
        helpful: 45,
        verified: true,
      },
    ],
    tags: ["badminton", "racquet", "yonex", "sports", "professional"],
    createdAt: "2025-11-10",
  },
  {
    id: "prod-10",
    slug: "loreal-revitalift-serum",
    name: "L'Oréal Paris Revitalift Hyaluronic Acid Serum, 30ml",
    description:
      "This lightweight, non-greasy serum with 1.5% pure Hyaluronic Acid intensely hydrates and replumps skin. Dermatologically tested formula that provides instant hydration boost, reduces fine lines, and gives a dewy, youthful glow. Suitable for all skin types.",
    price: 599,
    comparePrice: 999,
    discount: 40,
    images: [
      "https://picsum.photos/seed/lorealserum1/600/600",
      "https://picsum.photos/seed/lorealserum2/600/600",
    ],
    category: "beauty",
    brand: "L'Oréal Paris",
    rating: 4.3,
    reviewCount: 45678,
    boughtLastMonth: 18900,
    inStock: true,
    stockCount: 8900,
    seller: { name: "L'Oréal Beauty Store", rating: 4.5 },
    variants: [],
    specifications: {
      "Volume": "30 ml",
      "Key Ingredient": "1.5% Pure Hyaluronic Acid",
      "Skin Type": "All Skin Types",
      "Concern": "Dryness, Fine Lines, Dullness",
      "Texture": "Lightweight Gel Serum",
      "Dermatologically Tested": "Yes",
      "Paraben Free": "Yes",
      "Country of Origin": "India",
    },
    reviews: [
      {
        id: "rev-10-1",
        author: "Divya R.",
        rating: 5,
        title: "Holy grail serum!",
        content: "My skin has never felt this hydrated. I've been using it for 2 months and the difference is visible. Non-sticky, absorbs quickly. Love it!",
        date: "2026-02-20",
        helpful: 2340,
        verified: true,
      },
      {
        id: "rev-10-2",
        author: "Shreya M.",
        rating: 4,
        title: "Good serum for the price",
        content: "Hydrating and lightweight. Works great under makeup. Doesn't cause breakouts on my oily skin. Would repurchase.",
        date: "2026-01-30",
        helpful: 567,
        verified: true,
      },
    ],
    tags: ["serum", "skincare", "hyaluronic-acid", "loreal", "beauty"],
    createdAt: "2025-05-15",
  },
  {
    id: "prod-11",
    slug: "boat-airdopes-441",
    name: "boAt Airdopes 441 TWS Earbuds with 150H Playtime",
    description:
      "Experience immersive audio with boAt Airdopes 441 featuring 10mm drivers, Bluetooth v5.3, and a massive 150-hour total playtime. The BEAST mode ensures low latency for gaming, while IWP technology enables instant pairing. IPX4 water resistance for workouts.",
    price: 1299,
    comparePrice: 4490,
    discount: 71,
    images: [
      "https://picsum.photos/seed/boatbuds1/600/600",
      "https://picsum.photos/seed/boatbuds2/600/600",
      "https://picsum.photos/seed/boatbuds3/600/600",
    ],
    category: "electronics",
    brand: "boAt",
    rating: 4.0,
    reviewCount: 67890,
    boughtLastMonth: 35000,
    inStock: true,
    stockCount: 12000,
    seller: { name: "boAt Lifestyle Store", rating: 4.3 },
    variants: [
      {
        type: "color",
        label: "Color",
        options: [
          { value: "active-black", label: "Active Black", available: true, hex: "#1a1a1a" },
          { value: "cool-blue", label: "Cool Blue", available: true, hex: "#3b82f6" },
          { value: "cherry-blossom", label: "Cherry Blossom", available: true, hex: "#f9a8d4" },
          { value: "mint-green", label: "Mint Green", available: false, hex: "#6ee7b7" },
        ],
      },
    ],
    specifications: {
      "Driver Size": "10mm",
      "Bluetooth": "v5.3",
      "Playback Time": "10h (earbuds) + 140h (case)",
      "Charging": "Type-C",
      "Water Resistance": "IPX4",
      "Low Latency": "BEAST Mode",
      Controls: "Touch",
      "Mic": "ENx Dual Mic ENC",
      Weight: "4.5g per earbud",
    },
    reviews: [
      {
        id: "rev-11-1",
        author: "Gaurav H.",
        rating: 4,
        title: "Best under 1500",
        content: "For the price, these are excellent. Sound quality is punchy with good bass. Battery life is impressive. Touch controls work well.",
        date: "2026-02-25",
        helpful: 4567,
        verified: true,
      },
      {
        id: "rev-11-2",
        author: "Pooja S.",
        rating: 4,
        title: "Great for daily use",
        content: "Comfortable fit, decent sound, amazing battery. BEAST mode is great for gaming. The case is compact and easy to carry.",
        date: "2026-01-12",
        helpful: 1890,
        verified: true,
      },
    ],
    tags: ["earbuds", "tws", "wireless", "boat", "budget", "gaming"],
    createdAt: "2025-12-01",
  },
  {
    id: "prod-12",
    slug: "allen-solly-formal-shirt",
    name: "Allen Solly Men's Slim Fit Cotton Formal Shirt",
    description:
      "Classic formal shirt from Allen Solly crafted in premium cotton for all-day comfort. Features a spread collar, single button cuffs, and a slim fit silhouette perfect for the modern professional. Easy iron fabric that keeps you looking sharp all day.",
    price: 1199,
    comparePrice: 1999,
    discount: 40,
    images: [
      "https://picsum.photos/seed/allensolly1/600/600",
      "https://picsum.photos/seed/allensolly2/600/600",
      "https://picsum.photos/seed/allensolly3/600/600",
    ],
    category: "fashion",
    brand: "Allen Solly",
    rating: 4.1,
    reviewCount: 8765,
    boughtLastMonth: 5600,
    inStock: true,
    stockCount: 3400,
    seller: { name: "Allen Solly Official", rating: 4.4 },
    variants: [
      {
        type: "size",
        label: "Size",
        options: [
          { value: "38", label: "38 (S)", available: true },
          { value: "39", label: "39 (M)", available: true },
          { value: "40", label: "40 (M)", available: true },
          { value: "42", label: "42 (L)", available: true },
          { value: "44", label: "44 (XL)", available: false },
        ],
      },
      {
        type: "color",
        label: "Color",
        options: [
          { value: "white", label: "White", available: true, hex: "#ffffff" },
          { value: "light-blue", label: "Light Blue", available: true, hex: "#87ceeb" },
          { value: "pink", label: "Pink", available: true, hex: "#ffb6c1" },
          { value: "navy-check", label: "Navy Check", available: true, hex: "#1e3a5f" },
        ],
      },
    ],
    specifications: {
      Fit: "Slim Fit",
      Fabric: "100% Premium Cotton",
      Collar: "Spread Collar",
      Sleeve: "Full Sleeve",
      Pattern: "Solid",
      Cuff: "Single Button Cuff",
      Care: "Machine Wash",
      Occasion: "Formal / Office Wear",
    },
    reviews: [
      {
        id: "rev-12-1",
        author: "Vishal R.",
        rating: 4,
        title: "Good quality formal shirt",
        content: "Nice fabric quality, true to size. The slim fit is well-tailored. Looks great with formal trousers. Fabric doesn't wrinkle easily.",
        date: "2026-02-18",
        helpful: 234,
        verified: true,
      },
    ],
    tags: ["shirt", "formal", "cotton", "allen-solly", "men", "office"],
    createdAt: "2025-10-05",
  },
  {
    id: "prod-13",
    slug: "milton-thermosteel-flask",
    name: "Milton Thermosteel Flip Lid Flask, 1000ml (Steel)",
    description:
      "Keep your beverages hot for up to 24 hours and cold for up to 24 hours with Milton's premium Thermosteel flask. Double-walled vacuum insulation, food-grade stainless steel interior, and a convenient flip lid for easy pouring. BPA-free and rust-proof.",
    price: 799,
    comparePrice: 1349,
    discount: 41,
    images: [
      "https://picsum.photos/seed/miltonflask1/600/600",
      "https://picsum.photos/seed/miltonflask2/600/600",
    ],
    category: "home-kitchen",
    brand: "Milton",
    rating: 4.3,
    reviewCount: 54321,
    boughtLastMonth: 22000,
    inStock: true,
    stockCount: 7800,
    seller: { name: "Milton Home Store", rating: 4.4 },
    variants: [
      {
        type: "size",
        label: "Capacity",
        options: [
          { value: "500ml", label: "500 ml", available: true },
          { value: "750ml", label: "750 ml", available: true },
          { value: "1000ml", label: "1000 ml", available: true },
        ],
      },
    ],
    specifications: {
      Material: "18/8 Food-Grade Stainless Steel",
      Capacity: "1000 ml",
      Insulation: "Double Wall Vacuum",
      "Hot Retention": "Up to 24 hours",
      "Cold Retention": "Up to 24 hours",
      "Lid Type": "Flip Lid with Pour Spout",
      "BPA Free": "Yes",
      Weight: "420g",
      Dimensions: "9 x 9 x 28 cm",
    },
    reviews: [
      {
        id: "rev-13-1",
        author: "Sunita K.",
        rating: 5,
        title: "Keeps tea hot for hours!",
        content: "Amazing insulation. I fill it with hot tea at 8 AM and it's still hot at 5 PM. No leaks, sturdy build. Using it daily at office.",
        date: "2026-02-08",
        helpful: 3456,
        verified: true,
      },
      {
        id: "rev-13-2",
        author: "Prakash D.",
        rating: 4,
        title: "Great flask for the price",
        content: "Solid build quality, keeps water cold for a long time. The flip lid is convenient. Only wish the opening was slightly wider for easy cleaning.",
        date: "2026-01-20",
        helpful: 890,
        verified: true,
      },
    ],
    tags: ["flask", "thermos", "stainless-steel", "milton", "insulated"],
    createdAt: "2025-04-10",
  },
  {
    id: "prod-14",
    slug: "the-psychology-of-money",
    name: "The Psychology of Money: Timeless Lessons on Wealth",
    description:
      "Morgan Housel shares 19 short stories exploring the strange ways people think about money. The book explains why personal finance is more about behavior than knowledge. It teaches that financial success is not a hard science but a soft skill, where how you behave matters more than what you know.",
    price: 349,
    comparePrice: 599,
    discount: 42,
    images: [
      "https://picsum.photos/seed/psychmoney1/600/600",
      "https://picsum.photos/seed/psychmoney2/600/600",
    ],
    category: "books",
    brand: "Jaico Publishing",
    rating: 4.5,
    reviewCount: 76543,
    boughtLastMonth: 38000,
    inStock: true,
    stockCount: 18000,
    seller: { name: "Bookworld India", rating: 4.7 },
    variants: [
      {
        type: "size",
        label: "Format",
        options: [
          { value: "paperback", label: "Paperback", available: true },
          { value: "hardcover", label: "Hardcover", available: true },
        ],
      },
    ],
    specifications: {
      Author: "Morgan Housel",
      Publisher: "Jaico Publishing House",
      Language: "English",
      Pages: "252",
      ISBN: "978-9390166268",
      "Publication Date": "September 8, 2020",
      Dimensions: "20 x 13 x 1.5 cm",
      Weight: "220g",
    },
    reviews: [
      {
        id: "rev-14-1",
        author: "Aditi V.",
        rating: 5,
        title: "Must-read for everyone",
        content: "This book changed my entire perspective on money and investing. Simple stories with profound lessons. Every chapter is a gem.",
        date: "2026-03-02",
        helpful: 5678,
        verified: true,
      },
      {
        id: "rev-14-2",
        author: "Nikhil P.",
        rating: 5,
        title: "Best finance book ever",
        content: "Not a typical finance book with numbers and charts. It's about human behavior and money. Finished it in one sitting. Highly recommend.",
        date: "2026-02-10",
        helpful: 2345,
        verified: true,
      },
    ],
    tags: ["book", "finance", "investing", "psychology", "bestseller"],
    createdAt: "2025-03-20",
  },
  {
    id: "prod-15",
    slug: "puma-velocity-nitro-2",
    name: "Puma Velocity NITRO 2 Men's Running Shoes",
    description:
      "The Velocity NITRO 2 offers a responsive and cushioned ride for daily training. NITRO foam infused with nitrogen gas provides incredible energy return, while the rubber outsole gives excellent grip. The engineered mesh upper ensures breathability during long runs.",
    price: 5999,
    comparePrice: 10999,
    discount: 45,
    images: [
      "https://picsum.photos/seed/pumavelocity1/600/600",
      "https://picsum.photos/seed/pumavelocity2/600/600",
      "https://picsum.photos/seed/pumavelocity3/600/600",
    ],
    category: "sports-outdoors",
    brand: "Puma",
    rating: 4.4,
    reviewCount: 6789,
    boughtLastMonth: 4200,
    inStock: true,
    stockCount: 678,
    seller: { name: "Puma India Official", rating: 4.5 },
    variants: [
      {
        type: "size",
        label: "Size (UK)",
        options: [
          { value: "7", label: "UK 7", available: true },
          { value: "8", label: "UK 8", available: true },
          { value: "9", label: "UK 9", available: true },
          { value: "10", label: "UK 10", available: true },
          { value: "11", label: "UK 11", available: false },
        ],
      },
      {
        type: "color",
        label: "Color",
        options: [
          { value: "black-yellow", label: "Black/Ultra Yellow", available: true, hex: "#1a1a1a" },
          { value: "blue-white", label: "Blazing Blue/White", available: true, hex: "#2563eb" },
          { value: "red-black", label: "Fire Red/Black", available: true, hex: "#dc2626" },
        ],
      },
    ],
    specifications: {
      "Cushioning": "NITRO Foam",
      "Outer Sole": "PUMAGRIP Rubber",
      Upper: "Engineered Mesh",
      Drop: "8mm",
      Weight: "275g (UK 8)",
      Closure: "Lace-Up",
      "Ideal For": "Daily Training, Long Runs",
      "Pronation": "Neutral",
    },
    reviews: [
      {
        id: "rev-15-1",
        author: "Ravi M.",
        rating: 5,
        title: "Perfect running shoes",
        content: "Ran a half marathon in these. The NITRO foam provides amazing bounce. Very comfortable even after 20km. Great value at the sale price.",
        date: "2026-02-22",
        helpful: 345,
        verified: true,
      },
      {
        id: "rev-15-2",
        author: "Sameer K.",
        rating: 4,
        title: "Good daily trainers",
        content: "Light, responsive, and breathable. The grip is excellent on both road and light trails. Slightly narrow for wide feet.",
        date: "2026-01-28",
        helpful: 123,
        verified: true,
      },
    ],
    tags: ["shoes", "running", "puma", "nitro", "men", "training"],
    createdAt: "2025-08-25",
  },
  {
    id: "prod-16",
    slug: "samsung-crystal-4k-smart-tv",
    name: "Samsung 55\" Crystal 4K UHD Smart TV (2025 Model)",
    description:
      "Experience stunning 4K clarity with Samsung's Crystal Processor 4K. The AirSlim design is incredibly thin, while the Dynamic Crystal Color technology produces over a billion shades of color. Smart TV features include built-in apps, screen mirroring, and voice assistant support.",
    price: 44990,
    comparePrice: 64900,
    discount: 31,
    images: [
      "https://picsum.photos/seed/samsungtv1/600/600",
      "https://picsum.photos/seed/samsungtv2/600/600",
      "https://picsum.photos/seed/samsungtv3/600/600",
    ],
    category: "electronics",
    brand: "Samsung",
    rating: 4.4,
    reviewCount: 11234,
    boughtLastMonth: 3400,
    inStock: true,
    stockCount: 234,
    seller: { name: "Samsung India Official", rating: 4.8 },
    variants: [
      {
        type: "size",
        label: "Screen Size",
        options: [
          { value: "43", label: "43 inch", available: true },
          { value: "50", label: "50 inch", available: true },
          { value: "55", label: "55 inch", available: true },
          { value: "65", label: "65 inch", available: true },
        ],
      },
    ],
    specifications: {
      "Display": "55\" Crystal UHD (3840 x 2160)",
      "HDR": "HDR10+ supported",
      "Processor": "Crystal Processor 4K",
      "Refresh Rate": "60Hz (Motion Xcelerator)",
      "Sound": "20W, 2Ch, Adaptive Sound",
      "Smart TV": "Tizen OS, Built-in Apps",
      "Connectivity": "3x HDMI, 1x USB, Wi-Fi, Bluetooth",
      "Voice Assistant": "Bixby, Alexa, Google Assistant",
      "Design": "AirSlim, Bezel-less",
      Warranty: "1 Year Comprehensive + 1 Year Panel",
    },
    reviews: [
      {
        id: "rev-16-1",
        author: "Sanjay W.",
        rating: 5,
        title: "Brilliant picture quality",
        content: "The 4K picture is sharp and vibrant. Colors are accurate and the screen gets bright enough for a well-lit room. Smart features work smoothly.",
        date: "2026-03-05",
        helpful: 890,
        verified: true,
      },
      {
        id: "rev-16-2",
        author: "Lakshmi N.",
        rating: 4,
        title: "Great TV for the price",
        content: "Very happy with the purchase. Picture quality is excellent for movies and sports. The built-in speakers are decent but a soundbar is recommended.",
        date: "2026-02-15",
        helpful: 345,
        verified: true,
      },
    ],
    tags: ["tv", "smart-tv", "4k", "samsung", "crystal", "uhd"],
    createdAt: "2025-12-15",
    isFeatured: true,
  },
];

// Add featured/flash deal flags to specific products after definition
products[1].isFeatured = true; // Sony headphones
products[3].isFeatured = true; // Nike shoes
products[3].isFlashDeal = true;
products[4].isFlashDeal = true; // Levi's jeans
products[5].isFlashDeal = true; // Prestige cooktop
products[7].isFeatured = true; // Atomic Habits
products[9].isFeatured = true; // JBL speaker

// Set flash deal end times (6-24 hours from now)
const now = Date.now();
products.forEach((p) => {
  if (p.isFlashDeal) {
    const hoursAhead = 6 + Math.floor(Math.random() * 18);
    p.flashDealEndsAt = new Date(now + hoursAhead * 3600000).toISOString();
  }
});

export const flashDealProducts = products.filter((p) => p.isFlashDeal);

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}

export function getBestSellers(): Product[] {
  return [...products].sort((a, b) => b.boughtLastMonth - a.boughtLastMonth).slice(0, 8);
}

export function getRecommended(): Product[] {
  return [...products].sort((a, b) => b.rating - a.rating).slice(0, 8);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.isFeatured);
}
