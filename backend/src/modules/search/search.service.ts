import { Injectable } from '@nestjs/common';
import { products, categories, popularSearches } from '../../data/mock-data';

@Injectable()
export class SearchService {
  search(query: string, page: number = 1, limit: number = 12) {
    const term = query.toLowerCase();

    const results = products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.shortDescription.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.subcategory.toLowerCase().includes(term) ||
        p.tags.some((t) => t.includes(term)),
    );

    const total = results.length;
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    const matchedCategories = categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.slug.toLowerCase().includes(term),
    );

    const brands = [...new Set(results.map((p) => p.brand))];
    const priceRange = results.length
      ? { min: Math.min(...results.map((p) => p.price)), max: Math.max(...results.map((p) => p.price)) }
      : { min: 0, max: 0 };

    return {
      products: paginatedResults,
      total,
      page,
      limit,
      filters: {
        categories: matchedCategories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        })),
        brands,
        priceRange,
      },
    };
  }

  autocomplete(query: string) {
    const term = query.toLowerCase();

    const productSuggestions = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term),
      )
      .slice(0, 5)
      .map((p) => ({
        type: 'product' as const,
        text: p.name,
        slug: p.slug,
        image: p.images[0],
        price: p.price,
      }));

    const categorySuggestions = categories
      .flatMap((c) => [c, ...(c.children || [])])
      .filter((c) => c.name.toLowerCase().includes(term))
      .slice(0, 3)
      .map((c) => ({
        type: 'category' as const,
        text: c.name,
        slug: c.slug,
      }));

    return { products: productSuggestions, categories: categorySuggestions };
  }

  getPopularSearches() {
    return popularSearches;
  }
}
