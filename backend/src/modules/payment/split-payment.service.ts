import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Razorpay from 'razorpay';

@Injectable()
export class SplitPaymentService {
  private readonly logger = new Logger(SplitPaymentService.name);
  private razorpay: Razorpay | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const keyId = this.config.get('RAZORPAY_KEY_ID') || '';
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET') || '';
    const isPlaceholder = (v: string) => !v || v.startsWith('your-') || v === 'test' || v.length < 10;
    if (!isPlaceholder(keyId) && !isPlaceholder(keySecret)) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }

  private getRazorpay(): Razorpay {
    if (!this.razorpay) throw new BadRequestException('Payment gateway not configured');
    return this.razorpay;
  }

  /**
   * Create an advance payout to a seller for an emergency.
   * This records a Payout with isAdvance=true and optionally triggers a Razorpay transfer
   * if the seller has a linked Razorpay account.
   */
  async createAdvancePayout(
    sellerId: string,
    amount: number,
    orderId?: string,
    note?: string,
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: { id: true, storeName: true, bankAccountNumber: true },
    });
    if (!seller) throw new NotFoundException('Seller not found');
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const payout = await this.prisma.payout.create({
      data: {
        sellerId,
        amount,
        status: 'APPROVED',
        method: 'advance_transfer',
        note: note || `Advance payout${orderId ? ` for order ${orderId}` : ''}`,
        isAdvance: true,
        orderId: orderId || null,
      },
    });

    return {
      payoutId: payout.id,
      amount: payout.amount,
      status: payout.status,
      isAdvance: true,
      sellerName: seller.storeName,
    };
  }

  /**
   * After an order is paid, compute seller shares and create pending payouts.
   * Commission is deducted per seller's commissionRate.
   */
  async computeSellerShares(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { sellerId: true, seller: { select: { commissionRate: true, storeName: true } } },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const sellerMap = new Map<string, { gross: number; commissionRate: number; storeName: string }>();

    for (const item of order.items) {
      const sid = item.product.sellerId;
      const rate = item.product.seller?.commissionRate ?? 10;
      const name = item.product.seller?.storeName ?? 'Unknown';
      const itemTotal = item.price * item.quantity;

      const existing = sellerMap.get(sid) || { gross: 0, commissionRate: rate, storeName: name };
      existing.gross += itemTotal;
      sellerMap.set(sid, existing);
    }

    const shares = Array.from(sellerMap.entries()).map(([sellerId, data]) => {
      const commission = data.gross * (data.commissionRate / 100);
      const net = data.gross - commission;
      return {
        sellerId,
        storeName: data.storeName,
        gross: data.gross,
        commissionRate: data.commissionRate,
        commission,
        net,
      };
    });

    return { orderId: order.id, orderNumber: order.orderNumber, total: order.total, shares };
  }

  /**
   * Create settlement payouts for all sellers in an order.
   * Called after order is delivered and payment confirmed.
   */
  async settleOrder(orderId: string) {
    const { shares, orderNumber } = await this.computeSellerShares(orderId);
    const payouts: Array<{
      id: string; sellerId: string; amount: number; status: string;
      method: string; note: string | null; orderId: string | null;
    }> = [];

    for (const share of shares) {
      const existing = await this.prisma.payout.findFirst({
        where: { sellerId: share.sellerId, orderId, isAdvance: false },
      });
      if (existing) continue;

      const payout = await this.prisma.payout.create({
        data: {
          sellerId: share.sellerId,
          amount: share.net,
          status: 'PENDING',
          method: 'bank_transfer',
          note: `Settlement for order ${orderNumber} (gross: ₹${share.gross.toFixed(2)}, commission: ₹${share.commission.toFixed(2)})`,
          orderId,
          isAdvance: false,
        },
      });
      payouts.push(payout);
    }

    return { settled: payouts.length, payouts };
  }
}
