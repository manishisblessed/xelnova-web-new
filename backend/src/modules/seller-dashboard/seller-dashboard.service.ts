import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateProductDto,
  UpdateProductDto,
  SellerProductQueryDto,
  SellerOrderQueryDto,
  UpdateSellerProfileDto,
  RevenueQueryDto,
  SettlementQueryDto,
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
  private readonly logger = new Logger(SellerDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

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

  private async generateSku(sellerId: string, categoryId: string): Promise<string> {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
    const prefix = (cat?.slug || 'GEN').slice(0, 4).toUpperCase();
    const sellerSuffix = sellerId.slice(-4).toUpperCase();
    const count = await this.prisma.product.count({ where: { sellerId } });
    return `${prefix}-${sellerSuffix}-${String(count + 1).padStart(5, '0')}`;
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const seller = await this.getSellerProfile(userId);
    const baseSlug = this.slugify(dto.name);
    const existing = await this.prisma.product.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;
    const variants = sanitizeVariants(dto.variants);

    const sku = dto.sku || await this.generateSku(seller.id, dto.categoryId);

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
        sku,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        hsnCode: dto.hsnCode,
        gstRate: dto.gstRate,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
        status: 'PENDING',
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

  // ─── Bulk Upload ───

  async bulkUploadProducts(userId: string, rows: Record<string, string>[]) {
    const seller = await this.getSellerProfile(userId);
    const results: { row: number; status: 'ok' | 'error'; message?: string; productId?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.name || !r.price || !r.categoryId) {
          results.push({ row: i + 1, status: 'error', message: 'name, price, categoryId are required' });
          continue;
        }

        const price = parseFloat(r.price);
        if (isNaN(price) || price < 0) {
          results.push({ row: i + 1, status: 'error', message: 'Invalid price' });
          continue;
        }

        const baseSlug = this.slugify(r.name);
        const slugCount = await this.prisma.product.count({ where: { slug: { startsWith: baseSlug } } });
        const slug = slugCount > 0 ? `${baseSlug}-${slugCount + 1}` : baseSlug;
        const sku = r.sku || await this.generateSku(seller.id, r.categoryId);

        const product = await this.prisma.product.create({
          data: {
            name: r.name,
            slug,
            shortDescription: r.shortDescription || null,
            description: r.description || null,
            price,
            compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : null,
            categoryId: r.categoryId,
            brand: r.brand || null,
            sellerId: seller.id,
            stock: r.stock ? parseInt(r.stock) : 0,
            images: r.images ? r.images.split('|').map((s) => s.trim()).filter(Boolean) : [],
            highlights: r.highlights ? r.highlights.split('|').map((s) => s.trim()).filter(Boolean) : [],
            tags: r.tags ? r.tags.split('|').map((s) => s.trim().toLowerCase()).filter(Boolean) : [],
            sku,
            metaTitle: r.metaTitle || null,
            metaDescription: r.metaDescription || null,
            hsnCode: r.hsnCode || null,
            gstRate: r.gstRate ? parseFloat(r.gstRate) : null,
            lowStockThreshold: r.lowStockThreshold ? parseInt(r.lowStockThreshold) : 5,
            status: 'PENDING',
          },
        });
        results.push({ row: i + 1, status: 'ok', productId: product.id });
      } catch (err: any) {
        results.push({ row: i + 1, status: 'error', message: err.message?.slice(0, 200) });
      }
    }

    return {
      total: rows.length,
      success: results.filter((r) => r.status === 'ok').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    };
  }

  // ─── Inventory Alerts ───

  async getInventoryAlerts(userId: string) {
    const seller = await this.getSellerProfile(userId);
    const products = await this.prisma.product.findMany({
      where: { sellerId: seller.id, isActive: true },
      select: {
        id: true, name: true, sku: true, stock: true, lowStockThreshold: true,
        images: true, status: true,
      },
      orderBy: { stock: 'asc' },
    });
    return products.filter((p) => p.stock <= p.lowStockThreshold);
  }

  async checkAndSendInventoryAlerts(userId: string) {
    const seller = await this.getSellerProfile(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user?.email) return { sent: false };

    const lowStockProducts = await this.prisma.product.findMany({
      where: { sellerId: seller.id, isActive: true },
      select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
    }).then((products) => products.filter((p) => p.stock <= p.lowStockThreshold));

    if (lowStockProducts.length === 0) return { sent: false, count: 0 };

    const productList = lowStockProducts
      .map((p) => `• ${p.name} (SKU: ${p.sku || 'N/A'}) — ${p.stock} left`)
      .join('\n');

    await this.emailService.sendGenericEmail(
      user.email,
      'Low Stock Alert — Xelnova Seller Dashboard',
      `Hi ${user.name || 'Seller'},\n\nThe following products are running low on stock:\n\n${productList}\n\nPlease restock soon to avoid missed sales.\n\nBest,\nXelnova Team`,
    );

    return { sent: true, count: lowStockProducts.length };
  }

  // ─── Brand Proposal ───

  async proposeBrand(userId: string, name: string, logo?: string) {
    const seller = await this.getSellerProfile(userId);
    const slug = this.slugify(name);

    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('A brand with this name already exists');

    return this.prisma.brand.create({
      data: {
        name,
        slug,
        logo: logo || null,
        proposedBy: seller.id,
        approved: false,
        featured: false,
        isActive: false,
      },
    });
  }

  async getSellerBrands(userId: string) {
    const seller = await this.getSellerProfile(userId);
    return this.prisma.brand.findMany({
      where: { proposedBy: seller.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Settlement Reports ───

  async getSettlementReport(userId: string, query: SettlementQueryDto) {
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
          paymentStatus: 'PAID',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
      },
      include: {
        order: { select: { orderNumber: true, createdAt: true, status: true, paymentMethod: true, total: true } },
        product: { select: { name: true, sku: true } },
      },
      orderBy: { order: { createdAt: 'desc' } },
    });

    const commissionRate = seller.commissionRate / 100;

    const rows = orderItems.map((oi) => {
      const gross = oi.price * oi.quantity;
      const commission = gross * commissionRate;
      const net = gross - commission;
      return {
        orderNumber: oi.order.orderNumber,
        date: oi.order.createdAt.toISOString().split('T')[0],
        productName: oi.product?.name || oi.productName,
        sku: oi.product?.sku || '',
        quantity: oi.quantity,
        unitPrice: oi.price,
        gross,
        commissionPercent: seller.commissionRate,
        commission,
        net,
        orderStatus: oi.order.status,
        paymentMethod: oi.order.paymentMethod || '',
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        gross: acc.gross + r.gross,
        commission: acc.commission + r.commission,
        net: acc.net + r.net,
      }),
      { gross: 0, commission: 0, net: 0 },
    );

    return { rows, totals, commissionRate: seller.commissionRate };
  }

  async getSettlementCsv(userId: string, query: SettlementQueryDto): Promise<string> {
    const report = await this.getSettlementReport(userId, query);
    const header = 'Order Number,Date,Product,SKU,Qty,Unit Price,Gross,Commission %,Commission,Net,Status,Payment Method';
    const lines = report.rows.map((r) =>
      [
        r.orderNumber, r.date, `"${r.productName}"`, r.sku, r.quantity,
        r.unitPrice.toFixed(2), r.gross.toFixed(2), r.commissionPercent,
        r.commission.toFixed(2), r.net.toFixed(2), r.orderStatus, r.paymentMethod,
      ].join(','),
    );
    lines.push('');
    lines.push(`,,,,,Total,${report.totals.gross.toFixed(2)},,${report.totals.commission.toFixed(2)},${report.totals.net.toFixed(2)},,`);
    return [header, ...lines].join('\n');
  }

  // ─── Sales Analytics (enhanced) ───

  async getSalesAnalytics(userId: string, period: string = 'month') {
    const seller = await this.getSellerProfile(userId);
    const productIds = (
      await this.prisma.product.findMany({ where: { sellerId: seller.id }, select: { id: true } })
    ).map((p) => p.id);

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
        },
      },
      include: {
        order: { select: { createdAt: true } },
        product: { select: { name: true, categoryId: true } },
      },
    });

    const dailyMap = new Map<string, { revenue: number; orders: Set<string>; units: number }>();
    const productMap = new Map<string, { name: string; revenue: number; units: number }>();
    const categoryMap = new Map<string, { revenue: number; units: number }>();

    for (const oi of orderItems) {
      const day = oi.order.createdAt.toISOString().split('T')[0];
      const amount = oi.price * oi.quantity;

      const d = dailyMap.get(day) || { revenue: 0, orders: new Set<string>(), units: 0 };
      d.revenue += amount;
      d.orders.add(oi.orderId);
      d.units += oi.quantity;
      dailyMap.set(day, d);

      const pName = oi.product?.name || oi.productName;
      const p = productMap.get(oi.productId) || { name: pName, revenue: 0, units: 0 };
      p.revenue += amount;
      p.units += oi.quantity;
      productMap.set(oi.productId, p);

      const catId = oi.product?.categoryId || 'unknown';
      const c = categoryMap.get(catId) || { revenue: 0, units: 0 };
      c.revenue += amount;
      c.units += oi.quantity;
      categoryMap.set(catId, c);
    }

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, d]) => ({ date, revenue: d.revenue, orders: d.orders.size, units: d.units }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topProducts = Array.from(productMap.entries())
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const categoryIds = Array.from(categoryMap.keys());
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catNameMap = new Map(categories.map((c) => [c.id, c.name]));

    const categoryData = Array.from(categoryMap.entries())
      .map(([id, d]) => ({ category: catNameMap.get(id) || 'Other', ...d }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = dailyData.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = dailyData.reduce((s, d) => s + d.orders, 0);
    const totalUnits = dailyData.reduce((s, d) => s + d.units, 0);

    return {
      period,
      summary: { totalRevenue, totalOrders, totalUnits },
      dailyData,
      topProducts,
      categoryBreakdown: categoryData,
    };
  }
}
