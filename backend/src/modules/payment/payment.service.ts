import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private razorpay: Razorpay | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const keyId = this.config.get('RAZORPAY_KEY_ID');
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET');
    if (keyId && keySecret) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }

  private getRazorpay(): Razorpay {
    if (!this.razorpay) throw new BadRequestException('Payment gateway not configured');
    return this.razorpay;
  }

  async createOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new BadRequestException('Not your order');

    const razorpayOrder = await this.getRazorpay().orders.create({
      amount: Math.round(order.total * 100),
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId: order.id, userId },
    });

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
      }
    }

    return { received: true };
  }

  async refund(orderId: string, amount?: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.paymentId) throw new NotFoundException('Order/Payment not found');

    const refundAmount = amount ? Math.round(amount * 100) : Math.round(order.total * 100);

    const refund = await this.getRazorpay().payments.refund(order.paymentId, {
      amount: refundAmount,
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' },
    });

    return { refundId: refund.id, amount: refundAmount / 100 };
  }
}
