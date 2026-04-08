import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { WebPushService } from './web-push.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsAppService,
    private readonly webPush: WebPushService,
  ) {}

  // ─── Push Token Management ───

  async registerPushToken(userId: string, token: string, platform = 'web') {
    return this.prisma.pushToken.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, token, platform },
      update: { isActive: true, platform },
    });
  }

  async removePushToken(userId: string, token: string) {
    return this.prisma.pushToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
  }

  // ─── Notification Log ───

  async logNotification(data: {
    userId: string;
    channel: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    return this.prisma.notificationLog.create({
      data: {
        userId: data.userId,
        channel: data.channel,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data ? (data.data as any) : undefined,
      },
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificationLog.count({ where: { userId } }),
      this.prisma.notificationLog.count({ where: { userId, read: false } }),
    ]);
    return { notifications, unread, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notificationLog.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notificationLog.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  // ─── Order Event Notifications ───

  async notifyOrderPlaced(userId: string, orderNumber: string, total: number) {
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_PLACED',
      title: 'Order Placed',
      body: `Your order #${orderNumber} for ₹${total.toFixed(0)} has been placed successfully.`,
      data: { orderNumber },
    });
    this.webPush.sendOrderNotification(userId, orderNumber, 'CONFIRMED').catch(() => {});
  }

  async notifyOrderShipped(userId: string, orderNumber: string, trackingUrl?: string) {
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_SHIPPED',
      title: 'Order Shipped',
      body: `Your order #${orderNumber} has been shipped!`,
      data: { orderNumber, trackingUrl },
    });
    this.webPush.sendOrderNotification(userId, orderNumber, 'SHIPPED').catch(() => {});
  }

  async notifyOrderDelivered(userId: string, orderNumber: string) {
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_DELIVERED',
      title: 'Order Delivered',
      body: `Your order #${orderNumber} has been delivered. Enjoy!`,
      data: { orderNumber },
    });
    this.webPush.sendOrderNotification(userId, orderNumber, 'DELIVERED').catch(() => {});
  }

  async notifyRefundProcessed(userId: string, orderNumber: string, amount: number) {
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'REFUND_PROCESSED',
      title: 'Refund Processed',
      body: `₹${amount.toFixed(0)} has been refunded for order #${orderNumber}.`,
      data: { orderNumber, amount },
    });
  }

  // ─── WhatsApp (Meta Cloud API) ───

  async sendOrderConfirmationWhatsApp(phone: string, orderNumber: string, total: string) {
    return this.whatsapp.sendOrderConfirmation(phone, orderNumber, total);
  }

  async sendShipmentWhatsApp(phone: string, orderNumber: string, trackingUrl: string) {
    return this.whatsapp.sendShipmentUpdate(phone, orderNumber, trackingUrl);
  }

  async sendOtpWhatsApp(phone: string, otp: string) {
    return this.whatsapp.sendOtp(phone, otp);
  }

  async sendDeliveryOtpWhatsApp(phone: string, otp: string, orderNumber: string) {
    return this.whatsapp.sendDeliveryOtp(phone, otp, orderNumber);
  }

  isWhatsAppEnabled(): boolean {
    return this.whatsapp.isEnabled();
  }
}
