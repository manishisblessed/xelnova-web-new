import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface SearchFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, page: number = 1, limit: number = 12, filters: SearchFilters = {}) {
    const skip = (page - 1) * limit;
    const term = query.trim();

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      status: 'ACTIVE',
    };

    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
        { shortDescription: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { hasSome: term.toLowerCase().split(/\s+/) } },
      ];
    }

    if (filters.category) {
      where.category = { slug: filters.category };
    }
    if (filters.brand) {
      where.brand = { equals: filters.brand, mode: 'insensitive' };
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }
    if (filters.minRating !== undefined) {
      where.rating = { gte: filters.minRating };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { reviewCount: 'desc' };
    switch (filters.sortBy) {
      case 'price_asc': orderBy = { price: 'asc' }; break;
      case 'price_desc': orderBy = { price: 'desc' }; break;
      case 'rating': orderBy = { rating: 'desc' }; break;
      case 'newest': orderBy = { createdAt: 'desc' }; break;
    }

    const [results, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, storeName: true, slug: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Build available filters from the full matching set (unconstrained by pagination)
    const filterAggBase: Prisma.ProductWhereInput = { isActive: true, status: 'ACTIVE' };
    if (term) filterAggBase.OR = where.OR;

    const [allCategories, allBrands, priceAgg] = await Promise.all([
      this.prisma.product.findMany({
        where: filterAggBase,
        select: { category: { select: { id: true, name: true, slug: true } } },
        distinct: ['categoryId'],
      }),
      this.prisma.product.findMany({
        where: { ...filterAggBase, brand: { not: null } },
        select: { brand: true },
        distinct: ['brand'],
      }),
      this.prisma.product.aggregate({
        where: filterAggBase,
        _min: { price: true },
        _max: { price: true },
      }),
    ]);

    return {
      products: results,
      total,
      page,
      limit,
      filters: {
        categories: allCategories.map((p) => p.category),
        brands: allBrands.map((p) => p.brand).filter(Boolean) as string[],
        priceRange: {
          min: priceAgg._min.price ?? 0,
          max: priceAgg._max.price ?? 0,
        },
      },
    };
  }

  async autocomplete(query: string) {
    const term = query.trim();
    if (!term) return { products: [], categories: [] };

    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          status: 'ACTIVE',
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { brand: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { reviewCount: 'desc' },
        select: { name: true, slug: true, images: true, price: true },
      }),
      this.prisma.category.findMany({
        where: { name: { contains: term, mode: 'insensitive' } },
        take: 3,
        select: { name: true, slug: true },
      }),
    ]);

    return {
      products: products.map((p) => ({
        type: 'product' as const,
        text: p.name,
        slug: p.slug,
        image: p.images[0] || '',
        price: p.price,
      })),
      categories: categories.map((c) => ({
        type: 'category' as const,
        text: c.name,
        slug: c.slug,
      })),
    };
  }

  async getPopularSearches() {
    const [topBrands, topProducts, topCategories] = await Promise.all([
      this.prisma.product.groupBy({
        by: ['brand'],
        where: { isActive: true, status: 'ACTIVE', brand: { not: null } },
        _count: { brand: true },
        orderBy: { _count: { brand: 'desc' } },
        take: 4,
      }),
      this.prisma.product.findMany({
        where: { isActive: true, status: 'ACTIVE', isFeatured: true },
        select: { name: true },
        orderBy: { reviewCount: 'desc' },
        take: 4,
      }),
      this.prisma.category.findMany({
        where: { parentId: null },
        select: { name: true },
        orderBy: { productCount: 'desc' },
        take: 4,
      }),
    ]);

    const searches = [
      ...topProducts.map((p) => p.name),
      ...topBrands.filter((b) => b.brand).map((b) => b.brand as string),
      ...topCategories.map((c) => c.name),
    ];

    const unique = [...new Set(searches)].slice(0, 10);
    return unique.length > 0
      ? unique
      : ['Electronics', 'Fashion', 'Home & Kitchen', 'Sports', 'Beauty'];
  }
}
