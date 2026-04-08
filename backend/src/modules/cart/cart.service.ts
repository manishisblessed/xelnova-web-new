import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto, UpdateCartDto } from './dto/cart.dto';

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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cartItems = items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      productSlug: item.product.slug,
      productImage: item.product.images[0] || '',
      price: item.product.price,
      compareAtPrice: item.product.compareAtPrice,
      quantity: item.quantity,
      variant: item.variant,
      brand: item.product.brand,
      sellerId: item.product.sellerId,
      stock: item.product.stock,
    }));

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const shipping = subtotal > 499 ? 0 : 49;
    const tax = Math.round((subtotal) * 0.18);
    const total = subtotal + shipping + tax;

    return {
      items: cartItems,
      summary: {
        subtotal,
        discount: 0,
        shipping,
        tax,
        total,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      },
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
        include: { product: { select: { categoryId: true, price: true } } },
      });
      eligibleSubtotal = cartItems
        .filter((ci) => ci.product.categoryId === coupon.categoryId)
        .reduce((sum, ci) => sum + ci.product.price * ci.quantity, 0);
      if (eligibleSubtotal === 0) {
        throw new BadRequestException('No items in your cart match this coupon\'s category');
      }
    } else if (coupon.scope === 'seller' && coupon.sellerId) {
      const cartItems = await this.prisma.cartItem.findMany({
        where: { userId },
        include: { product: { select: { sellerId: true, price: true } } },
      });
      eligibleSubtotal = cartItems
        .filter((ci) => ci.product.sellerId === coupon.sellerId)
        .reduce((sum, ci) => sum + ci.product.price * ci.quantity, 0);
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

    const subtotal = cart.summary.subtotal;
    const shipping = subtotal > 499 ? 0 : 49;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = subtotal - discount + shipping + tax;

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
