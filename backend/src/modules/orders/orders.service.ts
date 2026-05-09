import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notifications/notification.service';
import { FraudDetectionService } from '../notifications/fraud-detection.service';
import { AbandonedCartService } from '../notifications/abandoned-cart.service';
import { LoyaltyService } from '../notifications/loyalty.service';
import { WalletService } from '../wallet/wallet.service';
import { PaymentService } from '../payment/payment.service';
import { CreateOrderDto, OrderItemDto, CheckoutQuoteDto } from './dto/order.dto';
import { resolveVariantPrice } from '../../common/helpers/variant-price';
import {
  type VariantGroup,
  type VariantOption,
  buildVariantLineSnapshot,
  findMatchingOption,
  optionMatchesVariantToken,
  parseVariantTokens,
} from '../../common/helpers/variant-selection';
import {
  type CouponScopeLine,
  discountFromCoupon,
  eligibleSubtotalForCoupon,
} from '../../common/helpers/coupon-order';
import { gstAmountFromInclusive } from '@xelnova/utils';
import { buildCancellationNotifyParams } from '../../common/helpers/order-cancel-notify';

import { OrderStatus } from '@prisma/client';

export type RefundDestination = 'WALLET' | 'SOURCE';

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
    const parts = parseVariantTokens(variantStr);
    for (const group of variants as VariantGroup[]) {
      const opt = findMatchingOption(group, parts);
      if (opt && typeof opt.stock === 'number') {
        available = Math.min(available, opt.stock);
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
    private readonly walletService: WalletService,
    private readonly paymentService: PaymentService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: true,
                xelnovaProductId: true,
                isReturnable: true,
                isReplaceable: true,
                returnWindow: true,
                replacementWindow: true,
              },
            },
          },
        },
        shippingAddress: true,
        shipment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrderNumber(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: true,
                xelnovaProductId: true,
                isReturnable: true,
                isReplaceable: true,
                returnWindow: true,
                replacementWindow: true,
              },
            },
          },
        },
        shippingAddress: true,
        shipment: true,
      },
    });
    if (!order || order.userId !== userId) return null;
    return order;
  }

  async quoteCheckout(userId: string, dto: CheckoutQuoteDto) {
    const { inclusiveSubtotal, taxableSubtotal, scopeLines } = await this.buildOrderLineDraft(
      dto.items,
      { checkStock: false },
    );

    const { discount } = await this.validateCouponAndDiscount(
      userId,
      dto.couponCode,
      inclusiveSubtotal,
      scopeLines,
    );

    const shipping = await this.getShippingRate(inclusiveSubtotal);
    const tax = Math.round(inclusiveSubtotal - taxableSubtotal);
    const total = inclusiveSubtotal - discount + shipping;

    return {
      subtotal: inclusiveSubtotal,
      discount,
      shipping,
      tax,
      total,
      couponCode: dto.couponCode?.trim() ? dto.couponCode.trim().toUpperCase() : null,
    };
  }

  async create(userId: string, dto: CreateOrderDto) {
    // Phone-only signups land here without a name/email on record. The
    // checkout form captures both so we update the User profile in-place
    // (without overwriting values the user already set).
    if (dto.customerName?.trim() || dto.customerEmail?.trim()) {
      await this.upsertCustomerContact(userId, dto.customerName, dto.customerEmail);
    }

    const { orderItems, productUpdates, inclusiveSubtotal, taxableSubtotal, scopeLines } =
      await this.buildOrderLineDraft(dto.items, { checkStock: true });

    const subtotal = inclusiveSubtotal;

    const { discount, appliedCode } = await this.validateCouponAndDiscount(
      userId,
      dto.couponCode,
      inclusiveSubtotal,
      scopeLines,
    );

    if (appliedCode) {
      const couponRow = await this.prisma.coupon.findUnique({ where: { code: appliedCode } });
      if (couponRow) {
        await this.prisma.coupon.update({
          where: { id: couponRow.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // Shipping eligibility uses the inclusive subtotal so it matches the storefront preview.
    const shipping = await this.getShippingRate(inclusiveSubtotal);
    // Tax is the GST component already inside the inclusive prices — kept on
    // the order purely so invoices/reports can show the breakdown without
    // recomputing from items.
    const tax = Math.round(inclusiveSubtotal - taxableSubtotal);
    // Customer-facing total — `subtotal` is inclusive so don't add `tax` again.
    const total = subtotal - discount + shipping;

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

    const orderItemsForDb = orderItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      price: item.price,
      variant: item.variant,
      variantSku: item.variantSku ?? null,
      variantImage: item.variantImage ?? null,
      variantAttributes: item.variantAttributes ?? undefined,
      hsnCode: item.hsnCode,
      gstRate: item.gstRate,
      sellerId: item.sellerId,
    }));

    const payMethod = (dto.paymentMethod || 'razorpay').toLowerCase();

    let order;

    if (payMethod === 'wallet') {
      await this.walletService.getOrCreateWallet(userId, 'CUSTOMER');
      order = await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { ownerId_ownerType: { ownerId: userId, ownerType: 'CUSTOMER' } },
        });
        // Allow up to ₹1 rounding tolerance so a ₹47.20 wallet can pay a ₹47 cart without failing.
        const ROUNDING_TOLERANCE = 1;
        if (!wallet || wallet.balance + ROUNDING_TOLERANCE < total) {
          throw new BadRequestException(
            `Insufficient wallet balance. Available: ₹${(wallet?.balance ?? 0).toFixed(2)}, required: ₹${total.toFixed(2)}. Please add ₹${(total - (wallet?.balance ?? 0)).toFixed(2)} to continue.`,
          );
        }
        const newBal = wallet.balance - total;
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBal },
        });
        const ord = await tx.order.create({
          data: {
            orderNumber,
            userId,
            subtotal,
            discount,
            shipping,
            tax,
            total,
            status: 'CONFIRMED',
            paymentMethod: 'WALLET',
            paymentStatus: 'PAID',
            shippingAddressId,
            couponCode: dto.couponCode,
            estimatedDelivery,
            items: {
              create: orderItemsForDb,
            },
          },
          include: { items: true, shippingAddress: true },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT',
            amount: total,
            balanceAfter: newBal,
            description: `Order payment ${orderNumber}`,
            referenceType: 'MANUAL',
            referenceId: ord.id,
            createdBy: userId,
          },
        });
        return ord;
      });
    } else if (payMethod === 'cod') {
      order = await this.prisma.order.create({
        data: {
          orderNumber,
          userId,
          subtotal,
          discount,
          shipping,
          tax,
          total,
          status: 'CONFIRMED',
          paymentMethod: 'COD',
          paymentStatus: 'PENDING',
          shippingAddressId,
          couponCode: dto.couponCode,
          estimatedDelivery,
          items: {
            create: orderItemsForDb,
          },
        },
        include: { items: true, shippingAddress: true },
      });
    } else {
      // Card / UPI / Netbanking via Razorpay — unpaid until gateway confirms payment
      order = await this.prisma.order.create({
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
          paymentStatus: 'PENDING',
          shippingAddressId,
          couponCode: dto.couponCode,
          estimatedDelivery,
          items: {
            create: orderItemsForDb,
          },
        },
        include: { items: true, shippingAddress: true },
      });
    }

    // Stock will be decremented only after payment is captured:
    // - For wallet/COD: immediately (payment is instant)
    // - For online payment (Razorpay): after verifyPayment succeeds
    const confirmNow = payMethod === 'wallet' || payMethod === 'cod';
    if (confirmNow) {
      // Deduct stock immediately for wallet and COD
      await this.decrementProductStock(productUpdates);
      this.dispatchOrderPlacedSideEffects(userId, order);
    }

    // Clear user's cart after order is created (regardless of payment status)
    await this.prisma.cartItem.deleteMany({ where: { userId } });

    // Mark abandoned cart reminder as converted (fire-and-forget)
    this.abandonedCartService.markConverted(userId).catch(() => {});

    return order;
  }

  /**
   * Decrement stock on products and variant options.
   * Called after payment is confirmed (immediately for wallet/COD, after gateway verification for online payment).
   */
  private async decrementProductStock(
    productUpdates: Array<{
      productId: string;
      stockDelta: number;
      variantValue?: string;
      variants: unknown;
    }>,
  ): Promise<void> {
    // Decrement stock on products and variant options
    for (const upd of productUpdates) {
      const updateData: Record<string, unknown> = {
        stock: { decrement: upd.stockDelta },
      };

      if (upd.variantValue && Array.isArray(upd.variants)) {
        const parts = parseVariantTokens(upd.variantValue);
        const updatedVariants = (upd.variants as VariantGroup[]).map((group) => {
          if (!Array.isArray(group.options)) return group;
          return {
            ...group,
            options: group.options.map((opt) => {
              let matched = false;
              for (const part of parts) {
                if (optionMatchesVariantToken(opt, part)) {
                  matched = true;
                  break;
                }
              }
              if (matched && typeof opt.stock === 'number') {
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
  }

  /**
   * After Razorpay (or other online) payment is captured: deduct stock and send order emails, notify sellers, etc.
   * Idempotent with verifyPayment: skipped for wallet/COD and safe if payment already PAID from a retry.
   */
  async finalizeOnlineOrderAfterPayment(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.paymentStatus !== 'PAID') return;
    const pm = (order.paymentMethod || '').toLowerCase();
    if (pm === 'wallet' || pm === 'cod') return;

    // Deduct stock for online payments after payment is captured
    await this.decrementStockForOrder(orderId);

    this.dispatchOrderPlacedSideEffects(order.userId, order);
  }

  /**
   * Decrement stock for an order based on its order items.
   * Used for online payments after payment is confirmed.
   */
  async decrementStockForOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      this.logger.warn(`Cannot decrement stock: Order ${orderId} not found`);
      return;
    }

    const productUpdates: Array<{
      productId: string;
      stockDelta: number;
      variantValue?: string;
      variants: unknown;
    }> = [];

    // Rebuild product updates from order items
    for (const item of order.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: { variants: true },
      });

      if (!product) {
        this.logger.warn(`Product ${item.productId} not found when decrementing stock for order ${orderId}`);
        continue;
      }

      productUpdates.push({
        productId: item.productId,
        stockDelta: item.quantity,
        variantValue: item.variant || undefined,
        variants: product.variants,
      });
    }

    await this.decrementProductStock(productUpdates);
  }

  private dispatchOrderPlacedSideEffects(
    userId: string,
    order: {
      id: string;
      orderNumber: string;
      total: number;
      items: { productName: string; quantity: number; price: number; productId: string }[];
    },
  ) {
    this.sendOrderConfirmationEmail(userId, order).catch((err) =>
      this.logger.warn(`Failed to send order confirmation email: ${err.message}`),
    );

    this.notificationService.notifyOrderPlaced(userId, order.orderNumber, order.total).catch((err) =>
      this.logger.warn(`Failed to send order-placed notification: ${err.message}`),
    );

    this.notifySellerNewOrder(order).catch((err) =>
      this.logger.warn(`Failed to notify sellers for order ${order.orderNumber}: ${err.message}`),
    );

    this.fraudService.evaluateOrder(order.id).catch((err) =>
      this.logger.warn(`Fraud evaluation failed for order ${order.id}: ${err.message}`),
    );

    this.loyaltyService.earnFromOrder(userId, order.total, order.id).catch((err) =>
      this.logger.warn(`Loyalty earn failed for order ${order.id}: ${err.message}`),
    );
  }

  /**
   * Persist name/email collected at checkout for users who signed up by phone.
   * Only fills empty fields; never overrides values the user already saved.
   * Email update is skipped silently if it would collide with another account.
   */
  private async upsertCustomerContact(
    userId: string,
    name?: string,
    email?: string,
  ): Promise<void> {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true },
    });
    if (!current) return;

    const update: { name?: string; email?: string } = {};

    const trimmedName = name?.trim();
    if (trimmedName) {
      update.name = trimmedName;
    }

    const trimmedEmail = email?.trim().toLowerCase();
    if (trimmedEmail && !current.email) {
      // Per-role uniqueness: only block if another row in the SAME role
      // already owns this email. A seller using the same email on the
      // storefront has a separate CUSTOMER account and isn't a conflict.
      const conflict = await this.prisma.user.findFirst({
        where: { email: trimmedEmail, role: current.role, id: { not: userId } },
        select: { id: true },
      });
      if (!conflict) update.email = trimmedEmail;
    }

    if (Object.keys(update).length === 0) return;

    try {
      await this.prisma.user.update({ where: { id: userId }, data: update });
    } catch (err) {
      this.logger.warn(
        `Could not persist checkout contact for user ${userId}: ${(err as Error).message}`,
      );
    }
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

  /**
   * Cancel an order with refund options
   * @param refundTo - 'WALLET' for instant wallet credit, 'SOURCE' for original payment method (5-7 days)
   * @param cancelledBy - Who initiated the cancellation (affects refund destination for seller cancellations)
   */
  async cancelOrder(
    orderNumber: string, 
    userId: string, 
    reason?: string, 
    cancelledBy: 'CUSTOMER' | 'SELLER' | 'ADMIN' = 'CUSTOMER',
    refundTo: RefundDestination = 'WALLET',
  ) {
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

    // Process refund if payment was captured (PAID status)
    let refundResult: { success: boolean; message: string; refundId?: string } | null = null;
    if (order.paymentStatus === 'PAID') {
      const refundAmount = Number(order.total) || 0;
      if (refundAmount > 0) {
        const cancelReason = reason || `Order cancelled by ${cancelledBy.toLowerCase()}`;
        
        // Seller cancellations MUST refund to source (not wallet)
        // Customer can choose, but if SOURCE not available (COD), fall back to wallet
        const actualRefundTo = cancelledBy === 'SELLER' ? 'SOURCE' : refundTo;
        const canRefundToSource = this.paymentService.canRefundToSource(order);

        try {
          if (actualRefundTo === 'SOURCE' && canRefundToSource) {
            // Refund to original payment source via Razorpay
            refundResult = await this.paymentService.refundToSource(order.id, refundAmount, cancelReason);
            this.logger.log(`Source refund of ₹${refundAmount} initiated for order ${orderNumber}`);
          } else {
            // Refund to wallet (instant)
            const walletResult = await this.walletService.refundToWallet(
              order.userId,
              refundAmount,
              orderNumber,
              cancelReason,
            );
            refundResult = { 
              success: walletResult.success, 
              message: walletResult.message,
            };
            this.logger.log(`Wallet refund of ₹${refundAmount} processed for order ${orderNumber}`);
          }
        } catch (err: any) {
          this.logger.error(`Failed to process refund for order ${orderNumber}: ${err.message}`);
          // If source refund fails, try wallet as fallback
          if (actualRefundTo === 'SOURCE') {
            try {
              const walletResult = await this.walletService.refundToWallet(
                order.userId,
                refundAmount,
                orderNumber,
                `${cancelReason} (source refund failed, credited to wallet)`,
              );
              refundResult = { 
                success: walletResult.success, 
                message: `Source refund failed. ${walletResult.message}`,
              };
              this.logger.log(`Fallback wallet refund of ₹${refundAmount} for order ${orderNumber}`);
            } catch (walletErr: any) {
              this.logger.error(`Wallet fallback also failed: ${walletErr.message}`);
            }
          }
        }
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { 
        status: 'CANCELLED',
        paymentStatus: refundResult?.success ? 'REFUNDED' : order.paymentStatus,
      },
      include: {
        items: { include: { product: { select: { name: true, slug: true, images: true, xelnovaProductId: true } } } },
        shippingAddress: true,
      },
    });

    const cancelNotifyParams = buildCancellationNotifyParams(
      order.paymentStatus,
      refundResult,
      Number(order.total) || 0,
    );
    this.notificationService.notifyOrderCancelled(userId, orderNumber, cancelNotifyParams).catch((err) =>
      this.logger.warn(`Failed to send order-cancelled notification: ${err.message}`),
    );

    return { 
      ...updated, 
      refundProcessed: refundResult?.success ?? false, 
      refundMessage: refundResult?.message,
      refundId: refundResult?.refundId,
    };
  }

  /**
   * Check refund options for an order
   */
  async getRefundOptions(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    const canRefundToSource = this.paymentService.canRefundToSource(order);
    const refundAmount = Number(order.total) || 0;

    return {
      orderNumber,
      refundAmount,
      paymentMethod: order.paymentMethod,
      options: [
        {
          destination: 'WALLET',
          available: true,
          label: 'Xelnova Wallet',
          description: 'Instant credit to your wallet. Use for future purchases.',
          timeline: 'Instant',
        },
        {
          destination: 'SOURCE',
          available: canRefundToSource,
          label: 'Original Payment Method',
          description: canRefundToSource 
            ? 'Refund to your bank account/card/UPI used for payment.'
            : order.paymentMethod === 'COD' 
              ? 'Not available for Cash on Delivery orders.'
              : 'Not available for this order.',
          timeline: '5-7 business days',
        },
      ],
    };
  }

  private async getShippingRate(subtotal: number): Promise<number> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const payload = (row?.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, any>;
    const config = payload.shipping as Record<string, any> | undefined;
    const freeShippingMin = Number(config?.freeShippingMin ?? 499);
    const defaultRate = Number(config?.defaultRate ?? 49);
    return subtotal >= freeShippingMin ? 0 : defaultRate;
  }

  private async buildOrderLineDraft(
    items: OrderItemDto[],
    options: { checkStock: boolean },
  ): Promise<{
    orderItems: Array<{
      productId: string;
      productName: string;
      productImage: string;
      quantity: number;
      price: number;
      variant?: string;
      variantSku: string | null;
      variantImage: string | null;
      variantAttributes: Record<string, string> | null;
      gstRate: number;
      hsnCode: string | null;
      sellerId: string | null;
    }>;
    productUpdates: Array<{
      productId: string;
      stockDelta: number;
      variantValue?: string;
      variants: unknown;
    }>;
    inclusiveSubtotal: number;
    taxableSubtotal: number;
    scopeLines: CouponScopeLine[];
  }> {
    const productUpdates: Array<{
      productId: string;
      stockDelta: number;
      variantValue?: string;
      variants: unknown;
    }> = [];

    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (options.checkStock) {
          checkVariantStock(product.stock, product.variants, item.variant, item.quantity, product.name);
        }

        const variantPrice = resolveVariantPrice(product.variants, item.variant);
        const price = variantPrice ?? product.price;

        const snap = buildVariantLineSnapshot(
          product.variants,
          item.variant,
          product.images[0] || null,
        );

        productUpdates.push({
          productId: product.id,
          stockDelta: item.quantity,
          variantValue: item.variant,
          variants: product.variants,
        });

        return {
          productId: item.productId,
          productName: product.name,
          productImage: snap.productImage || product.images[0] || '',
          quantity: item.quantity,
          price,
          variant: item.variant,
          variantSku: snap.variantSku,
          variantImage: item.variant ? snap.productImage : null,
          variantAttributes:
            Object.keys(snap.variantAttributes).length > 0 ? snap.variantAttributes : null,
          gstRate: product.gstRate ?? 18,
          hsnCode: product.hsnCode || null,
          sellerId: product.sellerId,
          categoryId: product.categoryId,
        };
      }),
    );

    const scopeLines: CouponScopeLine[] = orderItems.map((row) => ({
      price: row.price,
      quantity: row.quantity,
      categoryId: row.categoryId,
      sellerId: row.sellerId || '',
    }));

    const inclusiveSubtotal = orderItems.reduce((s, it) => s + it.price * it.quantity, 0);
    const taxableSubtotal = orderItems.reduce(
      (sum, item) =>
        sum + (item.price - gstAmountFromInclusive(item.price, item.gstRate ?? null)) * item.quantity,
      0,
    );

    const stripped = orderItems.map(
      ({
        productId,
        productName,
        productImage,
        quantity,
        price,
        variant,
        variantSku,
        variantImage,
        variantAttributes,
        gstRate,
        hsnCode,
        sellerId,
      }) => ({
        productId,
        productName,
        productImage,
        quantity,
        price,
        variant,
        variantSku,
        variantImage,
        variantAttributes,
        gstRate,
        hsnCode,
        sellerId,
      }),
    );

    return {
      orderItems: stripped,
      productUpdates,
      inclusiveSubtotal,
      taxableSubtotal,
      scopeLines,
    };
  }

  private async validateCouponAndDiscount(
    userId: string,
    couponCode: string | undefined,
    inclusiveSubtotal: number,
    scopeLines: CouponScopeLine[],
  ): Promise<{ discount: number; appliedCode?: string }> {
    const raw = couponCode?.trim();
    if (!raw) {
      return { discount: 0 };
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: raw.toUpperCase() },
    });
    if (!coupon || !coupon.isActive || coupon.moderationStatus !== 'APPROVED') {
      throw new BadRequestException('Invalid or inactive coupon code');
    }
    if (coupon.validUntil && coupon.validUntil < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (coupon.maxRedemptionsPerUser != null) {
      const priorUses = await this.prisma.order.count({
        where: {
          userId,
          couponCode: coupon.code,
          status: { not: 'CANCELLED' },
        },
      });
      if (priorUses >= coupon.maxRedemptionsPerUser) {
        throw new BadRequestException('You have already used this coupon the maximum number of times');
      }
    }

    const eligible = eligibleSubtotalForCoupon(coupon, scopeLines);
    if ((coupon.scope === 'category' && coupon.categoryId) || (coupon.scope === 'seller' && coupon.sellerId)) {
      if (eligible <= 0) {
        throw new BadRequestException('No items in your order match this coupon');
      }
    }
    if (eligible < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon (eligible amount: ₹${Math.round(eligible)})`,
      );
    }

    const discount = discountFromCoupon(coupon, eligible);
    return { discount, appliedCode: coupon.code };
  }
}
