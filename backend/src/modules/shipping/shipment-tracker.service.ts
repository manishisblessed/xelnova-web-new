import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShipmentStatus, ShippingMode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ShippingService } from './shipping.service';

/**
 * Background poller that keeps every active shipment in sync with the
 * carrier's tracking system, so the seller portal reflects the same
 * status (Picked Up / In Transit / Out For Delivery / Delivered) as the
 * Delhivery One dashboard without anyone having to click "Refresh".
 *
 * Why this exists:
 *   - Webhooks from Delhivery are opt-in per account and only flow once
 *     the account POC enables them. We can't rely on them being on for
 *     every seller.
 *   - The seller portal otherwise had no automated mechanism to advance
 *     shipments past "BOOKED" / "PICKUP_SCHEDULED", which is exactly
 *     the bug the seller flagged ("portal stuck at Pickup Scheduled
 *     while Delhivery shows Picked Up").
 *
 * Behaviour:
 *   - Runs every 15 minutes.
 *   - Picks the oldest 50 shipments whose status is not terminal and
 *     whose `updatedAt` is at least 10 minutes old (so we don't spam
 *     the carrier API moments after a booking).
 *   - Pulls fresh tracking via the existing live-track pipeline (which
 *     already handles status mapping, customer notifications and order
 *     status sync).
 *   - Each shipment runs in isolation — a single failure never blocks
 *     the rest of the batch.
 */
@Injectable()
export class ShipmentTrackerService {
  private readonly logger = new Logger(ShipmentTrackerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: ShippingService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async pollActiveShipments(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('Tracker tick skipped — previous run still in progress.');
      return;
    }
    this.isRunning = true;
    try {
      await this.runOnce();
    } catch (err) {
      this.logger.error(
        `Tracker run failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /** Internal helper, also exposed so admins can trigger an on-demand sweep. */
  async runOnce(): Promise<{ checked: number; updated: number; failed: number }> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const candidates = await this.prisma.shipment.findMany({
      where: {
        awbNumber: { not: null },
        shipmentStatus: {
          notIn: [
            ShipmentStatus.PENDING,
            ShipmentStatus.DELIVERED,
            ShipmentStatus.RTO_DELIVERED,
            ShipmentStatus.CANCELLED,
          ],
        },
        shippingMode: {
          in: [
            ShippingMode.DELHIVERY,
            ShippingMode.SHIPROCKET,
            ShippingMode.XPRESSBEES,
            ShippingMode.EKART,
            ShippingMode.XELNOVA_COURIER,
          ],
        },
        updatedAt: { lt: tenMinutesAgo },
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
      include: { seller: { select: { userId: true } } },
    });

    if (!candidates.length) {
      this.logger.debug('Tracker: no shipments due for refresh.');
      return { checked: 0, updated: 0, failed: 0 };
    }

    let updated = 0;
    let failed = 0;
    for (const sh of candidates) {
      const userId = sh.seller?.userId;
      if (!userId) continue;
      try {
        const before = sh.shipmentStatus;
        const tracking = await this.shipping.liveTrack(userId, sh.orderId);
        if (tracking?.status && tracking.status !== before) {
          updated += 1;
          this.logger.log(
            `Tracker: ${sh.awbNumber} ${before} → ${tracking.status}`,
          );
        }
      } catch (err) {
        failed += 1;
        this.logger.warn(
          `Tracker: failed to refresh ${sh.awbNumber || sh.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (updated || failed) {
      this.logger.log(
        `Tracker tick: checked=${candidates.length}, updated=${updated}, failed=${failed}.`,
      );
    }
    return { checked: candidates.length, updated, failed };
  }
}
