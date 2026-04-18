import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateStoreSettingsDto,
  CreateStoreBannerDto,
  UpdateStoreBannerDto,
  StoreProductsQueryDto,
} from './dto/seller-store.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SellerStoreService {
  /** Customer-facing web app origin (not seller/admin subdomains). */
  private readonly storefrontOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const raw =
      this.config.get<string>('APP_URL') ||
      this.config.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    this.storefrontOrigin = raw.replace(/\/$/, '');
  }

  // ─── Public Methods (for buyers) ───

  /**
   * Look up a seller by storefront slug, with a tolerant fallback for legacy
   * URLs.
   *
   * Historically `generateSlug` always appended a random 6-char suffix
   * (e.g. `grand-hr-store-bhsldi`). Resubmitting onboarding step 2 produced
   * a *different* random suffix and silently broke any cached product or
   * share link pointing at the previous slug. To stop those URLs returning
   * 404 we:
   *   1. Try the exact slug match (covers all current sellers).
   *   2. If that misses, treat the trailing 6-char block as the legacy
   *      random hash, strip it, and look for a unique seller whose slug
   *      begins with the same human-readable base. This safely re-routes
   *      `malika-bhsldi` -> `malika` (or `malika-2`, etc.) without
   *      hijacking unrelated stores when multiple candidates exist.
   */
  private async resolveStoreBySlug(slug: string) {
    const include = {
      storeBanners: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' as const },
      },
    };

    const exact = await this.prisma.sellerProfile.findUnique({
      where: { slug },
      include,
    });
    if (exact) return exact;

    const legacyMatch = slug.match(/^(.+)-[a-z0-9]{6}$/i);
    if (!legacyMatch) return null;

    const base = legacyMatch[1];
    const candidates = await this.prisma.sellerProfile.findMany({
      where: {
        OR: [
          { slug: base },
          { slug: { startsWith: `${base}-` } },
        ],
      },
      include,
      take: 2,
    });

    return candidates.length === 1 ? candidates[0] : null;
  }

  /**
   * Resolve a slug -> sellerId, applying the same legacy-fallback rules as
   * {@link resolveStoreBySlug}. Used by the lighter store endpoints
   * (products, categories, deals, bestsellers) that only need the id.
   */
  private async resolveSellerIdBySlug(slug: string): Promise<string | null> {
    const exact = await this.prisma.sellerProfile.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (exact) return exact.id;

    const legacyMatch = slug.match(/^(.+)-[a-z0-9]{6}$/i);
    if (!legacyMatch) return null;

    const base = legacyMatch[1];
    const candidates = await this.prisma.sellerProfile.findMany({
      where: {
        OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }],
      },
      select: { id: true },
      take: 2,
    });
    return candidates.length === 1 ? candidates[0].id : null;
  }

  async getStoreBySlug(slug: string) {
    const store = await this.resolveStoreBySlug(slug);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Get product count
    const productCount = await this.prisma.product.count({
      where: { sellerId: store.id, isActive: true },
    });

    // Get categories the seller has products in
    const categories = await this.prisma.category.findMany({
      where: {
        products: {
          some: { sellerId: store.id, isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        _count: {
          select: {
            products: {
              where: { sellerId: store.id, isActive: true },
            },
          },
        },
      },
    });

    // Get featured products if any
    let featuredProducts: any[] = [];
    if (store.featuredProductIds.length > 0) {
      featuredProducts = await this.prisma.product.findMany({
        where: {
          id: { in: store.featuredProductIds },
          isActive: true,
        },
        include: { category: true },
      });
      // Sort by the order in featuredProductIds
      featuredProducts = store.featuredProductIds
        .map((id) => featuredProducts.find((p) => p.id === id))
        .filter(Boolean);
    }

    return {
      id: store.id,
      storeName: store.storeName,
      slug: store.slug,
      logo: store.logo,
      description: store.description,
      verified: store.verified,
      location: store.location,
      rating: store.rating,
      totalSales: store.totalSales,
      createdAt: store.createdAt,
      heroBannerUrl: store.heroBannerUrl,
      heroBannerMobile: store.heroBannerMobile,
      aboutTitle: store.aboutTitle,
      aboutDescription: store.aboutDescription,
      storeThemeColor: store.storeThemeColor,
      storeBanners: store.storeBanners,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        productCount: c._count.products,
      })),
      featuredProducts,
      productCount,
    };
  }

  async getStoreProducts(slug: string, query: StoreProductsQueryDto) {
    const sellerId = await this.resolveSellerIdBySlug(slug);

    if (!sellerId) {
      throw new NotFoundException('Store not found');
    }

    const { category, search, sort, page = 1, limit = 20, minPrice, maxPrice, inStock } = query;

    const where: Prisma.ProductWhereInput = {
      sellerId,
      isActive: true,
    };

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice !== undefined) {
      where.price = { ...((where.price as any) || {}), gte: minPrice };
    }

    if (maxPrice !== undefined) {
      where.price = { ...((where.price as any) || {}), lte: maxPrice };
    }

    if (inStock) {
      where.stock = { gt: 0 };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'bestselling':
        orderBy = { reviewCount: 'desc' };
        break;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getStoreCategories(slug: string) {
    const sellerId = await this.resolveSellerIdBySlug(slug);

    if (!sellerId) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.category.findMany({
      where: {
        products: {
          some: { sellerId, isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        _count: {
          select: {
            products: {
              where: { sellerId, isActive: true },
            },
          },
        },
      },
    });
  }

  async getStoreDeals(slug: string, limit = 20) {
    const sellerId = await this.resolveSellerIdBySlug(slug);
    if (!sellerId) {
      throw new NotFoundException('Store not found');
    }

    // Get products with discounts (compareAtPrice > price)
    const products = await this.prisma.product.findMany({
      where: {
        sellerId,
        isActive: true,
        compareAtPrice: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      include: { category: true },
    });

    // Filter to only include actual deals where compareAtPrice > price
    return products
      .filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
      .slice(0, limit);
  }

  async getStoreBestsellers(slug: string, limit = 10) {
    const sellerId = await this.resolveSellerIdBySlug(slug);

    if (!sellerId) {
      throw new NotFoundException('Store not found');
    }

    // Get bestsellers based on order count
    const bestsellers = await this.prisma.product.findMany({
      where: {
        sellerId,
        isActive: true,
      },
      orderBy: [{ reviewCount: 'desc' }, { rating: 'desc' }],
      take: limit,
      include: { category: true },
    });

    return bestsellers;
  }

  // ─── Authenticated Methods (for seller dashboard) ───

  async getOwnStoreSettings(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        storeBanners: {
          orderBy: { sortOrder: 'asc' },
        },
        products: {
          where: { isActive: true },
          select: { id: true, name: true, images: true, price: true },
          take: 100,
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    return {
      heroBannerUrl: seller.heroBannerUrl,
      heroBannerMobile: seller.heroBannerMobile,
      aboutTitle: seller.aboutTitle,
      aboutDescription: seller.aboutDescription,
      storeThemeColor: seller.storeThemeColor,
      featuredProductIds: seller.featuredProductIds,
      storeBanners: seller.storeBanners,
      availableProducts: seller.products,
      storeUrl: `${this.storefrontOrigin}/stores/${seller.slug}`,
    };
  }

  async updateStoreSettings(userId: string, dto: UpdateStoreSettingsDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: {
        heroBannerUrl: dto.heroBannerUrl,
        heroBannerMobile: dto.heroBannerMobile,
        aboutTitle: dto.aboutTitle,
        aboutDescription: dto.aboutDescription,
        storeThemeColor: dto.storeThemeColor,
      },
      select: {
        heroBannerUrl: true,
        heroBannerMobile: true,
        aboutTitle: true,
        aboutDescription: true,
        storeThemeColor: true,
      },
    });
  }

  async updateFeaturedProducts(userId: string, productIds: string[]) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Verify all products belong to this seller
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        sellerId: seller.id,
        isActive: true,
      },
      select: { id: true },
    });

    const validIds = products.map((p) => p.id);
    const orderedIds = productIds.filter((id) => validIds.includes(id));

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: { featuredProductIds: orderedIds },
      select: { featuredProductIds: true },
    });
  }

  async createStoreBanner(userId: string, dto: CreateStoreBannerDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Get max sort order
    const maxSort = await this.prisma.sellerStoreBanner.aggregate({
      where: { sellerId: seller.id },
      _max: { sortOrder: true },
    });

    return this.prisma.sellerStoreBanner.create({
      data: {
        sellerId: seller.id,
        title: dto.title,
        imageUrl: dto.imageUrl,
        mobileUrl: dto.mobileUrl,
        link: dto.link,
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async updateStoreBanner(userId: string, bannerId: string, dto: UpdateStoreBannerDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const banner = await this.prisma.sellerStoreBanner.findUnique({
      where: { id: bannerId },
    });

    if (!banner || banner.sellerId !== seller.id) {
      throw new ForbiddenException('Banner not found or access denied');
    }

    return this.prisma.sellerStoreBanner.update({
      where: { id: bannerId },
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl,
        mobileUrl: dto.mobileUrl,
        link: dto.link,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async deleteStoreBanner(userId: string, bannerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const banner = await this.prisma.sellerStoreBanner.findUnique({
      where: { id: bannerId },
    });

    if (!banner || banner.sellerId !== seller.id) {
      throw new ForbiddenException('Banner not found or access denied');
    }

    await this.prisma.sellerStoreBanner.delete({
      where: { id: bannerId },
    });

    return { deleted: true };
  }

  async reorderBanners(userId: string, bannerIds: string[]) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Update sort order for each banner
    await Promise.all(
      bannerIds.map((id, index) =>
        this.prisma.sellerStoreBanner.updateMany({
          where: { id, sellerId: seller.id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.prisma.sellerStoreBanner.findMany({
      where: { sellerId: seller.id },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
