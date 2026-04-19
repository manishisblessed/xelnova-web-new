import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WalletService } from '../wallet/wallet.service';
import { PaymentService } from '../payment/payment.service';
import { NotificationService } from '../notifications/notification.service';
import {
  CreateProductDto,
  UpdateProductDto,
  SellerProductQueryDto,
  SellerOrderQueryDto,
  UpdateSellerProfileDto,
  RevenueQueryDto,
  SettlementQueryDto,
  CreateSellerCouponDto,
  UpdateSellerCouponDto,
} from './dto/seller-dashboard.dto';
import { Prisma, ProductStatus } from '@prisma/client';
import { AdminService } from '../admin/admin.service';
import type { ProductAttributePresetsPayload } from '../admin/default-product-attribute-presets';
import { DEFAULT_GST_PERCENT, priceExclusiveFromInclusive } from '@xelnova/utils';

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

function hasAtLeastOneEntry(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return Object.values(raw as Record<string, unknown>).some((v) => String(v ?? '').trim().length > 0);
}

@Injectable()
export class SellerDashboardService {
  private readonly logger = new Logger(SellerDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly walletService: WalletService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly adminService: AdminService,
  ) {}

  private async getSellerProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');
    return profile;
  }

  /** Merged site settings presets (same for all sellers). */
  async getProductAttributePresets(): Promise<ProductAttributePresetsPayload> {
    const s = (await this.adminService.getSiteSettings()) as { productAttributePresets: ProductAttributePresetsPayload };
    return s.productAttributePresets;
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
    if (!dto.brand?.trim()) {
      throw new BadRequestException('Brand is required');
    }
    if (!dto.hsnCode?.trim()) {
      throw new BadRequestException('HSN code is required');
    }
    if (dto.gstRate == null || Number.isNaN(Number(dto.gstRate))) {
      throw new BadRequestException('GST rate is required');
    }
    const hasProductInfo =
      hasAtLeastOneEntry(dto.featuresAndSpecs) ||
      hasAtLeastOneEntry(dto.materialsAndCare) ||
      hasAtLeastOneEntry(dto.itemDetails) ||
      hasAtLeastOneEntry(dto.additionalDetails) ||
      Boolean(dto.productDescription?.trim());
    if (!hasProductInfo) {
      throw new BadRequestException('Add at least one product information section');
    }
    if (!dto.brandAuthorizationCertificate?.trim()) {
      throw new BadRequestException('Brand authorization certificate is required');
    }
    const additionalDetailsBase =
      dto.additionalDetails && typeof dto.additionalDetails === 'object' && !Array.isArray(dto.additionalDetails)
        ? { ...(dto.additionalDetails as Record<string, unknown>) }
        : {};
    const additionalDetails = {
      ...additionalDetailsBase,
      'Brand Authorization Certificate': dto.brandAuthorizationCertificate.trim(),
    } as unknown as Prisma.InputJsonValue;

    const sku = dto.sku || await this.generateSku(seller.id, dto.categoryId);
    const returnPolicy = await this.adminService.getMarketplaceReturnPolicy();

    const created = await this.prisma.product.create({
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
        weight: dto.weight,
        dimensions: dto.dimensions,
        ...returnPolicy,
        featuresAndSpecs: dto.featuresAndSpecs,
        materialsAndCare: dto.materialsAndCare,
        itemDetails: dto.itemDetails,
        additionalDetails,
        productDescription: dto.productDescription,
        safetyInfo: dto.safetyInfo,
        regulatoryInfo: dto.regulatoryInfo,
        warrantyInfo: dto.warrantyInfo,
        status: 'PENDING',
      },
      include: { category: { select: { name: true } } },
    });

    // Fan out to the admin dashboard bell so reviewers see new submissions
    // immediately. Fire-and-forget — a failure in the notification side
    // must not roll back the product itself.
    this.notificationService
      .notifyAllAdmins({
        type: 'ADMIN_PRODUCT_SUBMITTED',
        title: 'New product submitted for review',
        body: `${seller.storeName} submitted "${created.name}" for review.`,
        data: {
          productId: created.id,
          productName: created.name,
          slug: created.slug,
          sku: created.sku,
          sellerId: seller.id,
          storeName: seller.storeName,
        },
      })
      .catch(() => {});

    return created;
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

    /**
     * Re-approval guard.
     *
     * If the seller edits any of these *catalog content* fields on a product
     * that has already been approved (status === ACTIVE), the listing is
     * pulled back into the admin approval queue (status = PENDING, hidden
     * from storefront) so a human can re-verify the change before it goes
     * live again. Inventory-only updates (stock, low-stock threshold,
     * pause/resume via ON_HOLD) do not trigger re-approval.
     */
    const REVIEW_TRIGGER_FIELDS = [
      'name',
      'shortDescription',
      'description',
      'productDescription',
      'price',
      'compareAtPrice',
      'images',
      'variants',
      'categoryId',
      'brand',
      'brandAuthorizationCertificate',
      'highlights',
      'tags',
      'featuresAndSpecs',
      'materialsAndCare',
      'itemDetails',
      'additionalDetails',
      'safetyInfo',
      'regulatoryInfo',
      'warrantyInfo',
      'weight',
      'dimensions',
      'hsnCode',
      'gstRate',
      'metaTitle',
      'metaDescription',
      'sku',
    ] as const;

    const hasContentChange = REVIEW_TRIGGER_FIELDS.some(
      (field) => (dto as Record<string, unknown>)[field] !== undefined,
    );
    const triggerReapproval =
      hasContentChange &&
      product.status === ProductStatus.ACTIVE &&
      // Don't bounce back into review if seller is also explicitly
      // putting the listing on hold (their own pause action).
      dto.status !== ProductStatus.ON_HOLD;

    const data: any = { ...dto };
    if (triggerReapproval) {
      data.status = ProductStatus.PENDING;
      data.isActive = false;
      data.rejectionReason = null;
    }
    if (dto.brand !== undefined && !dto.brand.trim()) {
      throw new BadRequestException('Brand cannot be empty');
    }
    if (dto.hsnCode !== undefined && !dto.hsnCode.trim()) {
      throw new BadRequestException('HSN code cannot be empty');
    }
    if (dto.brandAuthorizationCertificate !== undefined) {
      const certUrl = dto.brandAuthorizationCertificate.trim();
      if (!certUrl) {
        throw new BadRequestException('Brand authorization certificate cannot be empty');
      }
      const existingAdditional =
        product.additionalDetails && typeof product.additionalDetails === 'object' && !Array.isArray(product.additionalDetails)
          ? { ...(product.additionalDetails as Record<string, unknown>) }
          : {};
      const incomingAdditional =
        dto.additionalDetails && typeof dto.additionalDetails === 'object' && !Array.isArray(dto.additionalDetails)
          ? { ...(dto.additionalDetails as Record<string, unknown>) }
          : {};
      data.additionalDetails = {
        ...existingAdditional,
        ...incomingAdditional,
        'Brand Authorization Certificate': certUrl,
      };
    }
    delete data.isCancellable;
    delete data.isReturnable;
    delete data.isReplaceable;
    delete data.returnWindow;
    delete data.cancellationWindow;
    delete data.brandAuthorizationCertificate;

    const returnPolicy = await this.adminService.getMarketplaceReturnPolicy();
    Object.assign(data, returnPolicy);

    if (dto.name) data.slug = this.slugify(dto.name) + '-' + Date.now().toString(36);

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data,
      include: { category: { select: { name: true } } },
    });

    if (triggerReapproval) {
      this.logger.log(
        `Product ${productId} returned to PENDING review after seller edit (sellerId=${seller.id}).`,
      );
      // Same fan-out as createProduct — admins should see edits to live
      // listings in the bell exactly the same way as brand-new ones.
      this.notificationService
        .notifyAllAdmins({
          type: 'ADMIN_PRODUCT_SUBMITTED',
          title: 'Product edited — re-review required',
          body: `${seller.storeName} edited "${updated.name}" and it has been pulled back into the review queue.`,
          data: {
            productId: updated.id,
            productName: updated.name,
            slug: updated.slug,
            sku: updated.sku,
            sellerId: seller.id,
            storeName: seller.storeName,
            reapproval: true,
          },
        })
        .catch(() => {});
    }

    return updated;
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
            include: { product: { select: { name: true, images: true, weight: true, dimensions: true } } },
          },
          shippingAddress: true,
          shipment: true,
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
      include: { items: true, user: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const hasSellerProducts = order.items.some((item) => productIds.includes(item.productId));
    if (!hasSellerProducts) throw new ForbiddenException('Order has none of your products');

    // Handle order cancellation by seller
    if (status === 'CANCELLED') {
      const cancellableStatuses = ['PENDING', 'PROCESSING', 'CONFIRMED'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new BadRequestException(
          `Order cannot be cancelled — it is already ${order.status.toLowerCase()}. ` +
          `Only orders in Pending, Processing, or Confirmed status can be cancelled.`,
        );
      }

      // Restore stock for seller's products only
      for (const item of order.items) {
        if (!productIds.includes(item.productId)) continue;
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Process refund - seller cancellations MUST refund to original payment source
      let refundResult: { success: boolean; message: string; refundId?: string } | null = null;
      if (order.paymentStatus === 'PAID') {
        const refundAmount = Number(order.total) || 0;
        if (refundAmount > 0) {
          const canRefundToSource = this.paymentService.canRefundToSource(order);
          
          try {
            if (canRefundToSource) {
              // Refund to original payment source via Razorpay
              refundResult = await this.paymentService.refundToSource(
                order.id,
                refundAmount,
                'Order cancelled by seller',
              );
              this.logger.log(`Seller cancelled order ${order.orderNumber}, source refund of ₹${refundAmount} initiated`);
            } else {
              // COD or no payment ID - refund to wallet
              const walletResult = await this.walletService.refundToWallet(
                order.userId,
                refundAmount,
                order.orderNumber,
                'Order cancelled by seller',
              );
              refundResult = { success: walletResult.success, message: walletResult.message };
              this.logger.log(`Seller cancelled order ${order.orderNumber}, wallet refund of ₹${refundAmount} processed`);
            }
          } catch (err: any) {
            this.logger.error(`Failed to process source refund for order ${order.orderNumber}: ${err.message}`);
            // Fallback to wallet refund
            try {
              const walletResult = await this.walletService.refundToWallet(
                order.userId,
                refundAmount,
                order.orderNumber,
                'Order cancelled by seller (source refund failed)',
              );
              refundResult = { success: walletResult.success, message: `Source refund failed. ${walletResult.message}` };
            } catch (walletErr: any) {
              this.logger.error(`Wallet fallback also failed: ${walletErr.message}`);
            }
          }
        }
      }

      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'CANCELLED',
          paymentStatus: refundResult?.success ? 'REFUNDED' : order.paymentStatus,
        },
        include: { items: true, user: { select: { name: true, email: true, phone: true } }, shippingAddress: true, shipment: true },
      });

      // Notify customer
      this.notificationService.notifyOrderCancelled(order.userId, order.orderNumber, Number(order.total) || 0).catch((err) =>
        this.logger.warn(`Failed to send order-cancelled notification: ${err.message}`),
      );

      return { 
        ...updated, 
        refundProcessed: refundResult?.success ?? false,
        refundMessage: refundResult?.message,
        refundId: refundResult?.refundId,
      };
    }

    // Payment-gated transitions (testing observation #5):
    // sellers must NOT be able to manually flip a PENDING/PROCESSING order to
    // CONFIRMED unless the customer has actually paid. CONFIRMED is reserved
    // for the system to set automatically once payment lands (see
    // payment.service.ts -> finalizeOnlineOrderAfterPayment, and the
    // wallet/COD branches in orders.service.ts which already create the
    // order in the right state).
    if (status === 'CONFIRMED' && order.paymentStatus !== 'PAID') {
      throw new BadRequestException(
        'Order cannot be confirmed yet — payment is still pending. ' +
        'It will move to Confirmed automatically once the customer\'s payment is received.',
      );
    }

    // Same gate for SHIPPED — only ship orders that have been paid for
    // (otherwise sellers can ship before money is in).
    if (status === 'SHIPPED' && order.paymentStatus !== 'PAID') {
      throw new BadRequestException(
        'You can only ship an order after the customer\'s payment has been received.',
      );
    }

    // Regular status update
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
      include: { items: true, user: { select: { name: true, email: true, phone: true } }, shippingAddress: true, shipment: true },
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
      include: {
        order: { select: { createdAt: true, status: true } },
        // Per-product commission is the source of truth (set at admin
        // approval). Falls back to the seller's stored rate for legacy
        // products, then to 10% so commission can never silently vanish.
        product: { select: { commissionRate: true } },
      },
    });

    const totalRevenue = orderItems.reduce((s, oi) => s + oi.price * oi.quantity, 0);
    const totalOrders = new Set(orderItems.map((oi) => oi.orderId)).size;
    const totalUnits = orderItems.reduce((s, oi) => s + oi.quantity, 0);

    const commission = orderItems.reduce((s, oi) => {
      const rate = oi.product?.commissionRate ?? seller.commissionRate ?? 10;
      return s + oi.price * oi.quantity * (rate / 100);
    }, 0);

    const dailyMap = new Map<string, number>();
    orderItems.forEach((oi) => {
      const day = oi.order.createdAt.toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + oi.price * oi.quantity);
    });
    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const netRevenue = totalRevenue - commission;
    // Commission % varies per product, so this is the gross-weighted
    // effective rate across the requested window; old clients that show
    // a single "commission rate" still get a sensible number.
    const effectiveCommissionRate =
      totalRevenue > 0 ? Number(((commission / totalRevenue) * 100).toFixed(2)) : 0;

    return {
      totalRevenue,
      netRevenue,
      commission,
      commissionRate: effectiveCommissionRate,
      totalOrders,
      totalUnits,
      dailyRevenue,
    };
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

    // Normalise pickup phone — strip spaces / dashes so the carrier
    // payload always contains digits-only (Delhivery in particular
    // rejects formatted strings).
    const data: Record<string, unknown> = { ...dto };
    if (dto.phone !== undefined) {
      const normalised = dto.phone.replace(/[^\d+]/g, '').trim();
      data.phone = normalised || null;

      // If the parent User has no phone yet (common for Google
      // sign-up sellers), copy the pickup phone there too so the
      // rest of the platform — OTP fallbacks, invoices, support
      // tooling — can rely on a single source of truth.
      if (normalised) {
        try {
          await this.prisma.user.updateMany({
            where: { id: userId, OR: [{ phone: null }, { phone: '' }] },
            data: { phone: normalised },
          });
        } catch (err) {
          // Uniqueness conflict (someone else already owns this number)
          // is not fatal here — the seller's pickup phone is still saved.
          // eslint-disable-next-line no-console
          console.warn('[seller-dashboard] failed to backfill User.phone:', err);
        }
      }
    }

    return this.prisma.sellerProfile.update({
      where: { id: seller.id },
      data,
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
  }

  // ─── Bulk Upload ───

  private parseJsonField(val: string | undefined): any {
    if (!val) return null;
    try { return JSON.parse(val); } catch { return null; }
  }

  /** CSV `price` / `compareAtPrice` are GST-inclusive; aligns with seller inventory form. */
  private gstPercentForBulkRow(gstField: string | undefined): number {
    if (!gstField?.trim()) return DEFAULT_GST_PERCENT;
    const n = parseFloat(gstField);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_GST_PERCENT;
  }

  async bulkUploadProducts(userId: string, rows: Record<string, string>[]) {
    const seller = await this.getSellerProfile(userId);
    const returnPolicy = await this.adminService.getMarketplaceReturnPolicy();
    const results: { row: number; status: 'ok' | 'error'; message?: string; productId?: string; sku?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.name || !r.price || !r.categoryId) {
          results.push({ row: i + 1, status: 'error', message: 'name, price, categoryId are required' });
          continue;
        }

        const priceIncl = parseFloat(r.price);
        if (isNaN(priceIncl) || priceIncl < 0) {
          results.push({ row: i + 1, status: 'error', message: 'Invalid price' });
          continue;
        }

        const gstSave = this.gstPercentForBulkRow(r.gstRate);
        const price = priceExclusiveFromInclusive(priceIncl, gstSave);

        let compareAtPrice: number | null = null;
        if (r.compareAtPrice != null && String(r.compareAtPrice).trim() !== '') {
          const compareIncl = parseFloat(String(r.compareAtPrice));
          if (isNaN(compareIncl) || compareIncl < 0) {
            results.push({ row: i + 1, status: 'error', message: 'Invalid compareAtPrice' });
            continue;
          }
          compareAtPrice = priceExclusiveFromInclusive(compareIncl, gstSave);
        }

        const baseSlug = this.slugify(r.name);
        const slugCount = await this.prisma.product.count({ where: { slug: { startsWith: baseSlug } } });
        const slug = slugCount > 0 ? `${baseSlug}-${slugCount + 1}` : baseSlug;

        // Always auto-generate SKU for bulk uploads
        const sku = await this.generateSku(seller.id, r.categoryId);

        const product = await this.prisma.product.create({
          data: {
            name: r.name,
            slug,
            shortDescription: r.shortDescription || null,
            description: r.description || null,
            price,
            compareAtPrice,
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

            // Shipping details
            weight: r.weight ? parseFloat(r.weight) : null,
            dimensions: r.dimensions || null,

            // Return/cancel policy — marketplace admin only (CSV columns ignored)
            ...returnPolicy,

            // Amazon-style product information
            featuresAndSpecs: this.parseJsonField(r.featuresAndSpecs),
            materialsAndCare: this.parseJsonField(r.materialsAndCare),
            itemDetails: this.parseJsonField(r.itemDetails),
            additionalDetails: this.parseJsonField(r.additionalDetails),
            productDescription: r.productDescription || null,
            safetyInfo: r.safetyInfo || null,
            regulatoryInfo: r.regulatoryInfo || null,
            warrantyInfo: r.warrantyInfo || null,

            status: 'PENDING',
          },
        });
        results.push({ row: i + 1, status: 'ok', productId: product.id, sku });
      } catch (err: any) {
        results.push({ row: i + 1, status: 'error', message: err.message?.slice(0, 200) });
      }
    }

    const successCount = results.filter((r) => r.status === 'ok').length;

    // One consolidated bell notification for the whole batch — emitting one
    // per row would spam admins for large CSV uploads.
    if (successCount > 0) {
      this.notificationService
        .notifyAllAdmins({
          type: 'ADMIN_PRODUCT_SUBMITTED',
          title: 'New products submitted for review',
          body: `${seller.storeName} submitted ${successCount} product${successCount === 1 ? '' : 's'} via bulk upload.`,
          data: {
            sellerId: seller.id,
            storeName: seller.storeName,
            count: successCount,
            bulk: true,
          },
        })
        .catch(() => {});
    }

    return {
      total: rows.length,
      success: successCount,
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
      this.emailService.getSellerFromAddress(),
    );

    return { sent: true, count: lowStockProducts.length };
  }

  // ─── Brand Proposal ───

  async proposeBrand(userId: string, name: string, logo?: string, authorizationCertificate?: string) {
    const seller = await this.getSellerProfile(userId);
    const slug = this.slugify(name);

    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('A brand with this name already exists');

    // ── Brand cap ──
    // A seller can propose / hold one brand without uploading a brand
    // authorisation certificate. Any subsequent brand MUST come with a
    // certificate so admin can verify the seller is authorised to sell
    // products under that brand. This protects the marketplace from a
    // single seller hoarding popular brand names.
    const sellerBrandCount = await this.prisma.brand.count({ where: { proposedBy: seller.id } });
    const cert = (authorizationCertificate ?? '').trim();
    if (sellerBrandCount > 0 && !cert) {
      throw new BadRequestException(
        'You already have one brand on file. To add another brand, please upload an authorisation certificate that proves you are allowed to sell under that brand.',
      );
    }

    return this.prisma.brand.create({
      data: {
        name,
        slug,
        logo: logo || null,
        authorizationCertificate: cert || null,
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
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
            paymentMethod: true,
            total: true,
            returnRequests: { select: { status: true } },
          },
        },
        // Per-product commission is the source of truth — set by admin
        // when the product is approved. The seller's stored
        // `commissionRate` is only a legacy fallback for products
        // approved before per-product commissions existed.
        product: { select: { name: true, sku: true, commissionRate: true } },
      },
      orderBy: { order: { createdAt: 'desc' } },
    });

    const rows = orderItems.map((oi) => {
      const gross = oi.price * oi.quantity;
      // Per testing observation #24: if any return on this order has reached
      // REFUNDED, the platform waives its commission for that order. We zero
      // out commission (and net reflects the full refund — gross is returned
      // to the customer) and surface the "REFUNDED" status so the seller can
      // see why the commission line is zero.
      const refunded = (oi.order.returnRequests || []).some((r) => r.status === 'REFUNDED');
      const lineRate = oi.product?.commissionRate ?? seller.commissionRate ?? 10;
      const commission = refunded ? 0 : gross * (lineRate / 100);
      const net = refunded ? 0 : gross - commission;
      return {
        orderNumber: oi.order.orderNumber,
        date: oi.order.createdAt.toISOString().split('T')[0],
        productName: oi.product?.name || oi.productName,
        sku: oi.product?.sku || '',
        quantity: oi.quantity,
        unitPrice: oi.price,
        gross: refunded ? 0 : gross,
        commissionPercent: refunded ? 0 : Number(lineRate.toFixed(2)),
        commission,
        net,
        orderStatus: refunded ? 'REFUNDED' : oi.order.status,
        paymentMethod: oi.order.paymentMethod || '',
        commissionWaived: refunded,
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

    // Commission varies per product, so the report-level rate is the
    // gross-weighted effective rate across the requested window.
    const effectiveCommissionRate =
      totals.gross > 0 ? Number(((totals.commission / totals.gross) * 100).toFixed(2)) : 0;

    return { rows, totals, commissionRate: effectiveCommissionRate };
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

  // ─── Seller Coupons ───

  async getSellerCoupons(userId: string) {
    const seller = await this.getSellerProfile(userId);
    return this.prisma.coupon.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSellerCoupon(userId: string, dto: CreateSellerCouponDto) {
    const seller = await this.getSellerProfile(userId);
    const code = dto.code.toUpperCase().replace(/\s+/g, '');

    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new BadRequestException(`Coupon code "${code}" already exists`);

    const scope = dto.scope === 'cart' ? 'global' : 'seller';

    return this.prisma.coupon.create({
      data: {
        code,
        description: dto.description,
        discountType: dto.discountType as any,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount || 0,
        maxDiscount: dto.maxDiscount,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        usageLimit: dto.usageLimit,
        scope,
        sellerId: seller.id,
      },
    });
  }

  async updateSellerCoupon(userId: string, couponId: string, dto: UpdateSellerCouponDto) {
    const seller = await this.getSellerProfile(userId);
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon.sellerId !== seller.id) throw new ForbiddenException('Not your coupon');

    const data: any = { ...dto };
    if (dto.code) data.code = dto.code.toUpperCase().replace(/\s+/g, '');
    if (dto.validUntil) data.validUntil = new Date(dto.validUntil);
    if (dto.scope === 'cart') { data.scope = 'global'; }
    else if (dto.scope === 'seller') { data.scope = 'seller'; }

    return this.prisma.coupon.update({ where: { id: couponId }, data });
  }

  async deleteSellerCoupon(userId: string, couponId: string) {
    const seller = await this.getSellerProfile(userId);
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon.sellerId !== seller.id) throw new ForbiddenException('Not your coupon');

    await this.prisma.coupon.delete({ where: { id: couponId } });
    return { deleted: true };
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
