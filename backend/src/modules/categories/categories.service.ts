import { Injectable } from '@nestjs/common';
import { categories, products } from '../../data/mock-data';

@Injectable()
export class CategoriesService {
  findAll() {
    return categories;
  }

  findBySlug(slug: string) {
    const findCategory = (cats: typeof categories): (typeof categories)[0] | null => {
      for (const cat of cats) {
        if (cat.slug === slug) return cat;
        if (cat.children) {
          const found = findCategory(cat.children);
          if (found) return found;
        }
      }
      return null;
    };

    const category = findCategory(categories);
    if (!category) return null;

    const categoryProducts = products.filter(
      (p) => p.category === slug || p.subcategory === slug,
    );

    return { category, products: categoryProducts };
  }
}
