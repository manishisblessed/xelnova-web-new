import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductQueryDto } from './dto/product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

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
      where: { rating: { gte: 4 }, moderationStatus: 'APPROVED' },
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
        { xelnovaProductId: { contains: query.search.trim(), mode: 'insensitive' } },
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
    const trimmed = slug.trim();
    const isXelCode = /^XEL\d+$/i.test(trimmed);
    const product = isXelCode
      ? await this.prisma.product.findFirst({
          where: { xelnovaProductId: trimmed.toUpperCase() },
          include: {
            category: { include: { parent: true } },
            seller: true,
          },
        })
      : await this.prisma.product.findUnique({
          where: { slug: trimmed },
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

    // Get available coupons for this product
    const availableCoupons = await this.getProductCoupons(product.id);

    return { ...product, relatedProducts, availableCoupons };
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
   * Get available coupons for a specific product that customers can apply.
   * Returns only APPROVED, active, non-expired coupons that apply to:
   * - Global scope (all products)
   * - Category scope (product's category)
   * - Seller scope (product's seller)
   */
  async getProductCoupons(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, sellerId: true },
    });
    if (!product) {
      this.logger.debug(`getProductCoupons: Product ${productId} not found`);
      return [];
    }

    this.logger.debug(`getProductCoupons: Product ${productId} has sellerId=${product.sellerId}, categoryId=${product.categoryId}`);

    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        moderationStatus: 'APPROVED',
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } },
        ],
      },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxDiscount: true,
        validUntil: true,
        usageLimit: true,
        usedCount: true,
        scope: true,
        categoryId: true,
        sellerId: true,
      },
      orderBy: [{ discountValue: 'desc' }],
    });

    this.logger.debug(`getProductCoupons: Found ${coupons.length} approved active coupons total`);
    coupons.forEach((c) => {
      this.logger.debug(`  Coupon ${c.code}: scope=${c.scope}, sellerId=${c.sellerId}, categoryId=${c.categoryId}`);
    });

    // Filter coupons that apply to this product
    const filtered = coupons.filter((coupon) => {
      // Check usage limit - if limit is set, ensure used count is below it
      if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
        this.logger.debug(`  Coupon ${coupon.code} excluded: usage limit reached (${coupon.usedCount}/${coupon.usageLimit})`);
        return false;
      }
      // Check scope
      if (coupon.scope === 'global') {
        this.logger.debug(`  Coupon ${coupon.code} included: global scope`);
        return true;
      }
      if (coupon.scope === 'category' && coupon.categoryId === product.categoryId) {
        this.logger.debug(`  Coupon ${coupon.code} included: category match`);
        return true;
      }
      if (coupon.scope === 'seller' && coupon.sellerId === product.sellerId) {
        this.logger.debug(`  Coupon ${coupon.code} included: seller match (${coupon.sellerId} === ${product.sellerId})`);
        return true;
      }
      this.logger.debug(`  Coupon ${coupon.code} excluded: scope=${coupon.scope}, coupon.sellerId=${coupon.sellerId}, product.sellerId=${product.sellerId}, categoryId match=${coupon.categoryId === product.categoryId}`);
      return false;
    });

    this.logger.debug(`getProductCoupons: ${filtered.length} coupons match product ${productId} (sellerId: ${product.sellerId})`);

    // Check if seller has their own coupons for this product
    const sellerCoupons = filtered.filter(
      (c) => c.scope === 'seller' && c.sellerId === product.sellerId,
    );
    const categoryCoupons = filtered.filter(
      (c) => c.scope === 'category' && c.categoryId === product.categoryId,
    );
    const globalCoupons = filtered.filter((c) => c.scope === 'global');

    // If seller has their own coupons, hide global coupons and only show seller + category coupons
    // If seller has NO coupons, show global coupons
    let finalCoupons: typeof filtered;
    if (sellerCoupons.length > 0) {
      // Seller has coupons - show seller coupons first, then category coupons, hide global
      finalCoupons = [...sellerCoupons, ...categoryCoupons];
      this.logger.debug(`getProductCoupons: Seller has ${sellerCoupons.length} coupons, hiding ${globalCoupons.length} global coupons`);
    } else {
      // No seller coupons - show category first, then global
      finalCoupons = [...categoryCoupons, ...globalCoupons];
      this.logger.debug(`getProductCoupons: No seller coupons, showing ${categoryCoupons.length} category + ${globalCoupons.length} global coupons`);
    }

    return finalCoupons.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount,
      maxDiscount: c.maxDiscount,
      validUntil: c.validUntil,
    }));
  }

  /**
   * Get available coupons by product slug (for PDP)
   */
  async getCouponsBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true, sellerId: true },
    });
    if (!product) return [];
    return this.getProductCoupons(product.id);
  }

  /**
   * Debug method to see all coupons in database
   */
  async debugGetAllCoupons() {
    const coupons = await this.prisma.coupon.findMany({
      select: {
        id: true,
        code: true,
        scope: true,
        sellerId: true,
        categoryId: true,
        moderationStatus: true,
        isActive: true,
        discountType: true,
        discountValue: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return coupons;
  }

  /**
   * Debug method to see product details
   */
  async debugGetProductInfo(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        sellerId: true,
        categoryId: true,
        seller: {
          select: {
            id: true,
            storeName: true,
            userId: true,
          },
        },
      },
    });
    
    if (!product) return { error: 'Product not found' };
    
    const availableCoupons = await this.getProductCoupons(product.id);
    
    return {
      product,
      availableCoupons,
      debug: {
        productSellerId: product.sellerId,
        sellerStoreName: product.seller?.storeName,
      },
    };
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
