import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * Daily cron that releases payouts whose 7-business-day hold has expired.
 *
 * Flow:
 *  1. Find every Payout with `status='ON_HOLD'` and `holdUntil <= now()`.
 *  2. Re-check the related order isn't `RETURNED`/`REFUNDED`/`CANCELLED`
 *     (a return inside the hold window already moves the payout to REJECTED,
 *     but this guard is cheap insurance).
 *  3. Credit the seller's wallet by the snapshotted `amount` (net).
 *  4. Flip status to `PAID` (settlement complete — wallet credited) and stamp
 *     `releasedAt` + `paidAt`. The seller's `Wallet.balance` is now what's
 *     used to compute their available-to-withdraw amount; they can request a
 *     bank transfer separately via the existing manual-payout flow which
 *     creates its own Payout row.
 *
 * This cron does NOT push money to a bank — that remains a separate manual
 * step until the bank-payout API integration ships. The actual bank transfer
 * is tracked on the separate `requestManualPayout`-created Payout rows.
 */
@Injectable()
export class PayoutReleaseService {
  private readonly logger = new Logger(PayoutReleaseService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  /** Runs every day at 01:30 IST (cron is server-local — adjust TZ if not IST). */
  @Cron('0 30 1 * * *')
  async tick(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('Payout release skipped — previous run still in progress.');
      return;
    }
    this.isRunning = true;
    try {
      const released = await this.releaseDuePayouts();
      if (released > 0) {
        this.logger.log(`Released ${released} payout(s) from hold.`);
      }
    } catch (err: any) {
      this.logger.error(`Payout release cron failed: ${err.message}`, err.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Public so the admin "Release now" override can use the same machinery.
   * Optionally pass `payoutIds` to release a specific set; otherwise releases
   * all due ON_HOLD payouts.
   */
  async releaseDuePayouts(payoutIds?: string[]): Promise<number> {
    const where: any = { status: 'ON_HOLD' };
    if (payoutIds && payoutIds.length > 0) {
      where.id = { in: payoutIds };
    } else {
      where.holdUntil = { lte: new Date() };
    }

    const payouts = await this.prisma.payout.findMany({
      where,
      include: {
        order: { select: { id: true, orderNumber: true, status: true } },
      },
    });

    let released = 0;
    for (const payout of payouts) {
      try {
        // Guard: if the order was returned/refunded/cancelled inside the hold
        // window, the return reversal flow should have already moved this row
        // to REJECTED. Skip just to be safe.
        if (payout.order && ['RETURNED', 'REFUNDED', 'CANCELLED'].includes(payout.order.status)) {
          await this.prisma.payout.update({
            where: { id: payout.id },
            data: {
              status: 'REJECTED',
              note: `${payout.note || ''}\nOrder ${payout.order.status} before hold release`.trim(),
            },
          });
          continue;
        }

        const seller = await this.prisma.sellerProfile.findUnique({
          where: { id: payout.sellerId },
          select: { userId: true, storeName: true },
        });
        if (!seller?.userId) {
          this.logger.warn(`Payout ${payout.id}: seller has no userId; cannot credit wallet`);
          continue;
        }

        const wallet = await this.walletService.getOrCreateWallet(seller.userId, 'SELLER');

        await this.walletService.credit(
          wallet.id,
          payout.amount,
          this.buildCreditDescription(payout),
          undefined,
          'ORDER_SETTLEMENT',
          payout.id,
        );

        const now = new Date();
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'PAID',
            releasedAt: now,
            paidAt: now,
          },
        });

        released += 1;
      } catch (err: any) {
        this.logger.warn(`Failed to release payout ${payout.id}: ${err.message}`);
      }
    }
    return released;
  }

  private buildCreditDescription(payout: {
    orderId: string | null;
    amount: number;
    gross: number | null;
    commission: number | null;
    xelgoServiceCharge: number | null;
  }): string {
    const parts = [
      `Settlement released`,
      payout.orderId ? `(order ${payout.orderId})` : '',
      `— Gross ₹${(payout.gross ?? 0).toFixed(2)}`,
      `− Commission ₹${(payout.commission ?? 0).toFixed(2)}`,
    ];
    if ((payout.xelgoServiceCharge ?? 0) > 0) {
      parts.push(`− Xelgo service fee ₹${(payout.xelgoServiceCharge ?? 0).toFixed(2)}`);
    }
    parts.push(`= ₹${payout.amount.toFixed(2)}`);
    return parts.filter(Boolean).join(' ');
  }
}
