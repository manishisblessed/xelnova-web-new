import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductQueryDto } from './dto/product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [productCount, sellerCount, userCount, orderCount] =
      await Promise.all([
        this.prisma.product.count({ where: { isActive: true, status: 'ACTIVE' } }),
        this.prisma.sellerProfile.count({ where: { verified: true } }),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.order.count(),
      ]);

    return {
      products: productCount,
      sellers: sellerCount,
      customers: userCount,
      orders: orderCount,
    };
  }

  async getBrands() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    });
  }

  async getBannersByPosition(position: string) {
    return this.prisma.banner.findMany({
      where: { isActive: true, position },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getTopReviews(limit = 6) {
    return this.prisma.review.findMany({
      where: { rating: { gte: 4 } },
      orderBy: [{ helpful: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        product: { select: { name: true, slug: true, images: true } },
      },
    });
  }

  async findAll(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = { isActive: true, status: 'ACTIVE' };

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
        status: 'ACTIVE',
      },
      take: 6,
    });

    return { ...product, relatedProducts };
  }

  async findFeatured() {
    return this.prisma.product.findMany({
      where: { isFeatured: true, isActive: true, status: 'ACTIVE' },
      take: 12,
      include: { seller: true },
    });
  }

  async findTrending() {
    return this.prisma.product.findMany({
      where: { isTrending: true, isActive: true, status: 'ACTIVE' },
      take: 12,
      include: { seller: true },
    });
  }

  async findFlashDeals() {
    return this.prisma.product.findMany({
      where: { isFlashDeal: true, isActive: true, status: 'ACTIVE' },
      include: { seller: true },
    });
  }

  async getBanners() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private readonly defaultShippingRates = {
    weightSlabs: [
      { upToKg: 0.5, rate: 35 },
      { upToKg: 1, rate: 50 },
      { upToKg: 2, rate: 70 },
      { upToKg: 5, rate: 120 },
      { upToKg: 10, rate: 200 },
      { upToKg: 99, rate: 350 },
    ],
    dimensionSlabs: [
      { upToCm3: 5000, rate: 0 },
      { upToCm3: 15000, rate: 20 },
      { upToCm3: 50000, rate: 50 },
      { upToCm3: 999999, rate: 100 },
    ],
    baseCurrency: 'INR',
  };

  async getShippingRates() {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const payload = row?.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : {};
    return { ...this.defaultShippingRates, ...(payload.shippingRates as Record<string, unknown>) };
  }

  /**
   * Public-facing marketplace policy used by the storefront PDP / cart to
   * surface the right delivery & return copy. We deliberately scope this to
   * the strictly customer-readable fields so site settings (payment keys,
   * courier creds, etc.) never leak through `/products/marketplace-policy`.
   */
  async getMarketplacePolicy() {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const payload =
      row?.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : {};

    const shipping =
      payload.shipping && typeof payload.shipping === 'object'
        ? (payload.shipping as Record<string, unknown>)
        : {};
    const returnPolicy =
      payload.returnPolicy && typeof payload.returnPolicy === 'object'
        ? (payload.returnPolicy as Record<string, unknown>)
        : {};

    const num = (v: unknown, fallback: number) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;

    return {
      defaultDeliveryDays: num(shipping.defaultDeliveryDays, 5),
      freeShippingMin: num(shipping.freeShippingMin, 499),
      returnPolicy: {
        isCancellable: returnPolicy.isCancellable !== false,
        isReturnable: returnPolicy.isReturnable !== false,
        isReplaceable: !!returnPolicy.isReplaceable,
        returnWindow: num(returnPolicy.returnWindow, 7),
        cancellationWindow: num(returnPolicy.cancellationWindow, 0),
      },
    };
  }
}
