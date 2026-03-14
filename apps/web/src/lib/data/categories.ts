export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  productCount: number;
  featured: boolean;
}

export const categories: Category[] = [
  {
    id: "cat-1",
    name: "Electronics",
    slug: "electronics",
    image: "https://picsum.photos/seed/electronics/400/300",
    description: "Smartphones, laptops, headphones, TVs and more",
    productCount: 4582,
    featured: true,
  },
  {
    id: "cat-2",
    name: "Fashion",
    slug: "fashion",
    image: "https://picsum.photos/seed/fashion/400/300",
    description: "Clothing, shoes, watches, and accessories",
    productCount: 8234,
    featured: true,
  },
  {
    id: "cat-3",
    name: "Home & Kitchen",
    slug: "home-kitchen",
    image: "https://picsum.photos/seed/homekitchen/400/300",
    description: "Appliances, cookware, furniture, and decor",
    productCount: 3156,
    featured: true,
  },
  {
    id: "cat-4",
    name: "Books",
    slug: "books",
    image: "https://picsum.photos/seed/books/400/300",
    description: "Fiction, non-fiction, textbooks, and more",
    productCount: 12480,
    featured: true,
  },
  {
    id: "cat-5",
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    image: "https://picsum.photos/seed/sports/400/300",
    description: "Equipment, apparel, and accessories for every sport",
    productCount: 2874,
    featured: true,
  },
  {
    id: "cat-6",
    name: "Beauty & Personal Care",
    slug: "beauty",
    image: "https://picsum.photos/seed/beauty/400/300",
    description: "Skincare, haircare, makeup, and grooming",
    productCount: 5621,
    featured: true,
  },
  {
    id: "cat-7",
    name: "Toys & Games",
    slug: "toys-games",
    image: "https://picsum.photos/seed/toys/400/300",
    description: "Toys, board games, puzzles, and collectibles",
    productCount: 1893,
    featured: false,
  },
  {
    id: "cat-8",
    name: "Grocery & Gourmet",
    slug: "grocery",
    image: "https://picsum.photos/seed/grocery/400/300",
    description: "Snacks, beverages, staples, and gourmet foods",
    productCount: 6340,
    featured: false,
  },
];
