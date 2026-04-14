import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private razorpay: Razorpay | null = null;
  private readonly isTestMode: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    const keyId = this.config.get('RAZORPAY_KEY_ID') || '';
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET') || '';
    const isPlaceholder = (v: string) => !v || v.startsWith('your-') || v === 'test' || v.length < 10;

    this.isTestMode = keyId.startsWith('rzp_test_');
    const isLive = keyId.startsWith('rzp_live_');

    if (isLive && process.env.NODE_ENV !== 'production') {
      console.error(
        '[PAYMENT] DANGER: Live Razorpay keys detected in non-production environment! ' +
        'Real money will be charged. Switch to test keys (rzp_test_...) immediately.',
      );
    }

    if (isLive) {
      console.warn('[PAYMENT] Razorpay is running in LIVE mode — real transactions will be processed.');
    } else if (this.isTestMode) {
      console.log('[PAYMENT] Razorpay is running in TEST mode — no real money will be charged.');
    }

    if (!isPlaceholder(keyId) && !isPlaceholder(keySecret)) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    } else {
      console.warn('[PAYMENT] Razorpay keys not configured or placeholder — payments will be unavailable');
    }
  }

  private getRazorpay(): Razorpay {
    if (!this.razorpay) {
      throw new BadRequestException(
        'Payment gateway is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.',
      );
    }
    return this.razorpay;
  }

  async createOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new BadRequestException('Not your order');

    // Check if order is already paid
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Order is already paid');
    }

    const amountInPaise = Math.round(Number(order.total) * 100);
    this.logger.log(`Creating payment for order ${orderId}: total=${order.total}, amountInPaise=${amountInPaise}`);
    
    if (!amountInPaise || amountInPaise < 100) {
      throw new BadRequestException(`Invalid order total for payment: ₹${order.total} (${amountInPaise} paise)`);
    }

    let razorpayOrder;
    try {
      razorpayOrder = await this.getRazorpay().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: { orderId: order.id, userId },
      });
      this.logger.log(`Razorpay order created: ${razorpayOrder.id} for ${amountInPaise} paise`);
    } catch (err: any) {
      const msg = err?.error?.description || err?.message || 'Unknown Razorpay error';
      this.logger.error(`Razorpay order creation failed for order ${orderId}:`, { amountInPaise, error: err });
      throw new BadRequestException(`Payment gateway error: ${msg}`);
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentId: razorpayOrder.id },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: order.id,
      keyId: this.config.get('RAZORPAY_KEY_ID'),
      testMode: this.isTestMode,
    };
  }

  async verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const secret = this.config.get('RAZORPAY_KEY_SECRET') || '';
    const body = payload.razorpay_order_id + '|' + payload.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== payload.razorpay_signature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const order = await this.prisma.order.findFirst({
      where: { paymentId: payload.razorpay_order_id },
    });

    if (!order) throw new NotFoundException('Order not found for this payment');

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        paymentId: payload.razorpay_payment_id,
        status: 'CONFIRMED',
      },
    });

    // Send payment success notification (In-app + SMS)
    this.notificationService
      .notifyPaymentSuccessful(order.userId, order.orderNumber, Number(order.total))
      .catch((err) => this.logger.warn(`Payment success notification failed: ${err.message}`));

    return { verified: true, orderId: order.id };
  }

  async handleWebhook(body: any, signature: string) {
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET') || '';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;
    const payment = body.payload?.payment?.entity;

    if (event === 'payment.captured' && payment) {
      const order = await this.prisma.order.findFirst({
        where: { paymentId: payment.order_id },
      });
      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        });

        // Send payment success notification
        this.notificationService
          .notifyPaymentSuccessful(order.userId, order.orderNumber, Number(order.total))
          .catch((err) => this.logger.warn(`Payment webhook notification failed: ${err.message}`));
      }
    }

    if (event === 'payment.failed' && payment) {
      const order = await this.prisma.order.findFirst({
        where: { paymentId: payment.order_id },
      });
      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' },
        });

        // Send payment failed notification
        this.notificationService
          .notifyPaymentFailed(order.userId, order.orderNumber, order.id)
          .catch((err) => this.logger.warn(`Payment failed notification failed: ${err.message}`));
      }
    }

    return { received: true };
  }

  /**
   * Refund to original payment source via Razorpay
   * Used when seller cancels or customer chooses "refund to source"
   */
  async refundToSource(orderId: string, amount?: number, reason?: string): Promise<{
    success: boolean;
    refundId?: string;
    amount: number;
    message: string;
  }> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    
    if (order.paymentStatus !== 'PAID') {
      return { success: false, amount: 0, message: 'Order payment was not captured, no refund needed' };
    }

    if (!order.paymentId) {
      throw new BadRequestException('No payment ID found for this order. Cannot process refund to source.');
    }

    // COD orders cannot be refunded to source
    if (order.paymentMethod === 'COD') {
      throw new BadRequestException('COD orders cannot be refunded to payment source. Use wallet refund instead.');
    }

    const refundAmount = amount ? Math.round(amount * 100) : Math.round(Number(order.total) * 100);

    try {
      const refund = await this.getRazorpay().payments.refund(order.paymentId, {
        amount: refundAmount,
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: reason || 'Order cancelled',
        },
      });

      await this.prisma.order.update({
        where: { id: orderId },
        data: { 
          paymentStatus: 'REFUNDED', 
          status: 'REFUNDED',
        },
      });

      this.logger.log(`Razorpay refund processed: ${refund.id} for order ${order.orderNumber}, amount: ₹${refundAmount / 100}`);

      // Notify customer about refund
      this.notificationService.notifyRefundProcessed(
        order.userId, 
        order.orderNumber, 
        refundAmount / 100
      ).catch((err) => this.logger.warn(`Refund notification failed: ${err.message}`));

      return { 
        success: true, 
        refundId: refund.id, 
        amount: refundAmount / 100,
        message: `₹${refundAmount / 100} will be refunded to your original payment method within 5-7 business days`,
      };
    } catch (err: any) {
      const msg = err?.error?.description || err?.message || 'Unknown Razorpay error';
      this.logger.error(`Razorpay refund failed for order ${order.orderNumber}:`, err);
      throw new BadRequestException(`Refund failed: ${msg}`);
    }
  }

  /**
   * Check if order can be refunded to source (not COD, has payment ID)
   */
  canRefundToSource(order: { paymentMethod?: string | null; paymentId?: string | null; paymentStatus?: string }): boolean {
    return (
      order.paymentStatus === 'PAID' &&
      order.paymentMethod !== 'COD' &&
      !!order.paymentId
    );
  }

  /**
   * Legacy refund method for admin (refunds to source)
   */
  async refund(orderId: string, amount?: number) {
    return this.refundToSource(orderId, amount, 'Admin initiated refund');
  }
}
