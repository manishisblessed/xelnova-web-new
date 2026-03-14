import { Injectable } from '@nestjs/common';
import { products, banners, sellers } from '../../data/mock-data';
import { ProductQueryDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  findAll(query: ProductQueryDto) {
    let filtered = [...products];

    if (query.category) {
      filtered = filtered.filter(
        (p) => p.category === query.category || p.subcategory === query.category,
      );
    }

    if (query.subcategory) {
      filtered = filtered.filter((p) => p.subcategory === query.subcategory);
    }

    if (query.brand) {
      filtered = filtered.filter(
        (p) => p.brand.toLowerCase() === query.brand!.toLowerCase(),
      );
    }

    if (query.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= query.minPrice!);
    }

    if (query.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= query.maxPrice!);
    }

    if (query.minRating !== undefined) {
      filtered = filtered.filter((p) => p.rating >= query.minRating!);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term) ||
          p.shortDescription.toLowerCase().includes(term) ||
          p.tags.some((t) => t.includes(term)),
      );
    }

    if (query.tag) {
      filtered = filtered.filter((p) => p.tags.includes(query.tag!));
    }

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'price_asc':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          filtered.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          break;
        case 'popular':
          filtered.sort((a, b) => b.reviewCount - a.reviewCount);
          break;
      }
    }

    const total = filtered.length;
    const page = query.page;
    const limit = query.limit;
    const start = (page - 1) * limit;
    const paginatedItems = filtered.slice(start, start + limit);

    return { items: paginatedItems, total, page, limit };
  }

  findBySlug(slug: string) {
    const product = products.find((p) => p.slug === slug);
    if (!product) return null;

    const seller = sellers.find((s) => s.id === product.sellerId);
    const relatedProducts = products
      .filter(
        (p) => p.category === product.category && p.id !== product.id,
      )
      .slice(0, 6);

    return { ...product, seller, relatedProducts };
  }

  findFeatured() {
    return products.filter((p) => p.isFeatured).slice(0, 12);
  }

  findTrending() {
    return products.filter((p) => p.isTrending).slice(0, 12);
  }

  findFlashDeals() {
    return products
      .filter((p) => p.isFlashDeal)
      .map((p) => ({
        ...p,
        flashDealEndsAt: p.flashDealEndsAt || null,
      }));
  }

  getBanners() {
    return banners;
  }
}
