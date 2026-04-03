import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  SellerProductQueryDto,
  SellerOrderQueryDto,
  UpdateSellerProfileDto,
  RevenueQueryDto,
} from './dto/seller-dashboard.dto';
import { Prisma, ProductStatus } from '@prisma/client';

/**
 * Validate the `variants` JSON payload from the seller.
 * Expected shape per group:
 *   { type, label, sizeChart?, options: Array<{ value, label, available, hex?, image?, bigImage?, price?, compareAtPrice?, stock?, sku? }> }
 */
function sanitizeVariants(raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw;
  if (!Array.isArray(raw)) throw new BadRequestException('variants must be an array');
  for (const group of raw) {
    if (!group || typeof group !== 'object') throw new BadRequestException('Each variant group must be an object');
    const g = group as Record<string, unknown>;
    if (typeof g.label !== 'string' || !g.label.trim()) throw new BadRequestException('Variant group label is required');
    if (!Array.isArray(g.options)) throw new BadRequestException('Variant group options must be an array');

    if (g.sizeChart !== undefined && g.sizeChart !== null) {
      if (!Array.isArray(g.sizeChart)) throw new BadRequestException('sizeChart must be an array');
      for (const row of g.sizeChart) {
        if (!row || typeof row !== 'object') throw new BadRequestException('Each sizeChart row must be an object');
        const r = row as Record<string, unknown>;
        if (typeof r.label !== 'string') throw new BadRequestException('sizeChart row must have a label');
        if (!r.values || typeof r.values !== 'object') throw new BadRequestException('sizeChart row must have a values object');
      }
    }

    for (const opt of g.options) {
      if (!opt || typeof opt !== 'object') throw new BadRequestException('Each variant option must be an object');
      const o = opt as Record<string, unknown>;
      if (o.images !== undefined) {
        if (!Array.isArray(o.images)) throw new BadRequestException('Variant option images must be an array');
        for (const img of o.images) {
          if (typeof img !== 'string') throw new BadRequestException('Each item in variant option images must be a string URL');
        }
      }
      if (typeof o.price === 'number' && o.price < 0) throw new BadRequestException('Variant option price cannot be negative');
      if (typeof o.compareAtPrice === 'number' && o.compareAtPrice < 0) throw new BadRequestException('Variant option compareAtPrice cannot be negative');
      if (typeof o.stock === 'number' && o.stock < 0) throw new BadRequestException('Variant option stock cannot be negative');
    }
  }
  return raw;
}

