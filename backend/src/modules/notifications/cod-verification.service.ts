import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodVerificationService {
  private readonly logger = new Logger(CodVerificationService.name);
  private readonly otpStore = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a 6-digit OTP for COD delivery verification.
   * The delivery agent shows this to the customer, or the customer enters it.
   */
  async generateDeliveryOtp(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, paymentMethod: true, status: true, userId: true },
    });

    if (!order) throw new BadRequestException('Order not found');
    if (order.paymentMethod !== 'COD') throw new BadRequestException('OTP verification is only for COD orders');
    if (order.status !== 'SHIPPED' && order.status !== 'CONFIRMED') {
      throw new BadRequestException('Order must be shipped or confirmed for delivery OTP');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(orderId, {
      otp,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      attempts: 0,
    });

    this.logger.log(`COD delivery OTP generated for order ${order.orderNumber}`);

    return {
      orderId,
      orderNumber: order.orderNumber,
      otpGenerated: true,
      ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
    };
  }

  /**
   * Verify the delivery OTP. On success, mark order as DELIVERED.
   */
  async verifyDeliveryOtp(orderId: string, otp: string) {
    const stored = this.otpStore.get(orderId);
    if (!stored) throw new BadRequestException('No OTP generated for this order. Please generate one first.');

    if (stored.expiresAt < new Date()) {
      this.otpStore.delete(orderId);
      throw new BadRequestException('OTP has expired. Please generate a new one.');
    }

    if (stored.attempts >= 5) {
      this.otpStore.delete(orderId);
      throw new BadRequestException('Too many attempts. Please generate a new OTP.');
    }

    stored.attempts++;

    if (stored.otp !== otp) {
      throw new BadRequestException(`Invalid OTP. ${5 - stored.attempts} attempts remaining.`);
    }

    this.otpStore.delete(orderId);

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        paymentStatus: 'PAID',
      },
      select: { id: true, orderNumber: true, status: true, paymentStatus: true },
    });

    return { verified: true, order };
  }

  /**
   * Assess COD risk for an order based on simple heuristics.
   */
  async assessCodRisk(userId: string, orderTotal: number) {
    const [totalOrders, codOrders, cancelledCodOrders] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.count({ where: { userId, paymentMethod: 'COD' } }),
      this.prisma.order.count({ where: { userId, paymentMethod: 'COD', status: 'CANCELLED' } }),
    ]);

    let riskScore = 0;
    const reasons: string[] = [];

    if (totalOrders === 0) {
      riskScore += 20;
      reasons.push('First-time buyer');
    }

    if (orderTotal > 10000) {
      riskScore += 25;
      reasons.push('High-value COD order');
    }

    if (codOrders > 0 && cancelledCodOrders / codOrders > 0.3) {
      riskScore += 35;
      reasons.push('High COD cancellation rate');
    }

    if (orderTotal > 25000) {
      riskScore += 20;
      reasons.push('Very high order value');
    }

    const riskLevel = riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      reasons,
      recommendation: riskLevel === 'HIGH' ? 'BLOCK_COD' : riskLevel === 'MEDIUM' ? 'REQUIRE_OTP' : 'ALLOW',
    };
  }
}
