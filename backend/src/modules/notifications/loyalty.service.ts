import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const POINTS_PER_RUPEE = 1;
const REFERRAL_BONUS_POINTS = 200;
const REFERRED_BONUS_POINTS = 100;
const SIGNUP_BONUS_POINTS = 50;
const POINTS_TO_RUPEE_RATIO = 10; // 10 points = ₹1

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const result = await this.prisma.loyaltyLedger.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return { userId, points: result._sum.points || 0 };
  }

  async getLedger(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      this.prisma.loyaltyLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loyaltyLedger.count({ where: { userId } }),
    ]);
    const balance = await this.getBalance(userId);
    return { entries, balance: balance.points, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async earnFromOrder(userId: string, orderTotal: number, orderId: string) {
    const points = Math.floor(orderTotal * POINTS_PER_RUPEE);
    if (points <= 0) return;

    await this.prisma.loyaltyLedger.create({
      data: {
        userId,
        points,
        type: 'EARN',
        description: `Earned from order`,
        referenceId: orderId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    return { points };
  }

  async earnSignupBonus(userId: string) {
    const existing = await this.prisma.loyaltyLedger.findFirst({
      where: { userId, type: 'SIGNUP_BONUS' },
    });
    if (existing) return { points: 0, message: 'Already claimed' };

    await this.prisma.loyaltyLedger.create({
      data: {
        userId,
        points: SIGNUP_BONUS_POINTS,
        type: 'SIGNUP_BONUS',
        description: 'Welcome bonus for signing up',
      },
    });
    return { points: SIGNUP_BONUS_POINTS };
  }

  async redeemPoints(userId: string, points: number) {
    if (points <= 0) throw new BadRequestException('Points must be positive');
    const balance = await this.getBalance(userId);
    if (balance.points < points) throw new BadRequestException('Insufficient loyalty points');

    const discount = points / POINTS_TO_RUPEE_RATIO;

    await this.prisma.loyaltyLedger.create({
      data: {
        userId,
        points: -points,
        type: 'REDEEM',
        description: `Redeemed ${points} points for ₹${discount.toFixed(2)} discount`,
      },
    });

    return { pointsRedeemed: points, discountAmount: discount };
  }

  // ─── Referral ───

  async getOrCreateReferralCode(userId: string) {
    const existing = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const base = (user?.name || 'user').replace(/\s+/g, '').toUpperCase().slice(0, 6);
    const code = `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    return this.prisma.referralCode.create({
      data: { userId, code },
    });
  }

  async applyReferralCode(newUserId: string, code: string) {
    const referral = await this.prisma.referralCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!referral || !referral.isActive) throw new BadRequestException('Invalid referral code');
    if (referral.userId === newUserId) throw new BadRequestException('Cannot use your own referral code');

    const alreadyUsed = await this.prisma.referralUse.findFirst({
      where: { referredUserId: newUserId },
    });
    if (alreadyUsed) throw new BadRequestException('You have already used a referral code');

    // Credit referrer
    await this.prisma.loyaltyLedger.create({
      data: {
        userId: referral.userId,
        points: REFERRAL_BONUS_POINTS,
        type: 'REFERRAL_BONUS',
        description: `Referral bonus — someone joined using your code`,
        referenceId: newUserId,
      },
    });

    // Credit referred user
    await this.prisma.loyaltyLedger.create({
      data: {
        userId: newUserId,
        points: REFERRED_BONUS_POINTS,
        type: 'REFERRED_BONUS',
        description: `Welcome bonus for joining via referral`,
        referenceId: referral.userId,
      },
    });

    await this.prisma.referralUse.create({
      data: {
        referralCodeId: referral.id,
        referredUserId: newUserId,
        pointsAwarded: REFERRAL_BONUS_POINTS + REFERRED_BONUS_POINTS,
      },
    });

    await this.prisma.referralCode.update({
      where: { id: referral.id },
      data: {
        totalUses: { increment: 1 },
        earnedPoints: { increment: REFERRAL_BONUS_POINTS },
      },
    });

    return { referrerPoints: REFERRAL_BONUS_POINTS, referredPoints: REFERRED_BONUS_POINTS };
  }

  async getReferralStats(userId: string) {
    const referral = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (!referral) return { code: null, totalUses: 0, earnedPoints: 0 };
    return { code: referral.code, totalUses: referral.totalUses, earnedPoints: referral.earnedPoints };
  }
}
