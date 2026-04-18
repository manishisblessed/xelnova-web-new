import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { WebPushService } from './web-push.service';
import { SmsService } from './sms.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly appUrl: string;
  private readonly sellerUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsAppService,
    private readonly webPush: WebPushService,
    private readonly sms: SmsService,
  ) {
    this.appUrl = this.config.get('APP_URL') || 'https://xelnova.in';
    this.sellerUrl = this.config.get('SELLER_URL') || 'https://seller.xelnova.in';
  }

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
    try {
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
      this.logger.debug(`[GET_NOTIFICATIONS] userId=${userId} total=${total} unread=${unread} returned=${notifications.length}`);
      return { notifications, unread, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    } catch (error: any) {
      this.logger.error(`[GET_NOTIFICATIONS] Failed for userId=${userId}: ${error.message}`);
      return { notifications: [], unread: 0, pagination: { page, limit, total: 0, totalPages: 0 } };
    }
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

  /**
   * Fan-out an in-app notification to every user with role ADMIN (dashboard bell).
   */
  async notifyAllAdmins(params: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, email: true, name: true },
      });
      if (admins.length === 0) return;

      const rows = admins.map((a) => ({
        userId: a.id,
        channel: 'admin_in_app',
        type: params.type,
        title: params.title,
        body: params.body,
        ...(params.data !== undefined ? { data: params.data as object } : {}),
      }));

      await this.prisma.notificationLog.createMany({ data: rows });

      const adminEmails = admins.filter((a) => Boolean(a.email));
      await Promise.allSettled(
        adminEmails.map((admin) =>
          this.email.sendGenericEmail(
            admin.email as string,
            `[Xelnova Admin] ${params.title}`,
            `Hello ${admin.name || 'Admin'},\n\n${params.body}\n\nOpen admin dashboard for details.`,
          ),
        ),
      );
    } catch (err: any) {
      this.logger.warn(`notifyAllAdmins failed: ${err?.message ?? err}`);
    }
  }

  // ─── Order Event Notifications ───

  /**
   * Notify customer when order is placed
   * Channels: In-app, Push, SMS, Email (if email confirmation sent separately)
   */
  async notifyOrderPlaced(userId: string, orderNumber: string, total: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_PLACED',
      title: 'Order Placed',
      body: `Your order #${orderNumber} for ₹${total.toFixed(0)} has been placed successfully.`,
      data: { orderNumber },
    });

    this.webPush.sendOrderNotification(userId, orderNumber, 'CONFIRMED').catch((err) =>
      this.logger.warn(`WebPush failed for order confirmed ${orderNumber}: ${err.message}`),
    );

    if (user?.phone) {
      this.sms.sendOrderPlaced(user.phone, orderNumber, total.toFixed(0)).catch((err) =>
        this.logger.warn(`SMS failed for order placed ${orderNumber}: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_NEW_ORDER',
      title: 'New order',
      body: `Order #${orderNumber} placed for ₹${total.toFixed(0)}.`,
      data: { orderNumber },
    }).catch(() => {});
  }

  /**
   * Notify customer when order is being processed
   * Channels: In-app, Push, SMS
   */
  async notifyOrderProcessing(userId: string, orderNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_PROCESSING',
      title: 'Order Processing',
      body: `Your order #${orderNumber} is being processed and prepared for dispatch.`,
      data: { orderNumber },
    });

    this.webPush.sendOrderNotification(userId, orderNumber, 'PROCESSING').catch((err) =>
      this.logger.warn(`WebPush failed for order processing ${orderNumber}: ${err.message}`),
    );

    if (user?.phone) {
      this.sms.sendOrderProcessing(user.phone, orderNumber).catch((err) =>
        this.logger.warn(`SMS failed for order processing ${orderNumber}: ${err.message}`),
      );
    }

    if (user?.email) {
      this.email.sendOrderStatusUpdate(user.email, user.name || 'Customer', orderNumber, 'PROCESSING').catch((err) =>
        this.logger.warn(`Email failed for order processing ${orderNumber}: ${err.message}`),
      );
    }
  }

  /**
   * Notify customer when order is packed
   * Channels: In-app, Push, SMS
   */
  async notifyOrderPacked(userId: string, orderNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_PACKED',
      title: 'Order Packed',
      body: `Good news! Your order #${orderNumber} is packed and ready for dispatch.`,
      data: { orderNumber },
    });

    if (user?.phone) {
      this.sms.sendOrderPacked(user.phone, orderNumber).catch((err) =>
        this.logger.warn(`SMS failed for order packed ${orderNumber}: ${err.message}`),
      );
    }
  }

  /**
   * Notify customer when order is shipped
   * Channels: In-app, Push, SMS, Email
   */
  async notifyOrderShipped(userId: string, orderNumber: string, courier?: string, trackingUrl?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_SHIPPED',
      title: 'Order Shipped',
      body: `Your order #${orderNumber} has been shipped!`,
      data: { orderNumber, trackingUrl, courier },
    });

    this.webPush.sendOrderNotification(userId, orderNumber, 'SHIPPED').catch((err) =>
      this.logger.warn(`WebPush failed for order shipped ${orderNumber}: ${err.message}`),
    );

    if (user?.phone) {
      this.sms.sendOrderShipped(
        user.phone,
        orderNumber,
        courier || 'Xelgo',
        trackingUrl || `${this.appUrl}/track/${orderNumber}`,
      ).catch((err) =>
        this.logger.warn(`SMS failed for order shipped ${orderNumber}: ${err.message}`),
      );
    }

    if (user?.email) {
      this.email.sendOrderStatusUpdate(user.email, user.name || 'Customer', orderNumber, 'SHIPPED').catch((err) =>
        this.logger.warn(`Email failed for order shipped ${orderNumber}: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_ORDER_SHIPPED',
      title: 'Order shipped',
      body: `Order #${orderNumber} has been marked as shipped.`,
      data: { orderNumber, courier, trackingUrl },
    }).catch(() => {});
  }

  /**
   * Notify customer when order is delivered
   * Channels: In-app, Push, SMS, Email
   */
  async notifyOrderDelivered(userId: string, orderNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_DELIVERED',
      title: 'Order Delivered',
      body: `Your order #${orderNumber} has been delivered. Enjoy!`,
      data: { orderNumber },
    });

    this.webPush.sendOrderNotification(userId, orderNumber, 'DELIVERED').catch((err) =>
      this.logger.warn(`WebPush failed for order delivered ${orderNumber}: ${err.message}`),
    );

    if (user?.phone) {
      this.sms.sendOrderDelivered(user.phone, orderNumber).catch((err) =>
        this.logger.warn(`SMS failed for order delivered ${orderNumber}: ${err.message}`),
      );
    }

    if (user?.email) {
      this.email.sendOrderStatusUpdate(user.email, user.name || 'Customer', orderNumber, 'DELIVERED').catch((err) =>
        this.logger.warn(`Email failed for order delivered ${orderNumber}: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_ORDER_DELIVERED',
      title: 'Order delivered',
      body: `Order #${orderNumber} was delivered.`,
      data: { orderNumber },
    }).catch(() => {});
  }

  /**
   * Notify customer when order is cancelled
   * Channels: In-app, Email, SMS (when approved), Push
   */
  async notifyOrderCancelled(userId: string, orderNumber: string, refundAmount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification (always works)
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_CANCELLED',
      title: 'Order Cancelled',
      body: `Your order #${orderNumber} has been cancelled. Refund of ₹${refundAmount.toFixed(0)} will be processed.`,
      data: { orderNumber, refundAmount },
    });

    // Push notification
    this.webPush.sendOrderNotification(userId, orderNumber, 'CANCELLED').catch((err) =>
      this.logger.warn(`WebPush failed for order cancelled ${orderNumber}: ${err.message}`),
    );

    // Email (always works)
    if (user?.email) {
      this.email.sendOrderCancelled(user.email, user.name || 'Customer', orderNumber, refundAmount).catch((err) =>
        this.logger.warn(`Email failed for order cancelled ${orderNumber}: ${err.message}`),
      );
    }

    // SMS (works when template is approved)
    if (user?.phone) {
      this.sms.sendOrderCancelled(user.phone, orderNumber, refundAmount.toFixed(0)).catch((err) =>
        this.logger.warn(`SMS failed for order cancelled ${orderNumber}: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_ORDER_CANCELLED',
      title: 'Order cancelled',
      body: `Order #${orderNumber} cancelled. Refund ₹${refundAmount.toFixed(0)}.`,
      data: { orderNumber, refundAmount },
    }).catch(() => {});
  }

  /**
   * Notify customer when order is out for delivery
   * Channels: In-app, Email, SMS (when approved), Push
   */
  async notifyOrderOutForDelivery(userId: string, orderNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'ORDER_OUT_FOR_DELIVERY',
      title: 'Out for Delivery',
      body: `Great news! Your order #${orderNumber} is out for delivery today.`,
      data: { orderNumber },
    });

    // Email
    if (user?.email) {
      this.email.sendOrderOutForDelivery(user.email, user.name || 'Customer', orderNumber).catch((err) =>
        this.logger.warn(`Email failed for out for delivery ${orderNumber}: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendOrderOutForDelivery(user.phone, orderNumber).catch((err) =>
        this.logger.warn(`SMS failed for out for delivery ${orderNumber}: ${err.message}`),
      );
    }
  }

  /**
   * Send COD delivery OTP to customer
   * Channels: SMS
   */
  async sendCodDeliveryOtp(userId: string, orderNumber: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (user?.phone) {
      await this.sms.sendCodDeliveryOtp(user.phone, orderNumber, otp);
    }
  }

  /**
   * Notify customer when refund is processed
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyRefundProcessed(userId: string, orderNumber: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'REFUND_PROCESSED',
      title: 'Refund Processed',
      body: `₹${amount.toFixed(0)} has been refunded for order #${orderNumber}.`,
      data: { orderNumber, amount },
    });

    // Email
    if (user?.email) {
      this.email.sendRefundProcessed(user.email, user.name || 'Customer', orderNumber, amount).catch((err) =>
        this.logger.warn(`Email failed for refund ${orderNumber}: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendRefundProcessed(user.phone, amount.toFixed(0), orderNumber).catch((err) =>
        this.logger.warn(`SMS failed for refund ${orderNumber}: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_REFUND_PROCESSED',
      title: 'Refund processed',
      body: `₹${amount.toFixed(0)} refunded for order #${orderNumber}.`,
      data: { orderNumber, amount },
    }).catch(() => {});
  }

  // ─── Return Notifications ───

  /**
   * Notify customer when return is approved
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyReturnApproved(userId: string, orderNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'RETURN_APPROVED',
      title: 'Return Approved',
      body: `Your return request for order #${orderNumber} has been approved. Pickup will be scheduled shortly.`,
      data: { orderNumber },
    });

    // Email
    if (user?.email) {
      this.email.sendReturnApproved(user.email, user.name || 'Customer', orderNumber).catch((err) =>
        this.logger.warn(`Email failed for return approved ${orderNumber}: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendReturnApproved(user.phone, orderNumber).catch((err) =>
        this.logger.warn(`SMS failed for return approved ${orderNumber}: ${err.message}`),
      );
    }
  }

  /**
   * Notify customer when return is rejected
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyReturnRejected(userId: string, orderNumber: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'RETURN_REJECTED',
      title: 'Return Not Approved',
      body: `Your return request for order #${orderNumber} was not approved. ${reason}`,
      data: { orderNumber, reason },
    });

    // Email
    if (user?.email) {
      this.email.sendReturnRejected(user.email, user.name || 'Customer', orderNumber, reason).catch((err) =>
        this.logger.warn(`Email failed for return rejected ${orderNumber}: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendReturnRejected(user.phone, orderNumber, reason).catch((err) =>
        this.logger.warn(`SMS failed for return rejected ${orderNumber}: ${err.message}`),
      );
    }
  }

  /**
   * Notify customer when return pickup is scheduled
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyReturnPickupScheduled(userId: string, orderNumber: string, pickupDate: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'RETURN_PICKUP_SCHEDULED',
      title: 'Pickup Scheduled',
      body: `Return pickup for order #${orderNumber} scheduled for ${pickupDate}. Keep the package ready.`,
      data: { orderNumber, pickupDate },
    });

    // Email
    if (user?.email) {
      this.email.sendReturnPickupScheduled(user.email, user.name || 'Customer', orderNumber, pickupDate).catch((err) =>
        this.logger.warn(`Email failed for return pickup ${orderNumber}: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendReturnPickupScheduled(user.phone, orderNumber, pickupDate).catch((err) =>
        this.logger.warn(`SMS failed for return pickup ${orderNumber}: ${err.message}`),
      );
    }
  }

  // ─── Wallet Notifications ───

  /**
   * Notify customer when wallet is credited
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyWalletCredited(userId: string, amount: number, newBalance: number, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'WALLET_CREDITED',
      title: 'Wallet Credited',
      body: `₹${amount.toFixed(0)} has been added to your wallet.${reason ? ` (${reason})` : ''} New balance: ₹${newBalance.toFixed(0)}`,
      data: { amount, newBalance, reason },
    });

    // Email
    if (user?.email) {
      this.email.sendWalletCredit(user.email, user.name || 'Customer', amount, newBalance, reason).catch((err) =>
        this.logger.warn(`Email failed for wallet credit: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendWalletCredited(user.phone, amount.toFixed(0), newBalance.toFixed(0)).catch((err) =>
        this.logger.warn(`SMS failed for wallet credit: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_WALLET_CREDITED',
      title: 'Wallet credited',
      body: `₹${amount.toFixed(0)} added to ${user?.name || 'a customer'} wallet${reason ? ` (${reason})` : ''}.`,
      data: { userId, amount, newBalance, reason },
    }).catch(() => {});
  }

  /**
   * Notify customer when wallet is debited
   * Channels: In-app, SMS (when approved)
   */
  async notifyWalletDebited(userId: string, amount: number, purpose: string, newBalance: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'WALLET_DEBITED',
      title: 'Wallet Debited',
      body: `₹${amount.toFixed(0)} debited from wallet for ${purpose}. Balance: ₹${newBalance.toFixed(0)}`,
      data: { amount, purpose, newBalance },
    });

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendWalletDebited(user.phone, amount.toFixed(0), purpose, newBalance.toFixed(0)).catch((err) =>
        this.logger.warn(`SMS failed for wallet debit: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_WALLET_DEBITED',
      title: 'Wallet debited',
      body: `₹${amount.toFixed(0)} debited (${purpose}) for user ${userId}.`,
      data: { userId, amount, purpose, newBalance },
    }).catch(() => {});
  }

  // ─── Account Notifications ───

  /**
   * Welcome notification for new customers
   * Channels: In-app, Email, SMS
   */
  async notifyWelcome(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, name: true },
    });

    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'WELCOME',
      title: 'Welcome to Xelnova!',
      body: 'Thank you for joining Xelnova. Start exploring amazing products from verified sellers.',
      data: {},
    });

    if (user?.email) {
      this.email.sendWelcome(user.email, user.name || 'there').catch((err) =>
        this.logger.warn(`Welcome email failed: ${err.message}`),
      );
    }

    if (user?.phone) {
      this.sms.sendWelcome(user.phone).catch((err) =>
        this.logger.warn(`Welcome SMS failed: ${err.message}`),
      );
    }
  }

  // ─── Payment Notifications ───

  /**
   * Notify customer when payment is successful
   * Channels: In-app, SMS
   */
  async notifyPaymentSuccessful(userId: string, orderNumber: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'PAYMENT_SUCCESSFUL',
      title: 'Payment Received',
      body: `Payment of ₹${amount.toFixed(0)} received for order #${orderNumber}. Thank you!`,
      data: { orderNumber, amount },
    });

    if (user?.phone) {
      this.sms.sendPaymentSuccessful(user.phone, amount.toFixed(0), orderNumber).catch((err) =>
        this.logger.warn(`SMS failed for payment success ${orderNumber}: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_PAYMENT_SUCCESS',
      title: 'Payment received',
      body: `₹${amount.toFixed(0)} payment for order #${orderNumber}.`,
      data: { orderNumber, amount },
    }).catch(() => {});
  }

  /**
   * Notify customer when payment fails
   * Channels: In-app, SMS
   */
  async notifyPaymentFailed(userId: string, orderNumber: string, orderId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    const paymentUrl = `${this.appUrl}/checkout/payment?order=${orderId}`;

    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      body: `Payment for order #${orderNumber} was unsuccessful. Please retry to avoid cancellation.`,
      data: { orderNumber, orderId, paymentUrl },
    });

    if (user?.phone) {
      this.sms.sendPaymentFailed(user.phone, orderNumber, paymentUrl).catch((err) =>
        this.logger.warn(`SMS failed for payment failed ${orderNumber}: ${err.message}`),
      );
    }

    this.notifyAllAdmins({
      type: 'ADMIN_PAYMENT_FAILED',
      title: 'Payment failed',
      body: `Payment failed for order #${orderNumber}.`,
      data: { orderNumber, orderId },
    }).catch(() => {});
  }

  // ─── Seller Notifications ───

  /**
   * Notify seller when account is verified/approved
   * Channels: In-app, Email, SMS
   */
  async notifySellerVerified(sellerId: string, storeName: string) {
    this.logger.log(`[SELLER_VERIFIED] Starting notification for userId=${sellerId}, store="${storeName}"`);

    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { phone: true, email: true, name: true },
    });

    if (!user) {
      this.logger.warn(`[SELLER_VERIFIED] User not found for id=${sellerId} — skipping all channels`);
      return;
    }

    const notif = await this.logNotification({
      userId: sellerId,
      channel: 'in_app',
      type: 'SELLER_VERIFIED',
      title: 'Account Verified',
      body: `Congratulations! Your seller account "${storeName}" has been verified. You can now start adding products.`,
      data: { storeName },
    });
    this.logger.log(`[SELLER_VERIFIED] In-app notification created: id=${notif.id} for userId=${sellerId}`);

    if (user.email) {
      this.email.sendSellerApproval(user.email, storeName).catch((err) =>
        this.logger.warn(`Email failed for seller approval ${sellerId}: ${err.message}`),
      );
    }

    if (user.phone) {
      this.sms.sendSellerApproved(user.phone, storeName).catch((err) =>
        this.logger.warn(`SMS failed for seller approval ${sellerId}: ${err.message}`),
      );
    }
  }

  /**
   * Notify seller when account is rejected
   * Channels: In-app, Email, SMS
   */
  async notifySellerRejected(sellerId: string, storeName: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { phone: true, email: true, name: true },
    });

    await this.logNotification({
      userId: sellerId,
      channel: 'in_app',
      type: 'SELLER_REJECTED',
      title: 'Verification Update',
      body: `Your seller account "${storeName}" verification was not approved.${reason ? ` Reason: ${reason}` : ''} Please review and resubmit.`,
      data: { storeName, reason },
    });

    this.sendSellerEmail(
      sellerId,
      'Verification Not Approved',
      `Your seller account "${storeName}" could not be verified.${reason ? ` Reason: ${reason}` : ''} Please update your details and resubmit.`,
    ).catch((err) =>
      this.logger.warn(`Email failed for seller rejection ${sellerId}: ${err.message}`),
    );

    if (user?.phone) {
      this.sms.sendSellerRejected(user.phone, storeName, reason || 'Please review requirements').catch((err) =>
        this.logger.warn(`SMS failed for seller rejection ${sellerId}: ${err.message}`),
      );
    }
  }

  /**
   * Notify seller when product is approved
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyProductApproved(sellerId: string, productName: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId: sellerId,
      channel: 'in_app',
      type: 'PRODUCT_APPROVED',
      title: 'Product Approved',
      body: `Your product "${productName}" has been approved and is now live on the marketplace.`,
      data: { productName },
    });

    // Email
    if (user?.email) {
      this.email.sendProductApproved(user.email, user.name || 'Seller', productName).catch((err) =>
        this.logger.warn(`Email failed for product approved: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendProductApproved(user.phone, productName.slice(0, 30)).catch((err) =>
        this.logger.warn(`SMS failed for product approved: ${err.message}`),
      );
    }
  }

  /**
   * Notify seller when product is rejected
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyProductRejected(sellerId: string, productName: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId: sellerId,
      channel: 'in_app',
      type: 'PRODUCT_REJECTED',
      title: 'Product Update',
      body: `Your product "${productName}" was not approved.${reason ? ` Reason: ${reason}` : ''}`,
      data: { productName, reason },
    });

    // Email
    if (user?.email) {
      this.email.sendProductRejected(user.email, user.name || 'Seller', productName, reason).catch((err) =>
        this.logger.warn(`Email failed for product rejected: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendProductRejected(user.phone, productName.slice(0, 30), reason || 'Review guidelines').catch((err) =>
        this.logger.warn(`SMS failed for product rejected: ${err.message}`),
      );
    }
  }

  /**
   * Notify user when ticket is created
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyTicketCreated(userId: string, ticketNumber: string, ticketId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'TICKET_CREATED',
      title: 'Ticket Created',
      body: `Your support ticket #${ticketNumber} has been created. We'll respond within 24 hours.`,
      data: { ticketNumber, ticketId },
    });

    // Email
    if (user?.email) {
      this.email.sendTicketCreated(user.email, user.name || 'Customer', ticketNumber).catch((err) =>
        this.logger.warn(`Email failed for ticket created: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendTicketCreated(user.phone, ticketNumber).catch((err) =>
        this.logger.warn(`SMS failed for ticket created: ${err.message}`),
      );
    }
  }

  /**
   * Notify user when ticket status is updated
   * Channels: In-app, Email (on resolved), SMS (on resolved, when approved)
   */
  async notifyTicketUpdate(userId: string, ticketNumber: string, status: string, ticketId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'TICKET_UPDATE',
      title: 'Support Ticket Update',
      body: `Your ticket #${ticketNumber} status has been updated to ${status}.`,
      data: { ticketNumber, status, ticketId },
    });

    if (status === 'RESOLVED') {
      // Email
      if (user?.email) {
        this.email.sendTicketResolved(user.email, user.name || 'Customer', ticketNumber).catch((err) =>
          this.logger.warn(`Email failed for ticket resolved: ${err.message}`),
        );
      }

      // SMS (when template approved)
      if (user?.phone) {
        this.sms.sendTicketResolved(user.phone, ticketNumber).catch((err) =>
          this.logger.warn(`SMS failed for ticket resolved: ${err.message}`),
        );
      }
    }
  }

  /**
   * Notify user when there's a reply on their ticket
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyTicketReply(userId: string, ticketNumber: string, senderName: string, ticketId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, name: true },
    });

    // In-app notification
    await this.logNotification({
      userId,
      channel: 'in_app',
      type: 'TICKET_REPLY',
      title: 'New Reply on Ticket',
      body: `${senderName} replied to your ticket #${ticketNumber}.`,
      data: { ticketNumber, ticketId },
    });

    // Email
    if (user?.email) {
      this.email.sendTicketReply(user.email, user.name || 'Customer', ticketNumber, senderName).catch((err) =>
        this.logger.warn(`Email failed for ticket reply: ${err.message}`),
      );
    }

    // SMS (when template approved)
    if (user?.phone) {
      this.sms.sendTicketReply(user.phone, ticketNumber).catch((err) =>
        this.logger.warn(`SMS failed for ticket reply: ${err.message}`),
      );
    }
  }

  async notifyTicketForwarded(sellerId: string, ticketNumber: string, ticketId: string) {
    await this.logNotification({
      userId: sellerId,
      channel: 'in_app',
      type: 'TICKET_ASSIGNED',
      title: 'Ticket Assigned',
      body: `A support ticket #${ticketNumber} has been assigned to you. Please review and respond.`,
      data: { ticketNumber, ticketId },
    });
  }

  /**
   * Notify seller when payout is processed
   * Channels: In-app, Email, SMS
   */
  async notifyPayoutProcessed(sellerId: string, amount: number, transactionRef?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { phone: true, email: true, name: true },
    });

    await this.logNotification({
      userId: sellerId,
      channel: 'in_app',
      type: 'PAYOUT_PROCESSED',
      title: 'Payout Processed',
      body: `Your payout of ₹${amount.toFixed(0)} has been processed to your bank account.`,
      data: { amount, transactionRef },
    });

    if (user?.email) {
      this.email.sendPayoutNotification(user.email, user.name || 'Seller', amount, 'PAID').catch((err) =>
        this.logger.warn(`Payout email failed: ${err.message}`),
      );
    }

    if (user?.phone) {
      this.sms.sendPayoutProcessed(user.phone, amount.toFixed(0), transactionRef || 'N/A').catch((err) =>
        this.logger.warn(`SMS failed for payout: ${err.message}`),
      );
    }
  }

  /**
   * Notify seller when payout is rejected
   * Channels: In-app, SMS
   */
  async notifyPayoutRejected(sellerId: string, amount: number, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { phone: true },
    });

    await this.logNotification({
      userId: sellerId,
      channel: 'in_app',
      type: 'PAYOUT_REJECTED',
      title: 'Payout Rejected',
      body: `Your payout request of ₹${amount.toFixed(0)} was rejected. Reason: ${reason}`,
      data: { amount, reason },
    });

    if (user?.phone) {
      this.sms.sendPayoutRejected(user.phone, amount.toFixed(0), reason).catch((err) =>
        this.logger.warn(`SMS failed for payout rejected: ${err.message}`),
      );
    }
  }

  /**
   * Notify seller about low stock
   * Channels: In-app, Email, SMS
   */
  async notifyLowStock(sellerId: string, productCount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { phone: true },
    });

    await this.logNotification({
      userId: sellerId,
      channel: 'in_app',
      type: 'LOW_STOCK_ALERT',
      title: 'Low Stock Alert',
      body: `${productCount} products are running low on stock. Restock soon to avoid missed sales.`,
      data: { productCount },
    });

    if (user?.phone) {
      this.sms.sendLowStockAlert(user.phone, productCount.toString()).catch((err) =>
        this.logger.warn(`SMS failed for low stock: ${err.message}`),
      );
    }
  }

  /**
   * Notify seller when they receive a new order
   * Channels: In-app, Email, SMS (when approved)
   */
  async notifyNewOrder(sellerId: string, orderNumber: string, amount: number) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: { phone: true, userId: true, storeName: true },
    });

    const user = seller?.userId
      ? await this.prisma.user.findUnique({
          where: { id: seller.userId },
          select: { phone: true, email: true, name: true },
        })
      : null;

    // In-app notification
    await this.logNotification({
      userId: seller?.userId || sellerId,
      channel: 'in_app',
      type: 'NEW_ORDER',
      title: 'New Order Received',
      body: `You have a new order #${orderNumber} worth ₹${amount.toFixed(0)}.`,
      data: { orderNumber, amount },
    });

    // Email
    if (user?.email) {
      this.email.sendNewOrderToSeller(user.email, user.name || seller?.storeName || 'Seller', orderNumber, amount).catch((err) =>
        this.logger.warn(`Email failed for new order to seller ${sellerId}: ${err.message}`),
      );
    }

    // SMS (when template approved)
    const phone = seller?.phone || user?.phone;
    if (phone) {
      this.sms.sendNewOrderToSeller(phone, orderNumber, amount.toFixed(0)).catch((err) =>
        this.logger.warn(`SMS failed for new order to seller ${sellerId}: ${err.message}`),
      );
    }
  }

  private async sendSellerEmail(userId: string, subject: string, body: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user?.email) return;
    await this.email.sendEmail({
      to: user.email,
      subject: `Xelnova: ${subject}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#7c3aed">${subject}</h2><p>Hi ${user.name},</p><p>${body}</p></div>`,
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