@Injectable()
export class SellerDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSellerProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');
    return profile;
  }

  /** Used to gate the seller panel when the user has SELLER role but no onboarding row yet. */
  async getRegistrationStatus(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true, onboardingStatus: true, onboardingStep: true },
    });

    const completedStatuses = ['APPROVED', 'UNDER_REVIEW', 'DOCUMENTS_SUBMITTED'];
    const onboardingComplete = !!profile && completedStatuses.includes(profile.onboardingStatus);

    return {
      hasSellerProfile: !!profile,
      sellerId: profile?.id ?? null,
      onboardingStatus: profile?.onboardingStatus ?? null,
      onboardingStep: profile?.onboardingStep ?? null,
      onboardingComplete,
    };
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // ─── Dashboard Stats ───

  async getDashboard(userId: string) {
    const seller = await this.getSellerProfile(userId);

    const [totalProducts, activeProducts, pendingProducts] = await Promise.all([
      this.prisma.product.count({ where: { sellerId: seller.id } }),
      this.prisma.product.count({ where: { sellerId: seller.id, status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { sellerId: seller.id, status: 'PENDING' } }),
    ]);

    const sellerProductIds = await this.prisma.product.findMany({
      where: { sellerId: seller.id },
      select: { id: true },
    });
    const productIds = sellerProductIds.map((p) => p.id);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { productId: { in: productIds } },
      include: { order: { select: { status: true, createdAt: true, paymentStatus: true } } },
    });

    const totalRevenue = orderItems
      .filter((oi) => oi.order.status !== 'CANCELLED' && oi.order.status !== 'RETURNED')
      .reduce((sum, oi) => sum + oi.price * oi.quantity, 0);

    const totalOrders = new Set(orderItems.map((oi) => oi.orderId)).size;
    const pendingOrders = new Set(
      orderItems.filter((oi) => oi.order.status === 'PENDING').map((oi) => oi.orderId),
    ).size;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenue = orderItems
      .filter(
        (oi) =>
          oi.order.createdAt >= monthStart &&
          oi.order.status !== 'CANCELLED',
      )
      .reduce((sum, oi) => sum + oi.price * oi.quantity, 0);

    return {
      totalProducts,
      activeProducts,
      pendingProducts,
      totalOrders,
      pendingOrders,
      totalRevenue,
      monthRevenue,
      totalSales: seller.totalSales,
      rating: seller.rating,
      verified: seller.verified,
    };
  }

  // ─── Product CRUD ───

  async getProducts(userId: string, query: SellerProductQueryDto) {
    const seller = await this.getSellerProfile(userId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { sellerId: seller.id };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status as ProductStatus;
    if (query.category) where.categoryId = query.category;

    const sortField = query.sortBy || 'createdAt';
    const sortDir = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy = { [sortField]: sortDir } as Prisma.ProductOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { category: { select: { name: true, slug: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const seller = await this.getSellerProfile(userId);
    const baseSlug = this.slugify(dto.name);
    const existing = await this.prisma.product.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;
    const variants = sanitizeVariants(dto.variants);

    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        shortDescription: dto.shortDescription,
        description: dto.description,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        categoryId: dto.categoryId,
        brand: dto.brand,
        sellerId: seller.id,
        stock: dto.stock || 0,
        images: dto.images || [],
        highlights: dto.highlights || [],
        tags: dto.tags || [],
        variants: variants as any,
        specifications: dto.specifications,
        sku: dto.sku,
        status: 'ACTIVE',
      },
      include: { category: { select: { name: true } } },
    });
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const seller = await this.getSellerProfile(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== seller.id) throw new ForbiddenException('Not your product');

    if (dto.variants !== undefined) {
      dto.variants = sanitizeVariants(dto.variants) as any;
    }

    if (dto.status !== undefined) {
      const allowed: ProductStatus[] = [ProductStatus.ACTIVE, ProductStatus.ON_HOLD];
      if (!allowed.includes(dto.status as ProductStatus)) {
        throw new BadRequestException(`Status must be one of: ${allowed.join(', ')}`);
      }
    }

    const data: any = { ...dto };
    if (dto.name) data.slug = this.slugify(dto.name) + '-' + Date.now().toString(36);

    return this.prisma.product.update({
      where: { id: productId },
      data,
      include: { category: { select: { name: true } } },
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const seller = await this.getSellerProfile(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== seller.id) throw new ForbiddenException('Not your product');

    await this.prisma.product.delete({ where: { id: productId } });
    return { deleted: true };
  }

  async getProductById(userId: string, productId: string) {
    const seller = await this.getSellerProfile(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { name: true, slug: true } },
        reviews: { take: 5, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== seller.id) throw new ForbiddenException('Not your product');
    return product;
  }

  // ─── Orders ───

  async getOrders(userId: string, query: SellerOrderQueryDto) {
    const seller = await this.getSellerProfile(userId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const productIds = (
      await this.prisma.product.findMany({ where: { sellerId: seller.id }, select: { id: true } })
    ).map((p) => p.id);

    const where: Prisma.OrderWhereInput = {
      items: { some: { productId: { in: productIds } } },
    };

    if (query.status) where.status = query.status as any;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          items: {
            where: { productId: { in: productIds } },
            include: { product: { select: { name: true, images: true } } },
          },
          shippingAddress: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const seller = await this.getSellerProfile(userId);
    const productIds = (
      await this.prisma.product.findMany({ where: { sellerId: seller.id }, select: { id: true } })
    ).map((p) => p.id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const hasSellerProducts = order.items.some((item) => productIds.includes(item.productId));
    if (!hasSellerProducts) throw new ForbiddenException('Order has none of your products');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
      include: { items: true, user: { select: { name: true, email: true, phone: true } }, shippingAddress: true },
    });
  }

  // ─── Revenue & Analytics ───

  async getRevenue(userId: string, query: RevenueQueryDto) {
    const seller = await this.getSellerProfile(userId);
    const productIds = (
      await this.prisma.product.findMany({ where: { sellerId: seller.id }, select: { id: true } })
    ).map((p) => p.id);

    const dateFilter: any = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
      },
      include: { order: { select: { createdAt: true, status: true } } },
    });

    const totalRevenue = orderItems.reduce((s, oi) => s + oi.price * oi.quantity, 0);
    const totalOrders = new Set(orderItems.map((oi) => oi.orderId)).size;
    const totalUnits = orderItems.reduce((s, oi) => s + oi.quantity, 0);

    const dailyMap = new Map<string, number>();
    orderItems.forEach((oi) => {
      const day = oi.order.createdAt.toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + oi.price * oi.quantity);
    });
    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const commissionRate = seller.commissionRate / 100;
    const commission = totalRevenue * commissionRate;
    const netRevenue = totalRevenue - commission;

    return { totalRevenue, netRevenue, commission, commissionRate: seller.commissionRate, totalOrders, totalUnits, dailyRevenue };
  }

  async getAnalytics(userId: string) {
    const seller = await this.getSellerProfile(userId);
    const productIds = (
      await this.prisma.product.findMany({ where: { sellerId: seller.id }, select: { id: true } })
    ).map((p) => p.id);

    const [topProducts, recentReviews, categoryBreakdown] = await Promise.all([
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { productId: { in: productIds } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      this.prisma.review.findMany({
        where: { productId: { in: productIds } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } }, product: { select: { name: true } } },
      }),
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: { sellerId: seller.id },
        _count: true,
      }),
    ]);

    const topProductDetails = await Promise.all(
      topProducts.map(async (tp) => {
        const product = await this.prisma.product.findUnique({
          where: { id: tp.productId },
          select: { name: true, images: true, price: true },
        });
        return { ...tp, product };
      }),
    );

    const categoryDetails = await Promise.all(
      categoryBreakdown.map(async (cb) => {
        const cat = await this.prisma.category.findUnique({ where: { id: cb.categoryId }, select: { name: true } });
        return { category: cat?.name, count: cb._count };
      }),
    );

    return { topProducts: topProductDetails, recentReviews, categoryBreakdown: categoryDetails };
  }

  // ─── Profile ───

  async getProfile(userId: string) {
    const seller = await this.getSellerProfile(userId);
    return this.prisma.sellerProfile.findUnique({
      where: { id: seller.id },
      include: { user: { select: { name: true, email: true, phone: true, avatar: true } } },
    });
  }

  async updateProfile(userId: string, dto: UpdateSellerProfileDto) {
    const seller = await this.getSellerProfile(userId);
    return this.prisma.sellerProfile.update({
      where: { id: seller.id },
      data: dto,
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
  }
}
