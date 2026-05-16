import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessDaysService } from '../../common/services/business-days.service';
import Razorpay from 'razorpay';

/**
 * Flat platform service fee charged once per Xelgo (XELNOVA_COURIER) shipment.
 * Deducted from the seller's settlement payout — NOT debited from the wallet at
 * booking time (the actual courier rate already is, see ShippingService).
 */
export const XELGO_SERVICE_FEE = 30;

/**
 * Number of business days a settlement is held after an order is delivered before
 * the wallet is credited and the seller can withdraw. Business days skip Sundays
 * + entries in the `Holiday` table (admin-managed).
 */
export const SETTLEMENT_HOLD_BUSINESS_DAYS = 7;

@Injectable()
export class SplitPaymentService {
  private readonly logger = new Logger(SplitPaymentService.name);
  private razorpay: Razorpay | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly businessDays: BusinessDaysService,
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
   * After an order is paid, compute each seller's net share.
   *
   * Settlement math (per policy):
   *   net = gross − commission − xelgoServiceFee
   *
   *  - Commission is per-product (`Product.commissionRate`), falling back to the
   *    seller's stored `commissionRate`, then 10% as a final safety net.
   *  - The flat ₹30 Xelgo platform service fee is added once per Xelgo shipment
   *    and allocated proportionally across sellers when an order has multiple.
   *  - The carrier rate itself is NOT subtracted here — it is already debited
   *    from the seller's wallet at booking time (see ShippingService Xelgo
   *    booking flow). Settlement only handles the things that have NOT yet hit
   *    the wallet.
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
    const totalGross = Array.from(sellerMap.values()).reduce((s, d) => s + d.gross, 0);

    const shares = Array.from(sellerMap.entries()).map(([sellerId, data]) => {
      // ₹30 service fee is allocated proportionally across sellers when an order
      // has multiple sellers; single-seller orders just absorb the full ₹30.
      const xelgoServiceFee = isXelgoCourier && totalGross > 0
        ? Math.round((data.gross / totalGross) * XELGO_SERVICE_FEE * 100) / 100
        : 0;
      const net = Math.max(0, data.gross - data.commission - xelgoServiceFee);
      const effectiveRate = data.gross > 0 ? (data.commission / data.gross) * 100 : 0;
      return {
        sellerId,
        storeName: data.storeName,
        gross: data.gross,
        commissionRate: Number(effectiveRate.toFixed(2)),
        commission: data.commission,
        xelgoServiceFee,
        net,
      };
    });

    return { orderId: order.id, orderNumber: order.orderNumber, total: order.total, shares };
  }

  /**
   * Create ON_HOLD settlement payouts for every seller in this order. The hold
   * window is 7 business days from the shipment's `deliveredAt` (or now() as a
   * fallback). The daily payout-release cron lifts the hold once it expires and
   * credits the seller wallet at that point — this method does NOT touch the
   * wallet on its own.
   *
   * Idempotent: if a payout already exists for `(sellerId, orderId, isAdvance=false)`
   * we skip it (avoids duplicates on webhook retries).
   */
  async settleOrder(orderId: string) {
    const { shares, orderNumber } = await this.computeSellerShares(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipment: { select: { deliveredAt: true, shippingMode: true } },
      },
    });
    const deliveredAt = order?.shipment?.deliveredAt ?? new Date();
    const holdUntil = await this.businessDays.addBusinessDays(
      deliveredAt,
      SETTLEMENT_HOLD_BUSINESS_DAYS,
    );

    const payouts: Array<{
      id: string; sellerId: string; amount: number; status: string;
      method: string; note: string | null; orderId: string | null;
    }> = [];

    for (const share of shares) {
      const existing = await this.prisma.payout.findFirst({
        where: { sellerId: share.sellerId, orderId, isAdvance: false },
      });
      if (existing) continue;

      const xelgoNote = share.xelgoServiceFee > 0
        ? `, Xelgo service fee: ₹${share.xelgoServiceFee.toFixed(2)}`
        : '';
      const payout = await this.prisma.payout.create({
        data: {
          sellerId: share.sellerId,
          amount: share.net,
          status: 'ON_HOLD',
          method: 'bank_transfer',
          note: `Settlement for order ${orderNumber} (gross ₹${share.gross.toFixed(2)} − commission ₹${share.commission.toFixed(2)}${xelgoNote}). Unlocks ${holdUntil.toISOString().split('T')[0]}.`,
          orderId,
          isAdvance: false,
          holdUntil,
          gross: share.gross,
          commission: share.commission,
          xelgoServiceCharge: share.xelgoServiceFee,
        },
      });
      payouts.push(payout);
    }

    return { settled: payouts.length, payouts, holdUntil };
  }
}
