import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
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
  CreatePageDto, UpdatePageDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
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
    if (dto.status) data.status = dto.status;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.isTrending !== undefined) data.isTrending = dto.isTrending;
    if (dto.isFlashDeal !== undefined) data.isFlashDeal = dto.isFlashDeal;
    if (dto.flashDealEndsAt) data.flashDealEndsAt = new Date(dto.flashDealEndsAt);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.product.update({ where: { id }, data });
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
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true, images: true } } } },
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

  // ─── Sellers ───

  async getSellers(query: AdminSellerQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.SellerProfileWhereInput = {};

    if (query.search) {
      where.OR = [
        { storeName: { contains: query.search, mode: 'insensitive' } },
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
          user: { select: { name: true, email: true, phone: true } },
          _count: { select: { products: true } },
        },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateSeller(id: string, dto: AdminUpdateSellerDto) {
    const data: any = {};
    if (dto.verified !== undefined) data.verified = dto.verified;
    if (dto.commissionRate !== undefined) data.commissionRate = dto.commissionRate;
    return this.prisma.sellerProfile.update({ where: { id }, data, include: { user: { select: { name: true, email: true } } } });
  }

  // ─── Customers ───

  async getCustomers(query: AdminCustomerQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role as any;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, phone: true, role: true, emailVerified: true, createdAt: true, _count: { select: { orders: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateCustomer(id: string, dto: AdminUpdateCustomerDto) {
    const data: any = {};
    if (dto.role) data.role = dto.role;
    if (dto.emailVerified !== undefined) data.emailVerified = dto.emailVerified;
    return this.prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true } });
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
}
