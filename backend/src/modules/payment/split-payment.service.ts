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
   *
   * Commission is per-product: every approved product carries its own
   * `commissionRate` (set by admin at approval time). For backwards
   * compatibility with legacy products that pre-date the per-product model
   * we fall back to the seller's stored `commissionRate`, then to a final
   * 10% safety net so a missing rate never silently zeros the platform fee.
   *
   * The per-seller `commissionRate` reported in the share is the gross-
   * weighted effective rate across that seller's items in this order.
   */
  async computeSellerShares(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                sellerId: true,
                commissionRate: true,
                seller: { select: { commissionRate: true, storeName: true } },
              },
            },
          },
        },
        shipment: {
          select: {
            shippingMode: true,
            courierCharges: true,
            sellerId: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const sellerMap = new Map<string, { gross: number; commission: number; storeName: string }>();

    for (const item of order.items) {
      const sid = item.product.sellerId;
      const rate =
        item.product.commissionRate ?? item.product.seller?.commissionRate ?? 10;
      const name = item.product.seller?.storeName ?? 'Unknown';
      const itemTotal = item.price * item.quantity;
      const itemCommission = itemTotal * (rate / 100);

      const existing = sellerMap.get(sid) || { gross: 0, commission: 0, storeName: name };
      existing.gross += itemTotal;
      existing.commission += itemCommission;
      sellerMap.set(sid, existing);
    }

    const isXelgoCourier = order.shipment?.shippingMode === 'XELNOVA_COURIER';
    const orderCourierCharge = isXelgoCourier
      ? (order.shipment?.courierCharges ?? 0)
      : 0;
    const totalGross = Array.from(sellerMap.values()).reduce((s, d) => s + d.gross, 0);

    const shares = Array.from(sellerMap.entries()).map(([sellerId, data]) => {
      // Allocate courier charge proportionally when multiple sellers share an order
      const courierDeduction =
        orderCourierCharge > 0 && totalGross > 0
          ? Math.round((data.gross / totalGross) * orderCourierCharge * 100) / 100
          : 0;
      const net = data.gross - data.commission - courierDeduction;
      const effectiveRate = data.gross > 0 ? (data.commission / data.gross) * 100 : 0;
      return {
        sellerId,
        storeName: data.storeName,
        gross: data.gross,
        commissionRate: Number(effectiveRate.toFixed(2)),
        commission: data.commission,
        courierDeduction,
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

      const courierNote = share.courierDeduction > 0
        ? `, courier: ₹${share.courierDeduction.toFixed(2)}`
        : '';
      const payout = await this.prisma.payout.create({
        data: {
          sellerId: share.sellerId,
          amount: share.net,
          status: 'PENDING',
          method: 'bank_transfer',
          note: `Settlement for order ${orderNumber} (gross: ₹${share.gross.toFixed(2)}, commission: ₹${share.commission.toFixed(2)}${courierNote})`,
          orderId,
          isAdvance: false,
        },
      });
      payouts.push(payout);
    }

    return { settled: payouts.length, payouts };
  }
}
