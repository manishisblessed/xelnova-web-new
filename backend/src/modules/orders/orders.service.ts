import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notifications/notification.service';
import { FraudDetectionService } from '../notifications/fraud-detection.service';
import { AbandonedCartService } from '../notifications/abandoned-cart.service';
import { LoyaltyService } from '../notifications/loyalty.service';
import { CreateOrderDto } from './dto/order.dto';

import { OrderStatus } from '@prisma/client';

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'CONFIRMED', 'CANCELLED'],
  PROCESSING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED', 'REFUNDED'],
  CANCELLED: [],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export function isValidOrderTransition(from: string, to: string): boolean {
  return VALID_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

interface VariantOption {
  value: string;
  price?: number;
  stock?: number;
  [key: string]: unknown;
}

interface VariantGroup {
  type: string;
  options: VariantOption[];
  [key: string]: unknown;
}

/**
 * Given a product's `variants` JSON and a dash-separated variant string from the
 * client (e.g. "red-l"), resolve the effective price. Returns `undefined` when no
 * option-level price override exists.
 */
function resolveVariantPrice(variants: unknown, variantStr: string | undefined): number | undefined {
  if (!variantStr || !Array.isArray(variants)) return undefined;
  const parts = new Set(variantStr.split('-'));
  for (const group of variants as VariantGroup[]) {
    if (!Array.isArray(group?.options)) continue;
    for (const opt of group.options) {
      if (parts.has(opt.value) && typeof opt.price === 'number') return opt.price;
    }
  }
  return undefined;
}

/**
 * Check that the requested quantity does not exceed available stock.
 * If the variant option has its own `stock`, use that; otherwise fall back to product stock.
 */
function checkVariantStock(
  productStock: number,
  variants: unknown,
  variantStr: string | undefined,
  requestedQty: number,
  productName: string,
): void {
  let available = productStock;
  if (variantStr && Array.isArray(variants)) {
    const parts = new Set(variantStr.split('-'));
    for (const group of variants as VariantGroup[]) {
      if (!Array.isArray(group?.options)) continue;
      for (const opt of group.options) {
        if (parts.has(opt.value) && typeof opt.stock === 'number') {
          available = Math.min(available, opt.stock);
        }
      }
    }
  }
  if (requestedQty > available) {
    throw new BadRequestException(
      `Insufficient stock for "${productName}"${variantStr ? ` (${variantStr})` : ''}: requested ${requestedQty}, available ${available}`,
    );
  }
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly fraudService: FraudDetectionService,
    private readonly abandonedCartService: AbandonedCartService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrderNumber(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        shippingAddress: true,
      },
    });
    if (!order || order.userId !== userId) return null;
    return order;
  }

  async create(userId: string, dto: CreateOrderDto) {
    const productUpdates: Array<{
      productId: string;
      stockDelta: number;
      variantValue?: string;
      variants: unknown;
    }> = [];

    const orderItems = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        checkVariantStock(product.stock, product.variants, item.variant, item.quantity, product.name);

        const variantPrice = resolveVariantPrice(product.variants, item.variant);
        const price = variantPrice ?? product.price;

        productUpdates.push({
          productId: product.id,
          stockDelta: item.quantity,
          variantValue: item.variant,
          variants: product.variants,
        });

        return {
          productId: item.productId,
          productName: product.name,
          productImage: product.images[0] || '',
          quantity: item.quantity,
          price,
          variant: item.variant,
          gstRate: product.gstRate ?? 18,
        };
      }),
    );

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    let discount = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.toUpperCase() },
      });
      if (coupon && coupon.isActive) {
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          // Coupon exhausted — skip silently
        } else {
          if (coupon.discountType === 'PERCENTAGE') {
            discount = Math.min(
              Math.round((subtotal * coupon.discountValue) / 100),
              coupon.maxDiscount || Infinity,
            );
          } else {
            discount = Math.min(coupon.discountValue, subtotal);
          }
          // Increment usage count
          await this.prisma.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }

    const shipping = await this.getShippingRate(subtotal);
    const discountRatio = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
    const tax = Math.round(
      orderItems.reduce((sum, item) => {
        const lineTotal = item.price * item.quantity * discountRatio;
        return sum + lineTotal * ((item.gstRate ?? 18) / 100);
      }, 0),
    );
    const total = subtotal - discount + shipping + tax;

    const orderNumber = `XN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    let shippingAddressId: string | undefined;

    const existingAddress = await this.prisma.address.findFirst({
      where: {
        userId,
        addressLine1: dto.shippingAddress.addressLine1,
        pincode: dto.shippingAddress.pincode,
      },
    });

    if (existingAddress) {
      shippingAddressId = existingAddress.id;
    } else {
      const VALID_TYPES = ['HOME', 'OFFICE', 'OTHER'] as const;
      const TYPE_ALIASES: Record<string, (typeof VALID_TYPES)[number]> = { WORK: 'OFFICE' };
      const rawType = dto.shippingAddress.type?.toUpperCase() || 'HOME';
      const addrType = VALID_TYPES.includes(rawType as any) ? rawType : (TYPE_ALIASES[rawType] || 'HOME');

      const newAddress = await this.prisma.address.create({
        data: {
          userId,
          fullName: dto.shippingAddress.fullName,
          phone: dto.shippingAddress.phone,
          addressLine1: dto.shippingAddress.addressLine1,
          addressLine2: dto.shippingAddress.addressLine2,
          city: dto.shippingAddress.city,
          state: dto.shippingAddress.state,
          pincode: dto.shippingAddress.pincode,
          landmark: dto.shippingAddress.landmark,
          type: addrType as any,
        },
      });
      shippingAddressId = newAddress.id;
    }

    const orderItemsForDb = orderItems.map(({ gstRate: _gst, ...rest }) => rest);

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        status: 'PROCESSING',
        paymentMethod: dto.paymentMethod,
        shippingAddressId,
        couponCode: dto.couponCode,
        estimatedDelivery,
        items: {
          create: orderItemsForDb,
        },
      },
      include: { items: true, shippingAddress: true },
    });

    // Decrement stock on products and variant options
    for (const upd of productUpdates) {
      const updateData: Record<string, unknown> = {
        stock: { decrement: upd.stockDelta },
      };

      if (upd.variantValue && Array.isArray(upd.variants)) {
        const parts = new Set(upd.variantValue.split('-'));
        const updatedVariants = (upd.variants as VariantGroup[]).map((group) => {
          if (!Array.isArray(group.options)) return group;
          return {
            ...group,
            options: group.options.map((opt) => {
              if (parts.has(opt.value) && typeof opt.stock === 'number') {
                return { ...opt, stock: Math.max(0, opt.stock - upd.stockDelta) };
              }
              return opt;
            }),
          };
        });
        updateData.variants = updatedVariants;
      }

      await this.prisma.product.update({
        where: { id: upd.productId },
        data: updateData as any,
      });
    }

    // Clear user's cart after order
    await this.prisma.cartItem.deleteMany({ where: { userId } });

    // Mark abandoned cart reminder as converted (fire-and-forget)
    this.abandonedCartService.markConverted(userId).catch(() => {});

    // Send order confirmation email (fire-and-forget)
    this.sendOrderConfirmationEmail(userId, order).catch((err) =>
      this.logger.warn(`Failed to send order confirmation email: ${err.message}`),
    );

    // In-app notification + SMS for customer (fire-and-forget)
    this.notificationService.notifyOrderPlaced(userId, order.orderNumber, order.total).catch((err) =>
      this.logger.warn(`Failed to send order-placed notification: ${err.message}`),
    );

    // Notify sellers about new order (fire-and-forget)
    this.notifySellerNewOrder(order).catch((err) =>
      this.logger.warn(`Failed to notify sellers for order ${order.orderNumber}: ${err.message}`),
    );

    // Fraud detection (fire-and-forget)
    this.fraudService.evaluateOrder(order.id).catch((err) =>
      this.logger.warn(`Fraud evaluation failed for order ${order.id}: ${err.message}`),
    );

    // Earn loyalty points (fire-and-forget)
    this.loyaltyService.earnFromOrder(userId, order.total, order.id).catch((err) =>
      this.logger.warn(`Loyalty earn failed for order ${order.id}: ${err.message}`),
    );

    return order;
  }

  private async sendOrderConfirmationEmail(
    userId: string,
    order: { orderNumber: string; total: number; items: { productName: string; quantity: number; price: number }[] },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;

    await this.emailService.sendOrderConfirmation(user.email, user.name, {
      orderNumber: order.orderNumber,
      total: order.total,
      items: order.items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        price: i.price,
      })),
    });
  }

  private async notifySellerNewOrder(order: { orderNumber: string; total: number; items: { productId: string; price: number; quantity: number }[] }) {
    const productIds = order.items.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, sellerId: true },
    });

    const sellerAmounts = new Map<string, number>();
    for (const item of order.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product?.sellerId) {
        const current = sellerAmounts.get(product.sellerId) || 0;
        sellerAmounts.set(product.sellerId, current + item.price * item.quantity);
      }
    }

    for (const [sellerId, amount] of sellerAmounts) {
      this.notificationService
        .notifyNewOrder(sellerId, order.orderNumber, amount)
        .catch((err) => this.logger.warn(`Failed to notify seller ${sellerId}: ${err.message}`));
    }
  }

  private static readonly CANCELLABLE_STATUSES = ['PENDING', 'PROCESSING', 'CONFIRMED'];

  async cancelOrder(orderNumber: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (!OrdersService.CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Order cannot be cancelled — it is already ${order.status.toLowerCase()}. ` +
        `Only orders in Pending, Processing, or Confirmed status can be cancelled.`,
      );
    }

    // Restore stock for each item (product-level + variant-level)
    for (const item of order.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId }, select: { variants: true, stock: true } });
      if (!product) continue;

      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });

      if (item.variant && product.variants && Array.isArray(product.variants)) {
        const variants = product.variants as VariantGroup[];
        for (const group of variants) {
          if (!Array.isArray(group.options)) continue;
          const opt = group.options.find((o: VariantOption) => o.value === item.variant);
          if (opt && typeof opt.stock === 'number') {
            opt.stock += item.quantity;
          }
        }
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { variants: variants as any },
        });
      }
    }

    // Restore coupon usage if one was applied
    if (order.couponCode) {
      await this.prisma.coupon.updateMany({
        where: { code: order.couponCode, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        shippingAddress: true,
      },
    });

    this.notificationService.notifyOrderCancelled(userId, orderNumber, Number(updated.total) || 0).catch((err) =>
      this.logger.warn(`Failed to send order-cancelled notification: ${err.message}`),
    );

    return updated;
  }

  private async getShippingRate(subtotal: number): Promise<number> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const payload = (row?.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, any>;
    const config = payload.shipping as Record<string, any> | undefined;
    const freeShippingMin = Number(config?.freeShippingMin ?? 499);
    const defaultRate = Number(config?.defaultRate ?? 49);
    return subtotal >= freeShippingMin ? 0 : defaultRate;
  }
}
