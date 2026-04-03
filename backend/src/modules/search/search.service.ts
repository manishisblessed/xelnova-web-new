import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, page: number = 1, limit: number = 12) {
    const term = query.toLowerCase();

    const where = {
      isActive: true,
      status: 'ACTIVE' as const,
      OR: [
        { name: { contains: term, mode: 'insensitive' as const } },
        { brand: { contains: term, mode: 'insensitive' as const } },
        { shortDescription: { contains: term, mode: 'insensitive' as const } },
        { tags: { has: term } },
      ],
    };

    const [results, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true, seller: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    const matchedCategories = await this.prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, slug: true },
    });

    const brands = [...new Set(results.map((p) => p.brand).filter(Boolean))];
    const prices = results.map((p) => p.price);
    const priceRange =
      prices.length > 0
        ? { min: Math.min(...prices), max: Math.max(...prices) }
        : { min: 0, max: 0 };

    return {
      products: results,
      total,
      page,
      limit,
      filters: { categories: matchedCategories, brands, priceRange },
    };
  }

  async autocomplete(query: string) {
    const term = query.toLowerCase();

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { brand: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { name: true, slug: true, images: true, price: true },
    });

    const categories = await this.prisma.category.findMany({
      where: { name: { contains: term, mode: 'insensitive' } },
      take: 3,
      select: { name: true, slug: true },
    });

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
