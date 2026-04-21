import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto, UpdateCartDto } from './dto/cart.dto';
import {
  resolveVariantCompareAtPrice,
  resolveVariantPrice,
} from '../../common/helpers/variant-price';
import { gstAmountFromInclusive } from '@xelnova/utils';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: true,
            brand: true,
            sellerId: true,
            stock: true,
            gstRate: true,
            variants: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cartItems = items.map((item) => {
      const v = item.variant || '';
      const variants = item.product.variants;
      const price = resolveVariantPrice(variants, v) ?? item.product.price;
      const compareAtPrice =
        resolveVariantCompareAtPrice(variants, v) ?? item.product.compareAtPrice;
      return {
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        productSlug: item.product.slug,
        productImage: item.product.images[0] || '',
        price,
        compareAtPrice,
        quantity: item.quantity,
        variant: item.variant,
        brand: item.product.brand,
        sellerId: item.product.sellerId,
        stock: item.product.stock,
        gstRate: item.product.gstRate,
      };
    });

    // `item.price` is GST-inclusive (the seller-typed value). Subtotal/total
    // are the inclusive amounts the customer pays; `tax` is the GST component
    // already inside subtotal — surfaced for the breakdown only, NOT added on top.
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const { shipping, freeShippingMin } = await this.getShippingRate(subtotal);
    const tax = Math.round(
      cartItems.reduce(
        (sum, item) =>
          sum + gstAmountFromInclusive(item.price, item.gstRate ?? null) * item.quantity,
        0,
      ),
    );
    const total = subtotal + shipping;

    return {
      items: cartItems,
      summary: {
        subtotal,
        discount: 0,
        shipping,
        tax,
        total,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        freeShippingMin,
      },
    };
  }

  private async getShippingRate(subtotal: number): Promise<{ shipping: number; freeShippingMin: number }> {
    const config = await this.getShippingConfig();
    return { 
      shipping: subtotal >= config.freeShippingMin ? 0 : config.defaultRate, 
      freeShippingMin: config.freeShippingMin,
    };
  }

  async getShippingConfig(): Promise<{ freeShippingMin: number; defaultRate: number; expressRate: number; codEnabled: boolean; codFee: number }> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const payload = (row?.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, any>;
    const config = payload.shipping as Record<string, any> | undefined;
    return {
      freeShippingMin: Number(config?.freeShippingMin ?? 499),
      defaultRate: Number(config?.defaultRate ?? 49),
      expressRate: Number(config?.expressRate ?? 99),
      codEnabled: config?.codEnabled !== false,
      codFee: Number(config?.codFee ?? 0),
    };
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId_variant: {
          userId,
          productId: dto.productId,
          variant: dto.variant || '',
        },
      },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          userId,
          productId: dto.productId,
          quantity: dto.quantity,
          variant: dto.variant || '',
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, dto: UpdateCartDto) {
    const item = await this.prisma.cartItem.findFirst({
      where: { userId, productId: dto.productId },
    });
    if (!item) throw new NotFoundException('Item not found in cart');

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: dto.quantity },
      });
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { userId, productId },
    });
    if (!item) throw new NotFoundException('Item not found in cart');

    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.getCart(userId);
  }

  async applyCoupon(userId: string, code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or expired coupon code');
    }
    if (coupon.validUntil && coupon.validUntil < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const cart = await this.getCart(userId);

    // Scope validation: category or seller
    let eligibleSubtotal = cart.summary.subtotal;
    if (coupon.scope === 'category' && coupon.categoryId) {
      const cartItems = await this.prisma.cartItem.findMany({
        where: { userId },
        include: { product: { select: { categoryId: true, price: true, variants: true } } },
      });
      eligibleSubtotal = cartItems
        .filter((ci) => ci.product.categoryId === coupon.categoryId)
        .reduce(
          (sum, ci) =>
            sum +
            (resolveVariantPrice(ci.product.variants, ci.variant || '') ?? ci.product.price) *
              ci.quantity,
          0,
        );
      if (eligibleSubtotal === 0) {
        throw new BadRequestException('No items in your cart match this coupon\'s category');
      }
    } else if (coupon.scope === 'seller' && coupon.sellerId) {
      const cartItems = await this.prisma.cartItem.findMany({
        where: { userId },
        include: { product: { select: { sellerId: true, price: true, variants: true } } },
      });
      eligibleSubtotal = cartItems
        .filter((ci) => ci.product.sellerId === coupon.sellerId)
        .reduce(
          (sum, ci) =>
            sum +
            (resolveVariantPrice(ci.product.variants, ci.variant || '') ?? ci.product.price) *
              ci.quantity,
          0,
        );
      if (eligibleSubtotal === 0) {
        throw new BadRequestException('No items in your cart match this coupon\'s seller');
      }
    }

    if (eligibleSubtotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
      );
    }

    let discount: number;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.min(
        Math.round((eligibleSubtotal * coupon.discountValue) / 100),
        coupon.maxDiscount || Infinity,
      );
    } else {
      discount = Math.min(coupon.discountValue, eligibleSubtotal);
    }

    // Subtotal is GST-inclusive (see getCart). `tax` is the GST portion
    // already inside the discounted subtotal — kept for the breakdown only.
    const subtotal = cart.summary.subtotal;
    const { shipping } = await this.getShippingRate(subtotal);
    const discountRatio = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
    const tax = Math.round(
      cart.items.reduce((sum: number, item: any) => {
        const lineGst = gstAmountFromInclusive(item.price, item.gstRate ?? null) * item.quantity;
        return sum + lineGst * discountRatio;
      }, 0),
    );
    const total = subtotal - discount + shipping;

    return {
      ...cart,
      coupon: { code: coupon.code, discount, scope: coupon.scope },
      summary: {
        ...cart.summary,
        discount,
        tax,
        total,
      },
    };
  }
}
