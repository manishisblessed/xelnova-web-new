import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class EmailService {
  /** Lazily created so the app can boot without RESEND_API_KEY (local dev). */
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    this.fromEmail = this.config.get('EMAIL_FROM') || 'XelNova <noreply@xelnova.in>';
  }

  private getResend(): Resend {
    if (this.resend) return this.resend;
    const key = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (!key || key === 're_xxxxx') {
      throw new ServiceUnavailableException(
        'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM on the backend.',
      );
    }
    this.resend = new Resend(key);
    return this.resend;
  }

  async sendEmail(options: EmailOptions) {
    try {
      const result = await this.getResend().emails.send({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  async sendWelcome(to: string, name: string) {
    return this.sendEmail({
      to,
      subject: 'Welcome to XelNova!',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Welcome to XelNova!</h1>
          <p>Hi ${name},</p>
          <p>Thank you for joining XelNova marketplace. We're excited to have you!</p>
          <p>Start exploring our amazing collection of products from verified sellers.</p>
          <a href="${this.config.get('APP_URL') || 'http://localhost:3000'}" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            Start Shopping
          </a>
        </div>
      `,
    });
  }

  async sendOrderConfirmation(to: string, name: string, order: { orderNumber: string; total: number; items: { name: string; quantity: number; price: number }[] }) {
    const itemsHtml = order.items
      .map((item) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td><td style="padding:8px;border-bottom:1px solid #eee">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee">₹${item.price}</td></tr>`)
      .join('');

    return this.sendEmail({
      to,
      subject: `Order Confirmed - #${order.orderNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Order Confirmed!</h1>
          <p>Hi ${name},</p>
          <p>Your order <strong>#${order.orderNumber}</strong> has been confirmed.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead><tr style="background:#f5f3ff"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px">Qty</th><th style="padding:8px">Price</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="font-size:18px"><strong>Total: ₹${order.total}</strong></p>
          <p>We'll notify you when your order ships.</p>
        </div>
      `,
    });
  }

  async sendOrderStatusUpdate(to: string, name: string, orderNumber: string, status: string) {
    const statusLabels: Record<string, string> = {
      PROCESSING: 'Being Processed',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      REFUNDED: 'Refunded',
    };

    return this.sendEmail({
      to,
      subject: `Order #${orderNumber} - ${statusLabels[status] || status}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Order Update</h1>
          <p>Hi ${name},</p>
          <p>Your order <strong>#${orderNumber}</strong> status has been updated to: <strong>${statusLabels[status] || status}</strong></p>
          <a href="${this.config.get('APP_URL') || 'http://localhost:3000'}/account/orders" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            View Order
          </a>
        </div>
      `,
    });
  }

  async sendPasswordReset(to: string, name: string, resetToken: string) {
    const resetUrl = `${this.config.get('APP_URL') || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    return this.sendEmail({
      to,
      subject: 'Reset Your Password - XelNova',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Password Reset</h1>
          <p>Hi ${name},</p>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <a href="${resetUrl}" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            Reset Password
          </a>
          <p style="margin-top:16px;color:#666;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  }

  async sendSellerApproval(to: string, storeName: string) {
    return this.sendEmail({
      to,
      subject: 'Your Seller Account is Approved! - XelNova',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Congratulations!</h1>
          <p>Your store <strong>${storeName}</strong> has been approved on XelNova.</p>
          <p>You can now start listing your products and reach millions of customers.</p>
          <a href="${this.config.get('SELLER_URL') || 'http://localhost:3001'}" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            Go to Seller Dashboard
          </a>
        </div>
      `,
    });
  }

  async sendPayoutNotification(to: string, name: string, amount: number, status: string) {
    return this.sendEmail({
      to,
      subject: `Payout ${status === 'PAID' ? 'Processed' : 'Update'} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Payout ${status === 'PAID' ? 'Processed' : 'Update'}</h1>
          <p>Hi ${name},</p>
          <p>Your payout of <strong>₹${amount}</strong> has been ${status.toLowerCase()}.</p>
          ${status === 'PAID' ? '<p>The amount will be credited to your bank account within 2-3 business days.</p>' : ''}
        </div>
      `,
    });
  }
}
