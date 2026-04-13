import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logging: LoggingService,
    private readonly notifications: NotificationService,
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
      totalRevenue, monthRevenue, activeSellers, pendingProducts,
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
      activeSellers, pendingProducts,
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
        this.notifications.notifyProductApproved(product.seller.userId, product.name).catch(() => {});
      } else if (dto.status === 'REJECTED') {
        this.notifications.notifyProductRejected(product.seller.userId, product.name, dto.rejectionReason).catch(() => {});
      }
    }

    return product;
  }

  async deleteProduct(id: string) {
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
    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.paymentStatus) data.paymentStatus = dto.paymentStatus;
    return this.prisma.order.update({ where: { id }, data, include: { items: true } });
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
        this.notifications.notifySellerVerified(profile.userId, result.storeName).catch(() => {});
      } else {
        this.notifications.notifySellerRejected(profile.userId, result.storeName).catch(() => {});
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
    if (seller._count.products > 0) {
      throw new BadRequestException('Cannot delete seller with listed products. Remove or unpublish products first.');
    }
    if (audit) {
      await this.logging.logAdminAudit({
        adminId: audit.adminId,
        adminRole: audit.adminRole,
        action: 'SELLER_DELETE',
        message: `Deleted seller "${seller.storeName}" (${seller.email ?? seller.user?.email ?? 'unknown'})`,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        meta: {
          sellerProfileId,
          targetUserId: seller.userId,
          targetEmail: seller.email ?? seller.user?.email,
        },
        endpoint: '/admin/sellers/:id',
        method: 'DELETE',
      });
    }

    // Only delete the SellerProfile — the linked User (customer account)
    // is unaffected and remains intact.
    await this.prisma.sellerProfile.delete({ where: { id: sellerProfileId } });

    // Downgrade user role back to CUSTOMER if they were marked as SELLER
    if (seller.userId) {
      await this.prisma.user.update({
        where: { id: seller.userId },
        data: { role: 'CUSTOMER' },
      }).catch(() => {});
    }

    return { deleted: true };
  }

  // ─── Customers ───

  async getCustomers(query: AdminCustomerQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.UserWhereInput = {
      role: Role.CUSTOMER,
    };

    if (query.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
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

    const orders = await this.prisma.order.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
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

    return {
      totalRevenue, totalDiscount, totalShipping, totalTax,
      orderCount: orders.length,
      dailyRevenue: Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount })),
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
  };

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
    };
  }

  async getSiteSettings() {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    return this.mergeSiteSettings(row?.payload);
  }

  async updateSiteSettings(dto: AdminSiteSettingsDto, audit?: AdminAuditContext) {
    const current = await this.getSiteSettings();
    const merged = {
      general: dto.general !== undefined ? { ...current.general, ...dto.general } : current.general,
      tax: dto.tax !== undefined ? { ...current.tax, ...dto.tax } : current.tax,
      shipping: dto.shipping !== undefined ? { ...current.shipping, ...dto.shipping } : current.shipping,
      payment: dto.payment !== undefined ? { ...current.payment, ...dto.payment } : current.payment,
      notifications: dto.notifications !== undefined ? { ...current.notifications, ...dto.notifications } : current.notifications,
      shippingLabel: dto.shippingLabel !== undefined ? { ...current.shippingLabel, ...dto.shippingLabel } : current.shippingLabel,
      shippingRates: dto.shippingRates !== undefined ? { ...current.shippingRates, ...dto.shippingRates } : current.shippingRates,
    };
    await this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1, payload: merged as Prisma.InputJsonValue },
      update: { payload: merged as Prisma.InputJsonValue },
    });

    if (audit) {
      const sections = (['general', 'tax', 'shipping', 'payment', 'notifications', 'shippingLabel', 'shippingRates'] as const).filter(
        (k) => dto[k] !== undefined,
      );
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

    return merged;
  }
}
