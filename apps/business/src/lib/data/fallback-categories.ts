import type { Category } from './categories';

/**
 * Shown when the categories API is unavailable or returns no rows (common on local dev
 * without a running API). Matches top-level categories in `backend/prisma/seed.ts`.
 */
export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'fb-electronics', name: 'Electronics', slug: 'electronics', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-fashion', name: 'Fashion', slug: 'fashion', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-home-kitchen', name: 'Home & Kitchen', slug: 'home-kitchen', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-beauty', name: 'Beauty & Personal Care', slug: 'beauty', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-sports', name: 'Sports & Fitness', slug: 'sports', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-books', name: 'Books', slug: 'books', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-toys', name: 'Toys & Games', slug: 'toys', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-groceries', name: 'Groceries', slug: 'groceries', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-automotive', name: 'Automotive', slug: 'automotive', image: '', description: '', productCount: 0, featured: true },
  { id: 'fb-health', name: 'Health & Wellness', slug: 'health', image: '', description: '', productCount: 0, featured: true },
];
