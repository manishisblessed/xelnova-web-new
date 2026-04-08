import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface FraudRule {
  name: string;
  check: (ctx: FraudContext) => boolean;
  score: number;
}

interface FraudContext {
  userId: string;
  orderTotal: number;
  paymentMethod: string | null;
  recentOrderCount: number;
  recentOrdersValue: number;
  shippingCity: string;
  billingCity: string;
  isNewUser: boolean;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  private readonly rules: FraudRule[] = [
    {
      name: 'HIGH_VALUE_COD',
      check: (ctx) => ctx.paymentMethod === 'COD' && ctx.orderTotal > 10000,
      score: 30,
    },
    {
      name: 'VELOCITY_5_ORDERS_1H',
      check: (ctx) => ctx.recentOrderCount >= 5,
      score: 40,
    },
    {
      name: 'HIGH_VELOCITY_VALUE',
      check: (ctx) => ctx.recentOrdersValue > 50000,
      score: 25,
    },
    {
      name: 'NEW_USER_HIGH_VALUE',
      check: (ctx) => ctx.isNewUser && ctx.orderTotal > 5000,
      score: 20,
    },
    {
      name: 'ADDRESS_MISMATCH',
      check: (ctx) => {
        if (!ctx.shippingCity || !ctx.billingCity) return false;
        return ctx.shippingCity.toLowerCase() !== ctx.billingCity.toLowerCase();
      },
      score: 15,
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async evaluateOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, createdAt: true } },
        shippingAddress: { select: { city: true } },
      },
    });
    if (!order) return null;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOrders = await this.prisma.order.findMany({
      where: {
        userId: order.userId,
        createdAt: { gt: oneHourAgo },
        id: { not: orderId },
      },
      select: { total: true },
    });

    const isNewUser = (Date.now() - order.user.createdAt.getTime()) < 24 * 60 * 60 * 1000;

    const ctx: FraudContext = {
      userId: order.userId,
      orderTotal: order.total,
      paymentMethod: order.paymentMethod,
      recentOrderCount: recentOrders.length,
      recentOrdersValue: recentOrders.reduce((s, o) => s + o.total, 0),
      shippingCity: order.shippingAddress?.city || '',
      billingCity: order.shippingAddress?.city || '',
      isNewUser,
    };

    const triggered: string[] = [];
    let totalScore = 0;

    for (const rule of this.rules) {
      if (rule.check(ctx)) {
        triggered.push(rule.name);
        totalScore += rule.score;
      }
    }

    if (triggered.length === 0) return null;

    const flag = await this.prisma.fraudFlag.create({
      data: {
        orderId,
        userId: order.userId,
        rules: triggered,
        riskScore: Math.min(totalScore, 100),
        status: 'PENDING',
      },
    });

    this.logger.warn(`Fraud flag created for order ${orderId}: score=${totalScore}, rules=${triggered.join(',')}`);
    return flag;
  }

  async getPendingFlags(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [flags, total] = await Promise.all([
      this.prisma.fraudFlag.findMany({
        where: { status: 'PENDING' },
        orderBy: { riskScore: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.fraudFlag.count({ where: { status: 'PENDING' } }),
    ]);
    return { flags, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getAllFlags(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [flags, total] = await Promise.all([
      this.prisma.fraudFlag.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.fraudFlag.count(),
    ]);
    return { flags, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async reviewFlag(flagId: string, status: 'CLEARED' | 'BLOCKED', adminNote: string, reviewedBy: string) {
    const flag = await this.prisma.fraudFlag.findUnique({ where: { id: flagId } });
    if (!flag) throw new Error('Flag not found');

    const updated = await this.prisma.fraudFlag.update({
      where: { id: flagId },
      data: { status, adminNote, reviewedBy, reviewedAt: new Date() },
    });

    if (status === 'BLOCKED') {
      await this.prisma.order.update({
        where: { id: flag.orderId },
        data: { status: 'CANCELLED' },
      });
    }

    return updated;
  }
}
