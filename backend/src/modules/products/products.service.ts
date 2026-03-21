import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductQueryDto } from './dto/product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.category) {
      const category = await this.prisma.category.findUnique({
        where: { slug: query.category },
        include: { children: true },
      });
      if (category) {
        const categoryIds = [
          category.id,
          ...category.children.map((c) => c.id),
        ];
        where.categoryId = { in: categoryIds };
      }
    }

    if (query.subcategory) {
      const subcat = await this.prisma.category.findUnique({
        where: { slug: query.subcategory },
      });
      if (subcat) {
        where.categoryId = subcat.id;
      }
    }

    if (query.brand) {
      where.brand = { equals: query.brand, mode: 'insensitive' };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    if (query.minRating !== undefined) {
      where.rating = { gte: query.minRating };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search.toLowerCase() } },
      ];
    }

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (query.sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'popular':
        orderBy = { reviewCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { category: true, seller: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { include: { parent: true } },
        seller: true,
      },
    });
    if (!product) return null;

    const relatedProducts = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      take: 6,
    });

    return { ...product, relatedProducts };
  }

  async findFeatured() {
    return this.prisma.product.findMany({
      where: { isFeatured: true, isActive: true },
      take: 12,
      include: { seller: true },
    });
  }

  async findTrending() {
    return this.prisma.product.findMany({
      where: { isTrending: true, isActive: true },
      take: 12,
      include: { seller: true },
    });
  }

  async findFlashDeals() {
    return this.prisma.product.findMany({
      where: { isFlashDeal: true, isActive: true },
      include: { seller: true },
    });
  }

  async getBanners() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
