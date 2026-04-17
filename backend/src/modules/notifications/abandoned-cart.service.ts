import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AbandonedCartService {
  private readonly logger = new Logger(AbandonedCartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Find users with items in cart that haven't placed an order in the last N hours.
   * Default threshold: 24 hours.
   */
  async findAbandonedCarts(hoursThreshold = 24) {
    const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        updatedAt: { lt: cutoff },
        user: { email: { not: null } },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        product: { select: { name: true, price: true, images: true } },
      },
    });

    const userMap = new Map<string, {
      userId: string;
      email: string;
      name: string;
      items: { name: string; price: number; image: string }[];
      totalValue: number;
    }>();

    for (const ci of cartItems) {
      if (!ci.user.email) continue;
      const existing = userMap.get(ci.userId) || {
        userId: ci.userId,
        email: ci.user.email,
        name: ci.user.name,
        items: [] as { name: string; price: number; image: string }[],
        totalValue: 0,
      };
      existing.items.push({
        name: ci.product.name,
        price: ci.product.price * ci.quantity,
        image: ci.product.images[0] || '',
      });
      existing.totalValue += ci.product.price * ci.quantity;
      userMap.set(ci.userId, existing);
    }

    return Array.from(userMap.values());
  }

  /**
   * Send reminder emails to users with abandoned carts.
   * Skips users who already received a reminder in the last 48 hours.
   */
  async sendReminders(hoursThreshold = 24) {
    const carts = await this.findAbandonedCarts(hoursThreshold);
    const recentCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    let sent = 0;
    let skipped = 0;

    for (const cart of carts) {
      const recentReminder = await this.prisma.abandonedCartReminder.findFirst({
        where: { userId: cart.userId, sentAt: { gt: recentCutoff } },
      });
      if (recentReminder) {
        skipped++;
        continue;
      }

      try {
        const appUrl = this.config.get('APP_URL') || 'http://localhost:3000';
        const itemsHtml = cart.items.slice(0, 5).map((item) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.price.toFixed(0)}</td></tr>`,
        ).join('');

        await this.email.sendEmail({
          to: cart.email,
          subject: 'You left something in your cart! - XelNova',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h1 style="color:#7c3aed">Don't forget your cart!</h1>
              <p>Hi ${cart.name},</p>
              <p>You have ${cart.items.length} item(s) worth <strong>₹${cart.totalValue.toFixed(0)}</strong> waiting in your cart.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <thead><tr style="background:#f5f3ff"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:right">Price</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <a href="${appUrl}/cart" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
                Complete Your Purchase
              </a>
              <p style="margin-top:24px;color:#999;font-size:12px">Don't want these emails? <a href="${appUrl}/account/settings">Manage preferences</a></p>
            </div>
          `,
        });

        await this.prisma.abandonedCartReminder.create({
          data: {
            userId: cart.userId,
            email: cart.email,
            cartValue: cart.totalValue,
            itemCount: cart.items.length,
            channel: 'email',
          },
        });

        sent++;
      } catch (err: any) {
        this.logger.warn(`Failed to send abandoned cart email to ${cart.email}: ${err.message}`);
      }
    }

    return { found: carts.length, sent, skipped };
  }

  async getStats() {
    try {
      const [total, converted] = await Promise.all([
        this.prisma.abandonedCartReminder.count(),
        this.prisma.abandonedCartReminder.count({ where: { converted: true } }),
      ]);
      return {
        totalSent: total,
        converted,
        conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`getStats failed (run prisma migrations if table missing): ${msg}`);
      return { totalSent: 0, converted: 0, conversionRate: '0' };
    }
  }

  async markConverted(userId: string) {
    const recent = await this.prisma.abandonedCartReminder.findFirst({
      where: { userId, converted: false },
      orderBy: { sentAt: 'desc' },
    });
    if (recent) {
      await this.prisma.abandonedCartReminder.update({
        where: { id: recent.id },
        data: { converted: true },
      });
    }
  }
}
