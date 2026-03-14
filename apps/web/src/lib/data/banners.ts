export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta: string;
  ctaLink: string;
  gradient: string;
}

export const banners: Banner[] = [
  {
    id: "banner_01",
    title: "Grand Xelnova Sale",
    subtitle: "Up to 70% Off on Top Brands",
    description: "Biggest sale of the season — unbeatable prices on electronics, fashion, home & more. Limited time only!",
    image: "",
    cta: "Shop the Sale",
    ctaLink: "/products?sale=true",
    gradient: "from-amber-600 via-amber-500 to-yellow-400"
  },
  {
    id: "banner_02",
    title: "Electronics Fest",
    subtitle: "Latest Gadgets at Lowest Prices",
    description: "Get flagship smartphones, laptops, and audio gear with exclusive bank offers and no-cost EMI.",
    image: "",
    cta: "Explore Electronics",
    ctaLink: "/products?category=electronics",
    gradient: "from-blue-900 via-blue-700 to-cyan-500"
  },
  {
    id: "banner_03",
    title: "Fashion Week Special",
    subtitle: "Styles That Define You",
    description: "Trending apparel, footwear, and accessories from top brands. Extra 15% off on first purchase.",
    image: "",
    cta: "Shop Fashion",
    ctaLink: "/products?category=fashion",
    gradient: "from-pink-600 via-rose-500 to-orange-400"
  },
  {
    id: "banner_04",
    title: "New Arrivals",
    subtitle: "Be the First to Own",
    description: "Discover just-launched products across all categories. Early bird prices for a limited time.",
    image: "",
    cta: "See What's New",
    ctaLink: "/products?sort=newest",
    gradient: "from-emerald-700 via-emerald-500 to-teal-400"
  },
  {
    id: "banner_05",
    title: "Summer Collection '26",
    subtitle: "Beat the Heat in Style",
    description: "Light fabrics, cool shades, and summer essentials handpicked for the Indian summer.",
    image: "",
    cta: "Shop Summer",
    ctaLink: "/products?tag=summer",
    gradient: "from-orange-500 via-red-500 to-pink-500"
  },
  {
    id: "banner_06",
    title: "Flash Deals",
    subtitle: "Ends in Hours, Not Days",
    description: "Jaw-dropping deals refreshed every few hours. Grab them before they're gone!",
    image: "",
    cta: "Grab Deals Now",
    ctaLink: "/products?deals=flash",
    gradient: "from-violet-700 via-purple-600 to-fuchsia-500"
  }
];
