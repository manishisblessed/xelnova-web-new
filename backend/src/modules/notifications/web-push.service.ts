import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly vapidPublicKey: string;
  private readonly vapidPrivateKey: string;
  private readonly vapidSubject: string;
  private readonly enabled: boolean;
  private webpush: any = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.vapidPublicKey = this.config.get('VAPID_PUBLIC_KEY') || '';
    this.vapidPrivateKey = this.config.get('VAPID_PRIVATE_KEY') || '';
    this.vapidSubject = this.config.get('VAPID_SUBJECT') || 'mailto:admin@xelnova.in';
    this.enabled = !!(this.vapidPublicKey && this.vapidPrivateKey);

    if (this.enabled) {
      this.initWebPush();
    } else {
      this.logger.warn('[WebPush] Not configured — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
    }
  }

  private async initWebPush() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const wp = require('web-push');
      this.webpush = wp;
      this.webpush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);
      this.logger.log('[WebPush] Initialized with VAPID keys');
    } catch (err: any) {
      this.logger.warn(`[WebPush] web-push package not available: ${err.message}. Install with: npm install web-push`);
      this.webpush = null;
    }
  }

  getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }

  isEnabled(): boolean {
    return this.enabled && this.webpush !== null;
  }

  async sendToUser(userId: string, payload: { title: string; body: string; icon?: string; url?: string; data?: Record<string, unknown> }) {
    if (!this.isEnabled()) return { sent: 0, failed: 0 };

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, isActive: true, platform: 'web' },
    });

    let sent = 0;
    let failed = 0;

    for (const token of tokens) {
      try {
        const subscription = JSON.parse(token.token);
        await this.webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/xelnova-icon-dark.png',
            data: { url: payload.url, ...payload.data },
          }),
        );
        sent++;
      } catch (err: any) {
        this.logger.warn(`Push failed for token ${token.id}: ${err.message}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await this.prisma.pushToken.update({ where: { id: token.id }, data: { isActive: false } });
        }
        failed++;
      }
    }

    return { sent, failed };
  }

  async sendOrderNotification(userId: string, orderNumber: string, status: string) {
    const titles: Record<string, string> = {
      CONFIRMED: 'Order Confirmed',
      SHIPPED: 'Order Shipped',
      DELIVERED: 'Order Delivered',
      CANCELLED: 'Order Cancelled',
    };

    return this.sendToUser(userId, {
      title: titles[status] || 'Order Update',
      body: `Your order #${orderNumber} has been ${status.toLowerCase()}.`,
      url: `/account/orders/${orderNumber}`,
    });
  }

  /** Shipment milestones from courier webhooks (not always same as order status strings). */
  async sendShipmentMilestonePush(
    userId: string,
    orderNumber: string,
    title: string,
    body: string,
  ) {
    return this.sendToUser(userId, {
      title,
      body,
      url: `/account/orders/${encodeURIComponent(orderNumber)}`,
    });
  }
}
