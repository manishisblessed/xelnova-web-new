import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { LoggingService } from '../logging/logging.service';
import { NotificationService } from '../notifications/notification.service';
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
import { DEFAULT_PLATFORM_LOGISTICS } from '../../common/platform-logistics';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logging: LoggingService,
    private readonly notifications: NotificationService,
    private readonly shipping: ShippingService,
  ) {}

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  /** Creates a SellerProfile for SELLER users who have none (e.g. Google sign-in before profile sync). */
  private async ensureSellerProfileRow(userId: string, name: string, email?: string, phone?: string): Promise<void> {
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
        email,
        phone,
        storeName: `${name}'s Store`,
        slug,
        onboardingStatus: 'EMAIL_VERIFIED',
        onboardingStep: 2,
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
      this.prisma.product.count({ where: { status: 'PENDING' } }),
      this.prisma.review.count({ where: { approved: false } }),
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
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
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
        seller: { select: { storeName: true, email: true, phone: true } },
      },
    });
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
    return product;
  }

  async updateProduct(id: string, dto: AdminUpdateProductDto) {
    const data: any = {};
    
    if (dto.status) {
      data.status = dto.status;
      
      // When approving: set isActive to true and clear rejection reason
      if (dto.status === 'ACTIVE') {
        data.isActive = true;
        data.rejectionReason = null;
      }
      
      // When rejecting: set isActive to false and require rejection reason
      if (dto.status === 'REJECTED') {
        data.isActive = false;
        if (dto.rejectionReason) {
          data.rejectionReason = dto.rejectionReason;
        }
      }
    }
    
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.isTrending !== undefined) data.isTrending = dto.isTrending;
    if (dto.isFlashDeal !== undefined) data.isFlashDeal = dto.isFlashDeal;
    if (dto.flashDealEndsAt) data.flashDealEndsAt = new Date(dto.flashDealEndsAt);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.rejectionReason !== undefined && dto.status !== 'ACTIVE') {
      data.rejectionReason = dto.rejectionReason || null;
    }

    const product = await this.prisma.product.update({ 
      where: { id }, 
      data,
      include: {
        category: { select: { name: true } },
        seller: { select: { storeName: true, email: true, userId: true, user: { select: { email: true } } } },
      },
    });

    if (product.seller?.userId && dto.status) {
      if (dto.status === 'ACTIVE') {
        this.notifications.notifyProductApproved(product.seller.userId, product.name).catch((err) =>
          this.logger.error(`Failed to notify product approval: ${err.message}`),
        );
      } else if (dto.status === 'REJECTED') {
        this.notifications.notifyProductRejected(product.seller.userId, product.name, dto.rejectionReason).catch((err) =>
          this.logger.error(`Failed to notify product rejection: ${err.message}`),
        );
      }
    }

    return product;
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
      select: { status: true, userId: true, orderNumber: true, total: true },
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
          case 'CANCELLED': this.notifications.notifyOrderCancelled(uid, oNum, total).catch(() => {}); break;
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
    if (dto.commissionRate !== undefined) data.commissionRate = dto.commissionRate;
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
    const where: Prisma.UserWhereInput = {
      role: query.role ? (query.role as Role) : { not: Role.ADMIN },
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

  async getCategories() {
    return this.prisma.category.findMany({
      include: { children: true, _count: { select: { products: true } } },
      where: { parentId: null },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const slug = this.slugify(dto.name);
    return this.prisma.category.create({
      data: { name: dto.name, slug, description: dto.description, image: dto.image, parentId: dto.parentId },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const data: any = { ...dto };
    if (dto.name) data.slug = this.slugify(dto.name);
    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Brands ───

  async getBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async getPendingBrands() {
    return this.prisma.brand.findMany({
      where: { approved: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBrand(dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: { name: dto.name, slug: this.slugify(dto.name), logo: dto.logo, featured: dto.featured },
    });
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    const data: any = { ...dto };
    if (dto.name) data.slug = this.slugify(dto.name);
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
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
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
        scope: dto.scope || 'global',
        categoryId: dto.categoryId || null,
        sellerId: dto.sellerId || null,
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

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { requestedAt: 'desc' },
        include: { seller: { select: { storeName: true, user: { select: { name: true, email: true } } } } },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { items, total, page, limit };
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
    return this.prisma.adminRole.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createRole(dto: CreateRoleDto) {
    return this.prisma.adminRole.create({
      data: { name: dto.name, permissions: dto.permissions || '' },
    });
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    return this.prisma.adminRole.update({ where: { id }, data: dto as any });
  }

  async deleteRole(id: string) {
    const role = await this.prisma.adminRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new NotFoundException('Cannot delete system roles');
    await this.prisma.adminRole.delete({ where: { id } });
    return { deleted: true };
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
    shipping: { freeShippingMin: 499, defaultRate: 49, expressRate: 99, codEnabled: true, codFee: 0 },
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
        const d = pl.delhivery && typeof pl.delhivery === 'object' ? (pl.delhivery as Record<string, unknown>) : {};
        return {
          ...this.defaultSiteSettings.platformLogistics,
          ...pl,
          delhivery: {
            ...this.defaultSiteSettings.platformLogistics.delhivery,
            ...d,
          },
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
}
