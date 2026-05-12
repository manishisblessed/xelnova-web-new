import { Injectable, NotFoundException, BadRequestException, ConflictException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role, ProductReturnPolicyPreset, WarrantyDurationUnit } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { LoggingService } from '../logging/logging.service';
import { NotificationService } from '../notifications/notification.service';
import { PermissionsService } from './permissions.service';
import {
  AdminProductQueryDto, AdminUpdateProductDto,
  AdminOrderQueryDto, AdminUpdateOrderDto,
  AdminSellerQueryDto, AdminUpdateSellerDto,
  AdminCustomerQueryDto, AdminUpdateCustomerDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateBrandDto, UpdateBrandDto,
  CreateBannerDto, UpdateBannerDto,
  CreateCouponDto, UpdateCouponDto,
  CreateCommissionDto, UpdateCommissionDto,
  AdminPayoutQueryDto, UpdatePayoutDto,
  CreateRoleDto, UpdateRoleDto,
  CreateSubAdminDto, UpdateSubAdminDto,
  CreatePageDto, UpdatePageDto,
  AdminSiteSettingsDto,
  AdminAuditContext,
  AdminUpdateShipmentDto,
} from './dto/admin.dto';
import {
  DEFAULT_PRODUCT_ATTRIBUTE_PRESETS,
  type ProductAttributePresetSection,
} from './default-product-attribute-presets';
import { ShippingService } from '../shipping/shipping.service';
import { EmailService } from '../email/email.service';
import { DEFAULT_PLATFORM_LOGISTICS } from '../../common/platform-logistics';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logging: LoggingService,
    private readonly notifications: NotificationService,
    private readonly shipping: ShippingService,
    private readonly permissions: PermissionsService,
    private readonly emailService: EmailService,
  ) {}

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  /** Creates a SellerProfile for SELLER users who have none (e.g. Google sign-in before profile sync). */
  private async ensureSellerProfileRow(userId: string, name: string, email?: string | null, phone?: string): Promise<void> {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (existing) return;

    if (email) {
      const orphaned = await this.prisma.sellerProfile.findUnique({ where: { email } });
      if (orphaned) {
        await this.prisma.sellerProfile.update({ where: { id: orphaned.id }, data: { userId } });
        return;
      }
    }

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 40);
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug || 'seller'}-${uniqueSuffix}`;

    await this.prisma.sellerProfile.create({
      data: {
        userId,
        email: email ?? null,
        phone,
        storeName: `${name || 'My'}'s Store`,
        slug,
        onboardingStatus: 'EMAIL_VERIFIED',
        onboardingStep: 2,
        selectedCategories: [],
        featuredProductIds: [],
      },
    });
  }

  private async backfillSellerProfilesForOrphanSellerUsers(): Promise<void> {
    const orphans = await this.prisma.user.findMany({
      where: { role: Role.SELLER, sellerProfile: null },
      select: { id: true, name: true, email: true, phone: true },
    });
    for (const u of orphans) {
      await this.ensureSellerProfileRow(u.id, u.name, u.email, u.phone ?? undefined);
    }
  }

  // ─── Dashboard ───

  async getDashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalProducts, totalOrders, totalCustomers, totalSellers,
      monthOrders, lastMonthOrders, pendingOrders,
      totalRevenue, monthRevenue, activeSellers, pendingProducts, pendingReviews,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.sellerProfile.count(),
      this.prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.order.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: monthStart }, status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
      this.prisma.sellerProfile.count({ where: { verified: true } }),
      this.prisma.product.count({
        where: { status: { in: ['PENDING', 'PENDING_BRAND_AUTHORIZATION'] } },
      }),
      this.prisma.review.count({ where: { moderationStatus: 'PENDING' } }),
    ]);

    const recentOrders = await this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, items: { take: 3 } },
    });

    const recentActivity = await this.prisma.activityLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalProducts, totalOrders, totalCustomers, totalSellers,
      monthOrders, lastMonthOrders, pendingOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      monthRevenue: monthRevenue._sum.total || 0,
      activeSellers, pendingProducts, pendingReviews,
      recentOrders, recentActivity,
    };
  }

  // ─── Products ───

  async getProducts(query: AdminProductQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { xelnovaProductId: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status as any;
    if (query.category) where.categoryId = query.category;
    if (query.seller) where.sellerId = query.seller;

    const orderBy: any = {};
    if (query.sortBy) orderBy[query.sortBy] = query.sortOrder === 'asc' ? 'asc' : 'desc';
    else orderBy.createdAt = 'desc';

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy,
        include: {
          category: { select: { name: true } },
          seller: { select: { storeName: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** Full product row for admin review (approval UI, duplicates, etc.). */
  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        seller: { select: { id: true, storeName: true, email: true, phone: true } },
      },
    });
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    // Enrich with the matching Brand record (looked up by name) so admins can
    // see the brand-authorisation certificate while reviewing a product. The
    // Product model only stores the brand as a free-text field, so we resolve
    // it lazily here instead of via a Prisma relation.
    // Order by approved DESC to prioritize approved brands if duplicates exist.
    let brandRecord: any = null;
    if (product.brand?.trim()) {
      const found = await this.prisma.brand.findFirst({
        where: { name: { equals: product.brand.trim(), mode: 'insensitive' } },
        orderBy: { approved: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          approved: true,
          isActive: true,
          authorizationCertificate: true,
          proposedBy: true,
        },
      });
      if (found) {
        let proposer: any = null;
        if (found.proposedBy) {
          proposer = await this.prisma.sellerProfile.findUnique({
            where: { id: found.proposedBy },
            select: { id: true, storeName: true, user: { select: { email: true } } },
          });
        }
        brandRecord = { ...found, proposer };
      }
    }

    return { ...product, brandRecord };
  }

  async updateProduct(id: string, dto: AdminUpdateProductDto) {
    const data: any = {};

    // Fetch the product to get seller info for notifications
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        brand: true, 
        status: true,
        rejectionReason: true,
        imageRejectionReason: true,
        isReplaceable: true,
        replacementWindow: true,
        seller: { select: { userId: true, storeName: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.status) {
      data.status = dto.status;

      // When approving: validate brand approval, set isActive to true and clear rejection reason
      if (dto.status === 'ACTIVE') {
        // If product has a brand, check if it's approved (case-insensitive lookup, prioritize approved)
        if (product.brand?.trim()) {
          const brandRecord = await this.prisma.brand.findFirst({
            where: { name: { equals: product.brand.trim(), mode: 'insensitive' } },
            orderBy: { approved: 'desc' },
            select: { approved: true, name: true },
          });

          if (brandRecord && !brandRecord.approved) {
            throw new BadRequestException(
              `Cannot approve product: Brand "${brandRecord.name}" is pending approval. Please approve the brand first.`,
            );
          }
        }

        data.isActive = true;
        data.rejectionReason = null;
        data.imageRejectionReason = null;

        // Notify seller of product approval
        if (product.seller?.userId) {
          this.notifications.notifyProductApproved(
            product.seller.userId,
            product.name,
          ).catch((err) => this.logger.warn(`Product approval notification failed: ${err.message}`));
        }
      }

      // When rejecting: set isActive to false and require rejection reason
      if (dto.status === 'REJECTED') {
        const reason = (dto.rejectionReason ?? '').trim();
        if (!reason) {
          throw new BadRequestException(
            'A rejection reason is required when rejecting a product so the seller knows what to fix.',
          );
        }
        data.isActive = false;
        data.rejectionReason = reason;

        // Notify seller of product rejection
        if (product.seller?.userId) {
          this.notifications.notifyProductRejected(
            product.seller.userId,
            product.name,
            reason,
          ).catch((err) => this.logger.warn(`Product rejection notification failed: ${err.message}`));
        }
      }
    }

    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.isTrending !== undefined) data.isTrending = dto.isTrending;
    if (dto.isFlashDeal !== undefined) data.isFlashDeal = dto.isFlashDeal;
    if (dto.flashDealEndsAt) data.flashDealEndsAt = new Date(dto.flashDealEndsAt);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.rejectionReason !== undefined && dto.status !== 'ACTIVE' && dto.status !== 'REJECTED') {
      data.rejectionReason = dto.rejectionReason || null;
    }
    if (dto.imageRejectionReason !== undefined) {
      const trimmed = dto.imageRejectionReason?.trim() ?? '';
      const oldImageReason = product.imageRejectionReason;
      data.imageRejectionReason = trimmed === '' ? null : trimmed;

      // Notify seller if image rejection reason is being set (not just cleared)
      if (trimmed && trimmed !== oldImageReason && product.seller?.userId) {
        this.notifications.notifyProductImageFeedback(
          product.seller.userId,
          product.name,
          trimmed,
        ).catch((err) => this.logger.warn(`Image feedback notification failed: ${err.message}`));
      }
    }
    if (dto.commissionRate !== undefined && dto.commissionRate !== null) {
      const rate = Number(dto.commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        throw new BadRequestException('commissionRate must be between 0 and 100');
      }
      data.commissionRate = rate;
    }
    if (dto.bestSellersRank !== undefined) {
      // null / 0 / "" all clear the rank — anything else must be a positive int.
      if (dto.bestSellersRank === null || (dto.bestSellersRank as unknown) === '' || dto.bestSellersRank === 0) {
        data.bestSellersRank = null;
      } else {
        const rank = Math.floor(Number(dto.bestSellersRank));
        if (!Number.isFinite(rank) || rank < 1 || rank > 100000) {
          throw new BadRequestException('bestSellersRank must be a positive integer (1–100000)');
        }
        data.bestSellersRank = rank;
      }
    }

    // Admin-controlled replacement policy. The seller's "Can be replaced"
    // choice (if any) is ignored — only the admin toggles `isReplaceable`
    // and picks the window at approval time, so it's a deliberate merchandising
    // decision rather than a seller claim.
    if (dto.isReplaceable !== undefined) {
      data.isReplaceable = !!dto.isReplaceable;
      // When disabling replacement, clear the stored window so the buyer UI
      // doesn't keep showing a stale "7 days replacement" label.
      if (!dto.isReplaceable) {
        data.replacementWindow = null;
      }
    }
    if (dto.replacementWindow !== undefined) {
      if (dto.replacementWindow === null || (dto.replacementWindow as unknown) === '') {
        data.replacementWindow = null;
      } else {
        const win = Math.floor(Number(dto.replacementWindow));
        // We currently offer 2 / 5 / 7-day replacement windows. Reject anything
        // else so we don't end up with exotic values from bad payloads that the
        // buyer-facing UI can't explain.
        if (![2, 5, 7].includes(win)) {
          throw new BadRequestException('replacementWindow must be one of 2, 5, or 7 days');
        }
        data.replacementWindow = win;
      }
    }
    // If admin enabled replacement but didn't pass a window, and the product
    // doesn't already have one on file, surface a clear error rather than
    // silently publishing with no window.
    if (dto.isReplaceable === true && dto.replacementWindow === undefined) {
      // We still allow this when the product already has a stored window —
      // e.g. the admin is only toggling the flag back on. Look at the row
      // we fetched at the top of this method.
      const existingWindow = (product as unknown as { replacementWindow?: number | null } | null)
        ?.replacementWindow;
      if (existingWindow == null) {
        throw new BadRequestException(
          'Pick a replacement window (2, 5, or 7 days) when enabling replacement.',
        );
      }
    }

    // Return policy preset + optional structured warranty (approval-time merchandising).
    if (dto.returnPolicyPreset) {
      const preset = dto.returnPolicyPreset as ProductReturnPolicyPreset;
      data.returnPolicyPreset = preset;

      const resolvedReplacement =
        dto.replacementWindow !== undefined &&
        dto.replacementWindow !== null &&
        (dto.replacementWindow as unknown) !== ''
          ? Math.floor(Number(dto.replacementWindow))
          : product.replacementWindow;

      switch (preset) {
        case 'NON_RETURNABLE':
          data.isReturnable = false;
          data.isReplaceable = false;
          data.replacementWindow = null;
          break;
        case 'EASY_RETURN_3_DAYS':
          data.isReturnable = true;
          data.returnWindow = 3;
          data.isReplaceable = false;
          data.replacementWindow = null;
          break;
        case 'EASY_RETURN_7_DAYS':
          data.isReturnable = true;
          data.returnWindow = 7;
          data.isReplaceable = false;
          data.replacementWindow = null;
          break;
        case 'REPLACEMENT_ONLY':
          data.isReturnable = false;
          data.isReplaceable = true;
          if (resolvedReplacement == null || ![2, 5, 7].includes(resolvedReplacement)) {
            throw new BadRequestException(
              'Pick a replacement window (2, 5, or 7 days) for replacement-only policy.',
            );
          }
          data.replacementWindow = resolvedReplacement;
          break;
        case 'RETURN_PLUS_REPLACEMENT': {
          data.isReturnable = true;
          const rd =
            dto.returnWindowDays != null && (dto.returnWindowDays as unknown) !== ''
              ? Math.floor(Number(dto.returnWindowDays))
              : 7;
          if (!Number.isFinite(rd) || rd < 1 || rd > 365) {
            throw new BadRequestException('returnWindowDays must be between 1 and 365');
          }
          data.returnWindow = rd;
          data.isReplaceable = true;
          if (resolvedReplacement == null || ![2, 5, 7].includes(resolvedReplacement)) {
            throw new BadRequestException(
              'Pick a replacement window (2, 5, or 7 days) for return + replacement.',
            );
          }
          data.replacementWindow = resolvedReplacement;
          break;
        }
        default:
          break;
      }
    }

    if (dto.warrantyDurationValue !== undefined || dto.warrantyDurationUnit !== undefined) {
      const v = dto.warrantyDurationValue;
      const u = dto.warrantyDurationUnit;
      if (v == null || (v as unknown) === '' || !u) {
        data.warrantyDurationValue = null;
        data.warrantyDurationUnit = null;
      } else {
        const num = Math.floor(Number(v));
        if (!Number.isFinite(num) || num < 1) {
          throw new BadRequestException('warrantyDurationValue must be a positive integer');
        }
        data.warrantyDurationValue = num;
        data.warrantyDurationUnit = u as WarrantyDurationUnit;
        data.warrantyInfo = AdminService.formatBrandWarranty(num, data.warrantyDurationUnit as WarrantyDurationUnit);
      }
    }

    const updatedProduct = await this.prisma.product.update({ 
      where: { id }, 
      data,
      include: {
        category: { select: { name: true } },
        seller: { select: { storeName: true, email: true, userId: true, user: { select: { email: true } } } },
      },
    });

    if (updatedProduct.seller?.userId && dto.status) {
      if (dto.status === 'ACTIVE') {
        this.notifications.notifyProductApproved(updatedProduct.seller.userId, updatedProduct.name).catch((err) =>
          this.logger.error(`Failed to notify product approval: ${err.message}`),
        );
      } else if (dto.status === 'REJECTED') {
        this.notifications.notifyProductRejected(updatedProduct.seller.userId, updatedProduct.name, dto.rejectionReason).catch((err) =>
          this.logger.error(`Failed to notify product rejection: ${err.message}`),
        );
      }
    }

    return updatedProduct;
  }

  async deleteProduct(id: string) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    // If product has been ordered, soft delete by deactivating instead of hard delete
    if (product._count.orderItems > 0) {
      await this.prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          name: `[DELETED] ${product.name}`,
        },
      });
      return { deleted: true, softDeleted: true, message: 'Product has order history and was deactivated instead of deleted' };
    }

    // No orders - safe to hard delete
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Approve pending changes submitted by seller on an ACTIVE product.
   * Applies the stored changes and clears the pending flag.
   */
  async approvePendingChanges(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        hasPendingChanges: true,
        pendingChangesData: true,
        additionalDetails: true,
        seller: { select: { userId: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.hasPendingChanges || !product.pendingChangesData) {
      throw new BadRequestException('No pending changes to approve');
    }

    const rawChanges = { ...(product.pendingChangesData as Record<string, unknown>) };

    /**
     * Map "virtual" fields the seller can submit (which the Prisma Product
     * model does not have a column for) onto the columns that actually back
     * them. Without this Prisma throws an "Unknown argument" / 500 error
     * when applying the pending changes, leaving the listing stuck in the
     * approval queue forever.
     *
     * Currently the only such field is `brandAuthorizationCertificate`,
     * which lives inside the `additionalDetails` JSON blob keyed as
     * "Brand Authorization Certificate".
     */
    const whitelisted = new Set<string>([
      'name',
      'shortDescription',
      'description',
      'productDescription',
      'price',
      'compareAtPrice',
      'images',
      'video',
      'videoPublicId',
      'variants',
      'categoryId',
      'brand',
      'highlights',
      'tags',
      'featuresAndSpecs',
      'materialsAndCare',
      'itemDetails',
      'additionalDetails',
      'safetyInfo',
      'regulatoryInfo',
      'warrantyInfo',
      'specifications',
      'productLengthCm',
      'productWidthCm',
      'productHeightCm',
      'productWeightKg',
      'packageLengthCm',
      'packageWidthCm',
      'packageHeightCm',
      'packageWeightKg',
      'weight',
      'dimensions',
      'hsnCode',
      'gstRate',
      'metaTitle',
      'metaDescription',
      'sku',
      'brandAuthAdditionalDocumentUrls',
    ]);

    const data: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(rawChanges, 'brandAuthorizationCertificate')) {
      const certUrl = String(rawChanges.brandAuthorizationCertificate ?? '').trim();
      delete rawChanges.brandAuthorizationCertificate;
      if (certUrl) {
        const baseAdditional =
          rawChanges.additionalDetails &&
          typeof rawChanges.additionalDetails === 'object' &&
          !Array.isArray(rawChanges.additionalDetails)
            ? { ...(rawChanges.additionalDetails as Record<string, unknown>) }
            : product.additionalDetails &&
                typeof product.additionalDetails === 'object' &&
                !Array.isArray(product.additionalDetails)
              ? { ...(product.additionalDetails as Record<string, unknown>) }
              : {};
        baseAdditional['Brand Authorization Certificate'] = certUrl;
        data.additionalDetails = baseAdditional;
        delete rawChanges.additionalDetails;
      }
    }

    for (const [key, value] of Object.entries(rawChanges)) {
      if (whitelisted.has(key)) {
        data[key] = value;
      } else {
        this.logger.warn(
          `approvePendingChanges: dropping non-Product field "${key}" from pending changes for product ${id}`,
        );
      }
    }

    // Apply the pending changes
    await this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        hasPendingChanges: false,
        pendingChangesData: Prisma.DbNull,
        pendingChangesSubmittedAt: null,
      },
    });

    // Notify seller
    if (product.seller?.userId) {
      this.notifications.notifyProductChangesApproved(
        product.seller.userId,
        product.name,
      ).catch((err) => this.logger.warn(`Product changes approval notification failed: ${err.message}`));
    }

    await this.logActivity('admin', 'product_changes_approved', `Approved pending changes for product ${product.name}`, undefined, {
      productId: id,
      changes: Object.keys(data),
    });

    return { approved: true, message: 'Pending changes have been approved and applied' };
  }

  /**
   * Reject pending changes submitted by seller.
   * Clears the pending changes without applying them.
   */
  async rejectPendingChanges(id: string, reason?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        hasPendingChanges: true,
        pendingChangesData: true,
        seller: { select: { userId: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.hasPendingChanges || !product.pendingChangesData) {
      throw new BadRequestException('No pending changes to reject');
    }

    // Clear pending changes
    await this.prisma.product.update({
      where: { id },
      data: {
        hasPendingChanges: false,
        pendingChangesData: Prisma.DbNull,
        pendingChangesSubmittedAt: null,
      },
    });

    // Notify seller
    if (product.seller?.userId) {
      this.notifications.notifyProductChangesRejected(
        product.seller.userId,
        product.name,
        reason,
      ).catch((err) => this.logger.warn(`Product changes rejection notification failed: ${err.message}`));
    }

    await this.logActivity('admin', 'product_changes_rejected', `Rejected pending changes for product ${product.name}`, undefined, {
      productId: id,
      reason,
    });

    return { rejected: true, message: 'Pending changes have been rejected' };
  }

  // ─── Orders ───

  async getOrders(query: AdminOrderQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.OrderWhereInput = {};

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.status) where.status = query.status as any;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          items: { include: { product: { select: { name: true, images: true } } } },
          shippingAddress: true,
          shipment: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateOrder(id: string, dto: AdminUpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true, userId: true, orderNumber: true, total: true, paymentStatus: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (dto.status) {
      const { isValidOrderTransition } = await import('../orders/orders.service');
      if (!isValidOrderTransition(order.status, dto.status)) {
        throw new BadRequestException(
          `Cannot change order status from ${order.status} to ${dto.status}`,
        );
      }
    }
    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.paymentStatus) data.paymentStatus = dto.paymentStatus;
    const updated = await this.prisma.order.update({ where: { id }, data, include: { items: true } });

    if (dto.status && dto.status !== order.status) {
      const uid = order.userId;
      const oNum = order.orderNumber;
      const total = Number(order.total) || 0;
      try {
        switch (dto.status) {
          case 'PROCESSING': this.notifications.notifyOrderProcessing(uid, oNum).catch(() => {}); break;
          case 'CONFIRMED': this.notifications.notifyOrderPacked(uid, oNum).catch(() => {}); break;
          case 'SHIPPED': this.notifications.notifyOrderShipped(uid, oNum).catch(() => {}); break;
          case 'DELIVERED': this.notifications.notifyOrderDelivered(uid, oNum).catch(() => {}); break;
          case 'CANCELLED': {
            const cancelParams =
              order.paymentStatus === 'PAID'
                ? { outcome: 'STATUS_UPDATE_UNCONFIRMED' as const, refundAmount: total }
                : { outcome: 'NO_PAYMENT' as const };
            this.notifications.notifyOrderCancelled(uid, oNum, cancelParams).catch(() => {});
            break;
          }
          case 'REFUNDED': this.notifications.notifyRefundProcessed(uid, oNum, total).catch(() => {}); break;
        }
      } catch (err) {
        this.logger.warn(`Failed to send order status notification: ${err}`);
      }
    }

    return updated;
  }

  async updateShipment(orderId: string, dto: AdminUpdateShipmentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { product: { select: { sellerId: true } } } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.shipment.findUnique({ where: { orderId } });

    const data: Record<string, unknown> = {};
    if (dto.awbNumber !== undefined) data.awbNumber = dto.awbNumber;
    if (dto.courierProvider !== undefined) data.courierProvider = dto.courierProvider;
    if (dto.trackingUrl !== undefined) data.trackingUrl = dto.trackingUrl;
    if (dto.shipmentStatus !== undefined) data.shipmentStatus = dto.shipmentStatus;

    if (existing) {
      return this.prisma.shipment.update({ where: { orderId }, data });
    }

    // Create shipment if none exists — derive sellerId from order items
    const sellerId = order.items?.[0]?.product?.sellerId;
    if (!sellerId) throw new BadRequestException('Cannot determine seller for this order');

    return this.prisma.shipment.create({
      data: {
        orderId,
        sellerId,
        shippingMode: 'SELF_SHIP',
        courierProvider: dto.courierProvider || null,
        awbNumber: dto.awbNumber || null,
        trackingUrl: dto.trackingUrl || null,
        shipmentStatus: (dto.shipmentStatus as any) || 'PENDING',
        statusHistory: [
          {
            status: dto.shipmentStatus || 'PENDING',
            timestamp: new Date().toISOString(),
            remark: 'Shipment created by admin',
          },
        ],
      },
    });
  }

  // ─── Sellers ───

  async getSellers(query: AdminSellerQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.SellerProfileWhereInput = {};

    if (query.search) {
      where.OR = [
        { storeName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.verified === 'true') where.verified = true;
    if (query.verified === 'false') where.verified = false;

    const [items, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, phone: true, isBanned: true, banReason: true } },
          _count: { select: { products: true } },
        },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateSeller(id: string, dto: AdminUpdateSellerDto, audit?: AdminAuditContext) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!profile) throw new NotFoundException('Seller not found');

    const data: any = {};
    if (dto.verified !== undefined) data.verified = dto.verified;
    // Commission is set per-product on approval — admins no longer touch
    // a seller-level rate. Legacy `SellerProfile.commissionRate` is kept
    // in the schema only as a silent fallback for products approved
    // before the per-product model existed.
    if (Object.keys(data).length) {
      await this.prisma.sellerProfile.update({ where: { id }, data });
    }

    if (profile.userId && (dto.isBanned !== undefined || dto.banReason !== undefined)) {
      const userData: any = {};
      if (dto.isBanned !== undefined) userData.isBanned = dto.isBanned;
      if (dto.banReason !== undefined) userData.banReason = dto.banReason?.trim() || null;
      await this.prisma.user.update({ where: { id: profile.userId }, data: userData });
    }

    const result = await this.prisma.sellerProfile.findUniqueOrThrow({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true, isBanned: true, banReason: true } },
        _count: { select: { products: true } },
      },
    });

    if (audit) {
      await this.logging.logAdminAudit({
        adminId: audit.adminId,
        adminRole: audit.adminRole,
        action: 'SELLER_UPDATE',
        message: `Updated seller "${result.storeName}" (${result.email ?? result.user?.email ?? 'unknown'})`,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        meta: { sellerProfileId: id, patch: dto },
        endpoint: '/admin/sellers/:id',
        method: 'PATCH',
      });
    }

    if (profile.userId && dto.verified !== undefined) {
      if (dto.verified) {
        this.notifications.notifySellerVerified(profile.userId, result.storeName).catch((err) =>
          this.logger.error(`Failed to notify seller verification: ${err.message}`),
        );
      } else {
        this.notifications.notifySellerRejected(profile.userId, result.storeName).catch((err) =>
          this.logger.error(`Failed to notify seller rejection: ${err.message}`),
        );
      }
    }

    return result;
  }

  async deleteSeller(sellerProfileId: string, adminId: string, audit?: AdminAuditContext) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      include: {
        user: true,
        _count: { select: { products: true } },
      },
    });
    if (!seller) throw new NotFoundException('Seller not found');
    if (seller.userId === adminId) throw new BadRequestException('Cannot delete your own account');

    // Suspend the seller: mark as rejected, unverify, and deactivate all their products
    await this.prisma.$transaction(async (tx) => {
      // Deactivate all seller products so they disappear from storefront
      await tx.product.updateMany({
        where: { sellerId: sellerProfileId },
        data: { isActive: false },
      });

      // Suspend the seller profile
      await tx.sellerProfile.update({
        where: { id: sellerProfileId },
        data: {
          onboardingStatus: 'REJECTED',
          verified: false,
          rejectionReason: 'Account suspended by admin',
          reviewedAt: new Date(),
        },
      });

      // Downgrade user role back to CUSTOMER
      if (seller.userId) {
        await tx.user.update({
          where: { id: seller.userId },
          data: { role: 'CUSTOMER' },
        });
      }
    });

    if (audit) {
      await this.logging.logAdminAudit({
        adminId: audit.adminId,
        adminRole: audit.adminRole,
        action: 'SELLER_SUSPEND',
        message: `Suspended seller "${seller.storeName}" (${seller.email ?? seller.user?.email ?? 'unknown'}) — ${seller._count.products} products deactivated`,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        meta: {
          sellerProfileId,
          targetUserId: seller.userId,
          targetEmail: seller.email ?? seller.user?.email,
          productsDeactivated: seller._count.products,
        },
        endpoint: '/admin/sellers/:id',
        method: 'DELETE',
      });
    }

    return { suspended: true, productsDeactivated: seller._count.products };
  }

  // ─── Customers ───

  async getCustomers(query: AdminCustomerQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    // Validate the role filter against the actual Prisma enum. Anything
    // else (legacy filter values, typos, deleted roles, etc.) silently
    // degrades to "all non-admin accounts" instead of crashing Prisma
    // with `Invalid value for argument \`role\`. Expected Role.`.
    const validRoles = Object.values(Role) as string[];
    const requestedRole = query.role && validRoles.includes(query.role)
      ? (query.role as Role)
      : null;
    const where: Prisma.UserWhereInput = {
      role: requestedRole ?? { not: Role.ADMIN },
    };

    if (query.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
          isActive: true,
          isBanned: true,
          banReason: true,
          aadhaarVerified: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Returns the full 360° view of a single user — profile, every order
   * (with items, seller, payment and shipment status), every return /
   * refund request, every support ticket, and their wallet balance +
   * latest transactions. Used by the admin → Customers → "View" drawer
   * so support agents can answer "what did this user buy and what is the
   * refund status?" without bouncing between screens.
   */
  async getCustomerById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        aadhaarVerified: true,
        aadhaarVerifiedAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
        loginCount: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        addresses: { orderBy: { isDefault: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [orders, returnRequests, tickets, wallet] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                  seller: { select: { id: true, storeName: true, sellerCode: true } },
                },
              },
            },
          },
          shipment: true,
          shippingAddress: true,
        },
      }),
      this.prisma.returnRequest.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              items: { select: { productName: true, quantity: true, price: true } },
            },
          },
        },
      }),
      this.prisma.ticket.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          orderId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.wallet.findUnique({
        where: { ownerId_ownerType: { ownerId: id, ownerType: 'CUSTOMER' } },
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 25 },
        },
      }),
    ]);

    // Pre-compute aggregates so the UI does not have to re-walk the orders.
    const completedOrders = orders.filter((o) => o.status === 'DELIVERED');
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');
    const refundedOrders = orders.filter((o) => o.status === 'REFUNDED');
    const totalSpent = completedOrders.reduce((sum, o) => sum + o.total, 0);

    return {
      user,
      stats: {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        refundedOrders: refundedOrders.length,
        totalSpent,
        openTickets: tickets.filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length,
        pendingReturns: returnRequests.filter(
          (r) => r.status !== 'REFUNDED' && r.status !== 'REJECTED',
        ).length,
      },
      orders: orders.map((o) => {
        // The Order model has no direct seller relation — every line item is
        // sold by the product's seller. We surface the first item's seller so
        // the admin can quickly see "who fulfilled this order" in the list.
        const firstSeller = o.items[0]?.product?.seller ?? null;
        return { ...o, seller: firstSeller };
      }),
      returnRequests,
      tickets,
      wallet,
    };
  }

  async updateCustomer(id: string, dto: AdminUpdateCustomerDto, audit?: AdminAuditContext) {
    const data: any = {};
    if (dto.role) data.role = dto.role;
    if (dto.emailVerified !== undefined) data.emailVerified = dto.emailVerified;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isBanned !== undefined) data.isBanned = dto.isBanned;
    if (dto.banReason !== undefined) data.banReason = dto.banReason?.trim() || null;
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    if (audit) {
      const parts: string[] = [];
      if (dto.role !== undefined) parts.push(`role=${dto.role}`);
      if (dto.emailVerified !== undefined) parts.push(`emailVerified=${dto.emailVerified}`);
      if (dto.isActive !== undefined) parts.push(`isActive=${dto.isActive}`);
      if (dto.isBanned !== undefined) parts.push(`isBanned=${dto.isBanned}`);
      if (dto.banReason !== undefined) parts.push('banReason updated');
      await this.logging.logAdminAudit({
        adminId: audit.adminId,
        adminRole: audit.adminRole,
        action: 'USER_UPDATE',
        message: `Updated user ${updated.email} (${updated.name}): ${parts.join(', ') || 'fields saved'}`,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        meta: { targetUserId: id, patch: dto },
        endpoint: '/admin/customers/:id',
        method: 'PATCH',
      });
    }

    return updated;
  }

  async deleteCustomer(userId: string, adminId: string, audit?: AdminAuditContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { orders: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    if (userId === adminId) throw new BadRequestException('Cannot delete your own account');
    if (user.role === 'ADMIN') throw new BadRequestException('Cannot delete admin users');
    if (user._count.orders > 0) {
      throw new BadRequestException('Cannot delete user with order history');
    }
    if (audit) {
      await this.logging.logAdminAudit({
        adminId: audit.adminId,
        adminRole: audit.adminRole,
        action: 'USER_DELETE',
        message: `Deleted user ${user.email} (${user.name}, role ${user.role})`,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        meta: { targetUserId: userId, targetEmail: user.email, targetRole: user.role },
        endpoint: '/admin/customers/:id',
        method: 'DELETE',
      });
    }
    // Deleting user sets sellerProfile.userId = null (SetNull) — seller
    // profile is preserved as an independent entity.
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  // ─── Categories ───

  /**
   * Returns the full category tree (root → children → grandchildren) in
   * one round-trip so the admin UI can both display and pick parents at
   * any depth. We materialise the relations bottom-up so a single
   * `findMany` is enough.
   */
  async getCategories() {
    const all = await this.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });

    type Node = (typeof all)[number] & { children: Node[] };
    const byId = new Map<string, Node>();
    for (const c of all) byId.set(c.id, { ...(c as any), children: [] });

    const roots: Node[] = [];
    for (const c of all) {
      const node = byId.get(c.id)!;
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async createCategory(dto: CreateCategoryDto) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    const slug = this.slugify(name);

    // Slug must be unique — bail with a friendly error before Prisma
    // throws a P2002 the UI can't read.
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`A category named "${name}" already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('Selected parent category no longer exists');
    }

    return this.prisma.category.create({
      data: {
        name,
        slug,
        description: dto.description?.trim() || null,
        image: dto.image?.trim() || null,
        parentId: dto.parentId || null,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const data: any = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Category name cannot be empty');
      data.name = name;
      data.slug = this.slugify(name);
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.image !== undefined) data.image = dto.image?.trim() || null;
    if (dto.parentId !== undefined) {
      // Empty string in the payload means "make this a root category".
      data.parentId = dto.parentId ? dto.parentId : null;

      // Block self-parenting and cycles (parent cannot be a descendant).
      if (data.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      if (data.parentId) {
        const descendantIds = await this.collectCategoryDescendants(id);
        if (descendantIds.has(data.parentId)) {
          throw new BadRequestException(
            'You cannot move a category beneath one of its own descendants',
          );
        }
      }
    }

    if (data.slug) {
      const clash = await this.prisma.category.findFirst({
        where: { slug: data.slug, NOT: { id } },
        select: { id: true },
      });
      if (clash) {
        throw new BadRequestException('Another category already uses that name');
      }
    }

    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');

    // Categories with children or products would cascade-fail at the DB level
    // — give the admin a clear message instead of a Prisma 500.
    if (cat._count.children > 0) {
      throw new BadRequestException(
        'Move or delete this category\u2019s subcategories before deleting it',
      );
    }
    if (cat._count.products > 0) {
      throw new BadRequestException(
        'Reassign or delete this category\u2019s products before deleting it',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  /** Collects all descendant category ids of a given root (used to block cycles). */
  private async collectCategoryDescendants(rootId: string): Promise<Set<string>> {
    const all = await this.prisma.category.findMany({
      select: { id: true, parentId: true },
    });
    const childrenByParent = new Map<string, string[]>();
    for (const c of all) {
      if (!c.parentId) continue;
      const list = childrenByParent.get(c.parentId) ?? [];
      list.push(c.id);
      childrenByParent.set(c.parentId, list);
    }
    const out = new Set<string>();
    const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const ch of childrenByParent.get(cur) ?? []) {
        if (!out.has(ch)) {
          out.add(ch);
          stack.push(ch);
        }
      }
    }
    return out;
  }

  // ─── Brands ───

  /**
   * Returns every brand (approved + pending). Pending and recently-added
   * brands surface first so admins can act on them. Each row is enriched
   * with the proposing seller's storeName so the brand list page can show
   * who submitted it.
   */
  async getBrands() {
    const brands = await this.prisma.brand.findMany({
      orderBy: [{ approved: 'asc' }, { createdAt: 'desc' }],
    });

    const proposerIds = Array.from(new Set(brands.map((b) => b.proposedBy).filter((v): v is string => !!v)));
    const proposers = proposerIds.length
      ? await this.prisma.sellerProfile.findMany({
          where: { id: { in: proposerIds } },
          select: { id: true, storeName: true, sellerCode: true, email: true },
        })
      : [];
    const byId = new Map(proposers.map((p) => [p.id, p]));

    return brands.map((b) => ({
      ...b,
      proposer: b.proposedBy ? byId.get(b.proposedBy) ?? null : null,
    }));
  }

  async getPendingBrands() {
    return this.prisma.brand.findMany({
      where: { approved: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBrand(dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        name: dto.name,
        slug: this.slugify(dto.name),
        logo: dto.logo,
        featured: dto.featured,
        authorizationCertificate: dto.authorizationCertificate,
        // Admin-created brands are approved by default.
        approved: true,
        isActive: true,
      },
    });
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Brand not found');

    const data: any = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = this.slugify(dto.name);
    }
    if (dto.logo !== undefined) data.logo = dto.logo;
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.authorizationCertificate !== undefined) {
      data.authorizationCertificate = dto.authorizationCertificate || null;
    }

    if (dto.approved !== undefined) {
      data.approved = dto.approved;
      // Approving a brand also activates it on the storefront so sellers can
      // immediately tag products with it. Rejecting leaves it inactive but
      // keeps the row so the seller can see admin's reason.
      if (dto.approved === true) {
        data.isActive = true;
        data.rejectionReason = null;
      } else {
        data.isActive = false;
      }
    }
    if (dto.rejectionReason !== undefined) {
      data.rejectionReason = dto.rejectionReason?.trim() || null;
    }

    return this.prisma.brand.update({ where: { id }, data });
  }

  async deleteBrand(id: string) {
    await this.prisma.brand.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Banners ───

  async getBanners() {
    return this.prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createBanner(dto: CreateBannerDto) {
    return this.prisma.banner.create({ data: dto as any });
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    return this.prisma.banner.update({ where: { id }, data: dto as any });
  }

  async deleteBanner(id: string) {
    await this.prisma.banner.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Coupons ───

  async getCoupons() {
    const rows = await this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    const sellerIds = [...new Set(rows.map((r) => r.sellerId).filter(Boolean))] as string[];
    if (sellerIds.length === 0) return rows.map((c) => ({ ...c, sellerName: null as string | null }));

    const sellers = await this.prisma.sellerProfile.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, storeName: true },
    });
    const map = new Map(sellers.map((s) => [s.id, s.storeName]));
    return rows.map((c) => ({
      ...c,
      sellerName: c.sellerId ? map.get(c.sellerId) ?? null : null,
    }));
  }

  async createCoupon(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description,
        discountType: dto.discountType as any,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount || 0,
        maxDiscount: dto.maxDiscount,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        usageLimit: dto.usageLimit,
        maxRedemptionsPerUser: dto.maxRedemptionsPerUser ?? null,
        scope: dto.scope || 'global',
        categoryId: dto.categoryId || null,
        sellerId: dto.sellerId || null,
        moderationStatus: 'APPROVED',
      },
    });
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const data: any = { ...dto };
    if (dto.code) data.code = dto.code.toUpperCase();
    if (dto.validUntil) data.validUntil = new Date(dto.validUntil);
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async deleteCoupon(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { deleted: true };
  }

  async approveSellerCoupon(id: string, adminUserId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.sellerId) {
      throw new BadRequestException('Only seller-submitted coupons use this approval flow');
    }
    if (coupon.moderationStatus === 'APPROVED') return coupon;

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        moderationStatus: 'APPROVED',
        moderatedAt: new Date(),
        moderatedById: adminUserId,
        rejectionReason: null,
        isActive: true,
      },
    });

    await this.prisma.moderationAuditLog.create({
      data: {
        entityType: 'COUPON',
        entityId: id,
        action: 'APPROVE',
        actorUserId: adminUserId,
        metadata: { code: coupon.code },
      },
    });

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: coupon.sellerId },
      select: { userId: true },
    });
    if (seller?.userId) {
      this.notifications
        .notifyCouponModeration(seller.userId, coupon.code, 'APPROVED', id)
        .catch(() => {});
    }

    return updated;
  }

  async rejectSellerCoupon(id: string, adminUserId: string, reason?: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.sellerId) {
      throw new BadRequestException('Only seller-submitted coupons use this rejection flow');
    }

    const r = (reason ?? '').trim() || 'No reason provided';

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        moderationStatus: 'REJECTED',
        moderatedAt: new Date(),
        moderatedById: adminUserId,
        rejectionReason: r,
        isActive: false,
      },
    });

    await this.prisma.moderationAuditLog.create({
      data: {
        entityType: 'COUPON',
        entityId: id,
        action: 'REJECT',
        actorUserId: adminUserId,
        metadata: { code: coupon.code, reason: r },
      },
    });

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: coupon.sellerId },
      select: { userId: true },
    });
    if (seller?.userId) {
      this.notifications
        .notifyCouponModeration(seller.userId, coupon.code, 'REJECTED', id, r)
        .catch(() => {});
    }

    return updated;
  }

  // ─── Commission Rules ───

  async getCommissionRules() {
    return this.prisma.commissionRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createCommissionRule(dto: CreateCommissionDto) {
    return this.prisma.commissionRule.create({ data: dto });
  }

  async updateCommissionRule(id: string, dto: UpdateCommissionDto) {
    return this.prisma.commissionRule.update({ where: { id }, data: dto as any });
  }

  async deleteCommissionRule(id: string) {
    await this.prisma.commissionRule.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Payouts ───

  async getPayouts(query: AdminPayoutQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.PayoutWhereInput = {};

    if (query.status) where.status = query.status as any;
    if (query.seller) where.sellerId = query.seller;

    // Date range filtering
    const dateRange = this.resolveDateRange(query.period, query.dateFrom, query.dateTo);
    if (dateRange) {
      where.requestedAt = { gte: dateRange.from, lte: dateRange.to };
    }

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          seller: { select: { storeName: true, user: { select: { name: true, email: true } } } },
          order: {
            select: {
              orderNumber: true,
              total: true,
              shipment: { select: { courierCharges: true, shippingMode: true } },
            },
          },
        },
      }),
      this.prisma.payout.count({ where }),
    ]);

    // Compute financial summary for the filtered set
    const summary = await this.computePayoutSummary(where);

    return { items, total, page, limit, summary };
  }

  private resolveDateRange(period?: string, dateFrom?: string, dateTo?: string) {
    if (period === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    if (period === 'monthly') {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : new Date(0);
      const to = dateTo ? new Date(dateTo) : new Date();
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    return null;
  }

  private async computePayoutSummary(where: Prisma.PayoutWhereInput) {
    const payouts = await this.prisma.payout.findMany({
      where,
      include: {
        order: {
          select: {
            total: true,
            shipment: { select: { courierCharges: true, shippingMode: true } },
          },
        },
      },
    });

    let totalGross = 0;
    let totalShippingCharges = 0;
    let totalCommission = 0;
    let totalNetPayout = 0;

    for (const payout of payouts) {
      totalGross += payout.amount;
      totalNetPayout += payout.amount;

      if (payout.order?.shipment?.shippingMode === 'XELNOVA_COURIER') {
        const charges = payout.order.shipment.courierCharges ?? 0;
        totalShippingCharges += charges;
      }
      const deduction = (payout as any).courierDeduction ?? 0;
      totalCommission += deduction;
    }

    return {
      totalGross,
      totalShippingCharges,
      totalCommission,
      commissionAdjustment: totalShippingCharges,
      totalNetPayout,
      count: payouts.length,
    };
  }

  async updatePayout(id: string, dto: UpdatePayoutDto) {
    const data: any = { status: dto.status, note: dto.note };
    if (dto.status === 'PAID') data.paidAt = new Date();
    return this.prisma.payout.update({ where: { id }, data, include: { seller: { select: { storeName: true } } } });
  }

  // ─── CMS Pages ───

  async getPages() {
    return this.prisma.cmsPage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createPage(dto: CreatePageDto) {
    return this.prisma.cmsPage.create({
      data: { title: dto.title, slug: this.slugify(dto.title), content: dto.content, status: dto.status || 'draft' },
    });
  }

  async updatePage(id: string, dto: UpdatePageDto) {
    const data: any = { ...dto };
    if (dto.title) data.slug = this.slugify(dto.title);
    return this.prisma.cmsPage.update({ where: { id }, data });
  }

  async deletePage(id: string) {
    await this.prisma.cmsPage.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Admin Roles ───

  async getRoles() {
    const rows = await this.prisma.adminRole.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      level: r.level,
      permissions: r.permissions,
      permissionsData: r.permissionsData,
      isSystem: r.isSystem,
      isTemplate: r.isTemplate,
      users: r._count.members,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createRole(dto: CreateRoleDto) {
    const trimmedName = (dto.name ?? '').trim();
    if (!trimmedName) {
      throw new BadRequestException('Role name is required');
    }

    // Pre-check so the user gets a clear, friendly message instead of a raw
    // Prisma "Unique constraint failed on the fields: (`name`)" toast.
    const existing = await this.prisma.adminRole.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
      select: { id: true, name: true, isSystem: true },
    });
    if (existing) {
      throw new ConflictException(
        `A role named "${existing.name}" already exists. Pick a different name or edit the existing role.`,
      );
    }

    const data: any = {
      name: trimmedName,
      description: dto.description?.trim() || null,
      level: dto.level || 'VIEWER',
      permissions: dto.permissions || '',
      permissionsData: dto.permissionsData || {},
    };
    try {
      return await this.prisma.adminRole.create({ data });
    } catch (err) {
      // Belt-and-suspenders: race condition between the pre-check and create.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `A role named "${trimmedName}" already exists. Pick a different name or edit the existing role.`,
        );
      }
      throw err;
    }
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const data: any = {};
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('Role name cannot be empty');
      }
      const conflict = await this.prisma.adminRole.findFirst({
        where: {
          name: { equals: trimmedName, mode: 'insensitive' },
          NOT: { id },
        },
        select: { id: true, name: true },
      });
      if (conflict) {
        throw new ConflictException(
          `A role named "${conflict.name}" already exists. Pick a different name.`,
        );
      }
      data.name = trimmedName;
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (dto.permissionsData !== undefined) data.permissionsData = dto.permissionsData;
    try {
      return await this.prisma.adminRole.update({ where: { id }, data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A role with that name already exists. Pick a different name.',
        );
      }
      throw err;
    }
  }

  async deleteRole(id: string) {
    const role = await this.prisma.adminRole.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system roles');
    if (role.isTemplate) throw new BadRequestException('Cannot delete template roles');
    if (role._count.members > 0) {
      throw new BadRequestException(
        `Cannot delete: ${role._count.members} sub-admin(s) are assigned to this role. Reassign them first.`,
      );
    }
    await this.prisma.adminRole.delete({ where: { id } });
    return { deleted: true };
  }

  async getRoleTemplates() {
    return this.permissions.getRoleTemplates();
  }

  // ─── Sub-admins (admin users with optional custom RBAC role) ───

  async getSubAdmins() {
    const rows = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isActive: true,
        isBanned: true,
        lastLoginAt: true,
        createdAt: true,
        adminRoleId: true,
        adminRole: {
          select: { id: true, name: true, permissions: true, isSystem: true },
        },
      },
    });
    return rows.map((r) => ({
      ...r,
      // Sub-admins have an assigned custom AdminRole. Users without one are
      // treated as the original "super admin" — they inherit full access.
      isSuperAdmin: !r.adminRoleId,
    }));
  }

  async createSubAdmin(dto: CreateSubAdminDto, audit?: AdminAuditContext) {
    const email = String(dto.email || '').trim().toLowerCase();
    const name = String(dto.name || '').trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('A valid email is required');
    }
    if (!name) throw new BadRequestException('Name is required');

    // Per-role uniqueness: a person may already have a CUSTOMER/SELLER row
    // with the same email — only block if an ADMIN row already exists.
    const existing = await this.prisma.user.findFirst({
      where: { email, role: 'ADMIN' },
    });
    if (existing) {
      throw new ConflictException('An admin user with this email already exists');
    }

    let adminRoleId: string | null = null;
    if (dto.adminRoleId) {
      const role = await this.prisma.adminRole.findUnique({ where: { id: dto.adminRoleId } });
      if (!role) throw new BadRequestException('Selected role does not exist');
      adminRoleId = role.id;
    }

    // Generate a strong temporary password if the admin didn't set one.
    // The new sub-admin can change it after first login.
    const rawPassword =
      (dto.password && dto.password.length >= 6 ? dto.password : null) ??
      randomBytes(9).toString('base64url'); // ~12 chars, URL-safe

    const hashed = await bcrypt.hash(rawPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'ADMIN',
        emailVerified: true,
        authProvider: 'EMAIL',
        adminRoleId,
        mustChangePassword: true,
      },
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        adminRoleId: true,
        adminRole: { select: { id: true, name: true, permissions: true } },
        createdAt: true,
      },
    });

    if (audit) {
      this.logging
        .logAdminAudit({
          adminId: audit.adminId,
          adminRole: audit.adminRole,
          action: 'SUB_ADMIN_CREATED',
          message: `Created sub-admin ${user.email}`,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          meta: { userId: user.id, adminRoleId },
          endpoint: '/admin/sub-admins',
          method: 'POST',
        })
        .catch(() => undefined);
    }

    const roleName = user.adminRole?.name;
    this.emailService
      .sendSubAdminWelcome(email, name, rawPassword, roleName ?? undefined)
      .catch((err) => this.logger.error(`Failed to send sub-admin welcome email to ${email}:`, err));

    return { ...user, tempPassword: dto.password ? null : rawPassword };
  }

  async updateSubAdmin(id: string, dto: UpdateSubAdminDto, audit?: AdminAuditContext) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'ADMIN') {
      throw new NotFoundException('Sub-admin not found');
    }
    if (audit?.adminId === id && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) throw new BadRequestException('Name cannot be empty');
      data.name = trimmed;
    }
    if (dto.adminRoleId !== undefined) {
      if (dto.adminRoleId === null || dto.adminRoleId === '') {
        // Clearing role promotes to super-admin — only the original super-admin
        // (no role) can do this and only for other sub-admins.
        data.adminRole = { disconnect: true };
      } else {
        const role = await this.prisma.adminRole.findUnique({ where: { id: dto.adminRoleId } });
        if (!role) throw new BadRequestException('Selected role does not exist');
        data.adminRole = { connect: { id: role.id } };
      }
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, isActive: true, adminRoleId: true,
        adminRole: { select: { id: true, name: true, permissions: true } },
      },
    });

    if (audit) {
      this.logging
        .logAdminAudit({
          adminId: audit.adminId,
          adminRole: audit.adminRole,
          action: 'SUB_ADMIN_UPDATED',
          message: `Updated sub-admin ${target.email ?? target.id}`,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          meta: { userId: id, patch: dto as unknown as Record<string, unknown> },
          endpoint: '/admin/sub-admins/:id',
          method: 'PATCH',
        })
        .catch(() => undefined);
    }

    return updated;
  }

  async deleteSubAdmin(id: string, audit?: AdminAuditContext) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'ADMIN') {
      throw new NotFoundException('Sub-admin not found');
    }
    if (audit?.adminId === id) {
      throw new BadRequestException('You cannot remove your own account');
    }
    // Soft remove: demote rather than hard-delete so existing FK references
    // (orders, audit logs, etc.) remain valid.
    await this.prisma.user.update({
      where: { id },
      data: { role: 'CUSTOMER', adminRoleId: null, isActive: false },
    });

    if (audit) {
      this.logging
        .logAdminAudit({
          adminId: audit.adminId,
          adminRole: audit.adminRole,
          action: 'SUB_ADMIN_REMOVED',
          message: `Removed sub-admin ${target.email ?? target.id}`,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          meta: { userId: id },
          endpoint: '/admin/sub-admins/:id',
          method: 'DELETE',
        })
        .catch(() => undefined);
    }
    return { removed: true };
  }

  async resetSubAdminPassword(id: string, audit?: AdminAuditContext) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'ADMIN') {
      throw new NotFoundException('Sub-admin not found');
    }
    const newPassword = randomBytes(9).toString('base64url');
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });

    if (audit) {
      this.logging
        .logAdminAudit({
          adminId: audit.adminId,
          adminRole: audit.adminRole,
          action: 'SUB_ADMIN_PASSWORD_RESET',
          message: `Reset password for sub-admin ${target.email ?? target.id}`,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          meta: { userId: id },
          endpoint: '/admin/sub-admins/:id/reset-password',
          method: 'POST',
        })
        .catch(() => undefined);
    }
    return { tempPassword: newPassword };
  }

  // ─── Revenue Analytics ───

  async getRevenue(query: { period?: string; dateFrom?: string; dateTo?: string }) {
    const dateFilter: any = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);

    const orderWhere: Prisma.OrderWhereInput = {
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };

    const orders = await this.prisma.order.findMany({
      where: orderWhere,
      select: { total: true, createdAt: true, discount: true, shipping: true, tax: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalDiscount = orders.reduce((s, o) => s + o.discount, 0);
    const totalShipping = orders.reduce((s, o) => s + o.shipping, 0);
    const totalTax = orders.reduce((s, o) => s + o.tax, 0);

    const dailyMap = new Map<string, number>();
    orders.forEach((o) => {
      const day = o.createdAt.toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + o.total);
    });

    // Category breakdown
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: orderWhere },
      select: { price: true, quantity: true, product: { select: { category: { select: { name: true } }, seller: { select: { storeName: true } } } } },
    });

    const categoryMap = new Map<string, number>();
    const sellerMap = new Map<string, number>();
    orderItems.forEach((item) => {
      const catName = item.product?.category?.name || 'Uncategorized';
      const sellerName = item.product?.seller?.storeName || 'Unknown';
      const lineTotal = item.price * item.quantity;
      categoryMap.set(catName, (categoryMap.get(catName) || 0) + lineTotal);
      sellerMap.set(sellerName, (sellerMap.get(sellerName) || 0) + lineTotal);
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const sellerBreakdown = Array.from(sellerMap.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalRevenue, totalDiscount, totalShipping, totalTax,
      orderCount: orders.length,
      dailyRevenue: Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount })),
      categoryBreakdown,
      sellerBreakdown,
    };
  }

  // ─── Activity Log ───

  async getActivityLogs(query: { page?: number; limit?: number; type?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const where: Prisma.ActivityLogWhereInput = {};
    if (query.type) where.type = query.type;

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async logActivity(type: string, action: string, message: string, userId?: string, meta?: any) {
    return this.prisma.activityLog.create({ 
      data: { 
        type, 
        action,
        message, 
        meta,
        ...(userId && { user: { connect: { id: userId } } }),
      } 
    });
  }

  // ─── Site settings (singleton) ───

  private readonly defaultSiteSettings = {
    general: { siteName: 'Xelnova', tagline: 'Your marketplace', currency: 'INR', timezone: 'Asia/Kolkata', language: 'en' },
    tax: { gstEnabled: true, gstRate: 18, hsnDefault: '' },
    shipping: { freeShippingMin: 499, defaultRate: 49, expressRate: 99, codEnabled: true, codFee: 0, defaultDeliveryDays: 5 },
    payment: { razorpayEnabled: true, codEnabled: true, upiEnabled: true, cardEnabled: true, netBankingEnabled: true },
    notifications: { orderConfirmation: true, shipmentUpdate: true, promotionalEmails: false, smsAlerts: false, adminNewOrder: true },
    shippingLabel: {
      companyName: 'Xelnova',
      companyLogo: '',
      companyAddress: '',
      companyPhone: '',
      companyGstin: '',
      tagline: '',
      footerText: 'Thank you for shopping with us!',
      showSellerSignature: true,
      showBarcode: true,
    },
    shippingRates: {
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
    },
    /** Marketplace-wide defaults applied to every product; sellers cannot override. */
    returnPolicy: {
      isCancellable: true,
      isReturnable: true,
      isReplaceable: false,
      returnWindow: 7,
      cancellationWindow: 0,
    },
    productAttributePresets: DEFAULT_PRODUCT_ATTRIBUTE_PRESETS,
    platformLogistics: { ...DEFAULT_PLATFORM_LOGISTICS },
  };

  private mergeProductAttributePresetSection(
    def: ProductAttributePresetSection,
    stored: unknown,
  ): ProductAttributePresetSection {
    if (!stored || typeof stored !== 'object') return { ...def, valuesByKey: { ...def.valuesByKey } };
    const o = stored as Partial<ProductAttributePresetSection>;
    const keys = Array.isArray(o.keys) && o.keys.length > 0 ? o.keys.map(String) : [...def.keys];
    const defaultValues =
      Array.isArray(o.defaultValues) && o.defaultValues.length > 0
        ? o.defaultValues.map(String)
        : [...def.defaultValues];
    const valuesByKey: Record<string, string[]> = { ...def.valuesByKey };
    if (o.valuesByKey && typeof o.valuesByKey === 'object') {
      for (const [k, arr] of Object.entries(o.valuesByKey)) {
        if (Array.isArray(arr) && arr.length > 0) valuesByKey[k] = arr.map(String);
      }
    }
    return { id: def.id, keys, defaultValues, valuesByKey };
  }

  private mergeProductAttributePresets(stored: unknown) {
    const d = DEFAULT_PRODUCT_ATTRIBUTE_PRESETS;
    const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
    return {
      featuresSpecs: this.mergeProductAttributePresetSection(d.featuresSpecs, s.featuresSpecs),
      materialsCare: this.mergeProductAttributePresetSection(d.materialsCare, s.materialsCare),
      itemDetails: this.mergeProductAttributePresetSection(d.itemDetails, s.itemDetails),
      additionalDetails: this.mergeProductAttributePresetSection(d.additionalDetails, s.additionalDetails),
    };
  }

  private mergeSiteSettings(stored: unknown) {
    const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
    return {
      general: { ...this.defaultSiteSettings.general, ...(s.general as Record<string, unknown>) },
      tax: { ...this.defaultSiteSettings.tax, ...(s.tax as Record<string, unknown>) },
      shipping: { ...this.defaultSiteSettings.shipping, ...(s.shipping as Record<string, unknown>) },
      payment: { ...this.defaultSiteSettings.payment, ...(s.payment as Record<string, unknown>) },
      notifications: { ...this.defaultSiteSettings.notifications, ...(s.notifications as Record<string, unknown>) },
      shippingLabel: { ...this.defaultSiteSettings.shippingLabel, ...(s.shippingLabel as Record<string, unknown>) },
      shippingRates: { ...this.defaultSiteSettings.shippingRates, ...(s.shippingRates as Record<string, unknown>) },
      returnPolicy: {
        ...this.defaultSiteSettings.returnPolicy,
        ...(s.returnPolicy as Record<string, unknown>),
      },
      productAttributePresets: this.mergeProductAttributePresets(s.productAttributePresets),
      platformLogistics: (() => {
        const pl =
          s.platformLogistics && typeof s.platformLogistics === 'object'
            ? (s.platformLogistics as Record<string, unknown>)
            : {};
        const obj = (k: string): Record<string, unknown> =>
          pl[k] && typeof pl[k] === 'object' ? (pl[k] as Record<string, unknown>) : {};
        const def = this.defaultSiteSettings.platformLogistics;
        return {
          ...def,
          ...pl,
          delhivery: { ...def.delhivery, ...obj('delhivery') },
          shiprocket: { ...def.shiprocket, ...obj('shiprocket') },
          xpressbees: { ...def.xpressbees, ...obj('xpressbees') },
          ekart: { ...def.ekart, ...obj('ekart') },
        };
      })(),
    };
  }

  async getSiteSettings() {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const merged = this.mergeSiteSettings(row?.payload);
    return {
      ...merged,
      platformLogistics: this.shipping.sanitizePlatformLogisticsForResponse(merged.platformLogistics),
    };
  }

  /** Values copied onto every product at create/update; sellers cannot override. */
  async getMarketplaceReturnPolicy() {
    const s = (await this.getSiteSettings()) as {
      returnPolicy: {
        isCancellable?: boolean;
        isReturnable?: boolean;
        isReplaceable?: boolean;
        returnWindow?: number;
        cancellationWindow?: number;
      };
    };
    const rp = s.returnPolicy ?? this.defaultSiteSettings.returnPolicy;
    return {
      isCancellable: rp.isCancellable !== false,
      isReturnable: rp.isReturnable !== false,
      isReplaceable: !!rp.isReplaceable,
      returnWindow:
        typeof rp.returnWindow === 'number' && !Number.isNaN(rp.returnWindow) ? rp.returnWindow : 7,
      cancellationWindow:
        typeof rp.cancellationWindow === 'number' && !Number.isNaN(rp.cancellationWindow)
          ? rp.cancellationWindow
          : 0,
    };
  }

  async updateSiteSettings(dto: AdminSiteSettingsDto, audit?: AdminAuditContext) {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const current = this.mergeSiteSettings(row?.payload);
    const merged = {
      general: dto.general !== undefined ? { ...current.general, ...dto.general } : current.general,
      tax: dto.tax !== undefined ? { ...current.tax, ...dto.tax } : current.tax,
      shipping: dto.shipping !== undefined ? { ...current.shipping, ...dto.shipping } : current.shipping,
      payment: dto.payment !== undefined ? { ...current.payment, ...dto.payment } : current.payment,
      notifications: dto.notifications !== undefined ? { ...current.notifications, ...dto.notifications } : current.notifications,
      shippingLabel: dto.shippingLabel !== undefined ? { ...current.shippingLabel, ...dto.shippingLabel } : current.shippingLabel,
      shippingRates: dto.shippingRates !== undefined ? { ...current.shippingRates, ...dto.shippingRates } : current.shippingRates,
      returnPolicy:
        dto.returnPolicy !== undefined ? { ...current.returnPolicy, ...dto.returnPolicy } : current.returnPolicy,
      productAttributePresets:
        dto.productAttributePresets !== undefined
          ? this.mergeProductAttributePresets(dto.productAttributePresets)
          : current.productAttributePresets,
      platformLogistics:
        dto.platformLogistics !== undefined
          ? this.shipping.preparePlatformLogisticsSave(current.platformLogistics, dto.platformLogistics as any)
          : current.platformLogistics,
    };
    const payloadJson = merged as unknown as Prisma.InputJsonValue;
    await this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1, payload: payloadJson },
      update: { payload: payloadJson },
    });

    if (dto.returnPolicy !== undefined) {
      const rp = merged.returnPolicy as {
        isCancellable?: boolean;
        isReturnable?: boolean;
        isReplaceable?: boolean;
        returnWindow?: number;
        cancellationWindow?: number;
      };
      await this.prisma.product.updateMany({
        data: {
          isCancellable: rp.isCancellable !== false,
          isReturnable: rp.isReturnable !== false,
          isReplaceable: !!rp.isReplaceable,
          returnWindow: typeof rp.returnWindow === 'number' && !Number.isNaN(rp.returnWindow) ? rp.returnWindow : 7,
          cancellationWindow:
            typeof rp.cancellationWindow === 'number' && !Number.isNaN(rp.cancellationWindow)
              ? rp.cancellationWindow
              : 0,
        },
      });
    }

    if (audit) {
      const sections = (
        [
          'general',
          'tax',
          'shipping',
          'payment',
          'notifications',
          'shippingLabel',
          'shippingRates',
          'returnPolicy',
          'productAttributePresets',
          'platformLogistics',
        ] as const
      ).filter((k) => dto[k] !== undefined);
      await this.logging.logAdminAudit({
        adminId: audit.adminId,
        adminRole: audit.adminRole,
        action: 'SETTINGS_UPDATE',
        message: `Site settings updated (${sections.join(', ') || 'payload'})`,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        meta: { sections },
        endpoint: '/admin/settings',
        method: 'PATCH',
      });
    }

    return {
      ...merged,
      platformLogistics: this.shipping.sanitizePlatformLogisticsForResponse(merged.platformLogistics),
    };
  }

  private static formatBrandWarranty(value: number, unit: WarrantyDurationUnit): string {
    const label =
      unit === 'DAYS'
        ? value === 1
          ? 'Day'
          : 'Days'
        : unit === 'MONTHS'
          ? value === 1
            ? 'Month'
            : 'Months'
          : value === 1
            ? 'Year'
            : 'Years';
    return `Brand Warranty: ${value} ${label}`;
  }
}
