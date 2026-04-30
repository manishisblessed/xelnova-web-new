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
  /**
   * Default "From" address for transactional emails (mostly customer-facing
   * messages). Defaults to `XelNova <seller@xelnova.in>` for backward
   * compatibility — override with `EMAIL_FROM`.
   */
  private readonly fromEmail: string;
  /**
   * "From" address used for **every** seller-targeted email (account
   * approval / rejection, new order alerts, product approval / rejection,
   * low-stock alerts, onboarding OTP, etc.). Defaults to
   * `XelNova Seller <seller@xelnova.in>` per product policy.
   *
   * IMPORTANT: this MUST NOT silently fall back to `EMAIL_FROM` — the
   * production deploy sets `EMAIL_FROM=noreply@xelnova.in` for customer
   * transactional mail, and inheriting from it would route seller mail
   * through `noreply@` (the bug that surfaced as "Product Approved" being
   * delivered from `noreply@xelnova.in`). Override with `EMAIL_FROM_SELLER`.
   */
  private readonly sellerFromEmail: string;
  /**
   * Dedicated "From" address for payout-related notifications (seller
   * payouts, payout failures, etc.). Defaults to
   * `XelNova Payments <payments@xelnova.in>`. Override with
   * `EMAIL_PAYMENT_FROM`. Same rule as `sellerFromEmail`: does NOT fall
   * back to `EMAIL_FROM`.
   */
  private readonly paymentFromEmail: string;

  constructor(private readonly config: ConfigService) {
    this.fromEmail = this.config.get('EMAIL_FROM') || 'XelNova <noreply@xelnova.in>';
    this.sellerFromEmail =
      this.config.get('EMAIL_FROM_SELLER') || 'XelNova Seller <seller@xelnova.in>';
    this.paymentFromEmail =
      this.config.get('EMAIL_PAYMENT_FROM') || 'XelNova Payments <payments@xelnova.in>';
  }

  /** Public accessor so call sites that build raw `sendEmail` payloads
   * for a payout email (rare — most go through `sendPayoutNotification`)
   * can route through the same configured payments address. */
  getPaymentFromAddress(): string {
    return this.paymentFromEmail;
  }

  /**
   * Public accessor for the seller "From" address so that other services
   * (notification.service, seller-dashboard, etc.) can reuse the same
   * configured address when calling `sendEmail` directly.
   */
  getSellerFromAddress(): string {
    return this.sellerFromEmail;
  }

  /**
   * Returns a human-friendly greeting name. Guards against the all-too-common
   * footgun of callers passing an email address as the recipient's name (which
   * leads to "Hi user@example.com" greetings).
   *
   * - Empty / whitespace-only input → fallback ("there", "Customer", etc.).
   * - Looks like an email (contains "@") → uses the local-part, splitting on
   *   `. _ - +` and Title-Casing each token (e.g. "john.smith@acme.in" → "John Smith").
   * - Otherwise returns the trimmed name as-is.
   */
  private cleanName(name?: string | null, fallback = 'there'): string {
    const raw = (name ?? '').trim();
    if (!raw) return fallback;
    if (!raw.includes('@')) return raw;
    const local = raw.split('@')[0]?.trim();
    if (!local) return fallback;
    const pretty = local
      .split(/[._\-+]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return pretty || fallback;
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
          <p>Hi ${this.cleanName(name)},</p>
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
          <p>Hi ${this.cleanName(name)},</p>
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
          <p>Hi ${this.cleanName(name)},</p>
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
          <p>Hi ${this.cleanName(name)},</p>
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
      from: this.sellerFromEmail,
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

  async sendSubAdminWelcome(to: string, name: string, tempPassword: string, roleName?: string) {
    const loginUrl = 'https://admin.xelnova.in/login';
    return this.sendEmail({
      to,
      subject: "You've been added as an Admin — XelNova",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff">
          <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:32px 24px;text-align:center">
            <h1 style="color:#ffffff;margin:0;font-size:24px">Welcome to XelNova Admin</h1>
          </div>
          <div style="padding:32px 24px">
            <p style="color:#1e293b;font-size:16px;margin:0 0 16px">Hi ${this.cleanName(name)},</p>
            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
              You have been added as an admin${roleName ? ` with the <strong>${roleName}</strong> role` : ''} on XelNova.
              Use the credentials below to log in and set your new password.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 24px">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;color:#64748b;font-size:13px;width:120px">Email</td>
                  <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600">${to}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b;font-size:13px">Temp Password</td>
                  <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;font-family:monospace;letter-spacing:1px">${tempPassword}</td>
                </tr>
              </table>
            </div>
            <div style="text-align:center;margin:0 0 24px">
              <a href="${loginUrl}"
                 style="display:inline-block;padding:14px 32px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
                Log In to Admin Panel
              </a>
            </div>
            <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin:0 0 24px">
              <p style="color:#92400e;font-size:13px;margin:0;line-height:1.5">
                <strong>Important:</strong> You will be required to change your password on first login.
                Do not share these credentials with anyone.
              </p>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center">
              This is an automated message from XelNova. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendGenericEmail(to: string, subject: string, textBody: string, from?: string) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h1 style="color:#7c3aed">Xelnova</h1>
        ${textBody.split('\n').map((line) => `<p>${line}</p>`).join('')}
      </div>
    `;
    return this.sendEmail({ to, subject, html, ...(from ? { from } : {}) });
  }

  async sendPayoutNotification(to: string, name: string, amount: number, status: string) {
    return this.sendEmail({
      to,
      from: this.paymentFromEmail,
      subject: `Payout ${status === 'PAID' ? 'Processed' : 'Update'} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Payout ${status === 'PAID' ? 'Processed' : 'Update'}</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your payout of <strong>₹${amount}</strong> has been ${status.toLowerCase()}.</p>
          ${status === 'PAID' ? '<p>The amount will be credited to your bank account within 2-3 business days.</p>' : ''}
        </div>
      `,
    });
  }

  // ─── Order Lifecycle Emails ───

  async sendOrderCancelled(to: string, name: string, orderNumber: string, refundAmount: number) {
    return this.sendEmail({
      to,
      subject: `Order #${orderNumber} Cancelled - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Order Cancelled</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your order <strong>#${orderNumber}</strong> has been cancelled.</p>
          <p>Refund of <strong>₹${refundAmount}</strong> will be processed within 5-7 business days.</p>
          <a href="${this.config.get('APP_URL') || 'https://xelnova.in'}/account/orders" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            View Orders
          </a>
        </div>
      `,
    });
  }

  async sendOrderPacked(to: string, name: string, orderNumber: string) {
    return this.sendEmail({
      to,
      subject: `Order #${orderNumber} Packed - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Order Packed!</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Great news! Your order <strong>#${orderNumber}</strong> is packed and ready for dispatch.</p>
          <p>You'll receive tracking details once it's shipped.</p>
        </div>
      `,
    });
  }

  async sendOrderOutForDelivery(to: string, name: string, orderNumber: string) {
    return this.sendEmail({
      to,
      subject: `Order #${orderNumber} Out for Delivery! - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Out for Delivery!</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Exciting news! Your order <strong>#${orderNumber}</strong> is out for delivery today.</p>
          <p>Please keep your phone handy for delivery updates.</p>
        </div>
      `,
    });
  }

  // ─── Payment Emails ───

  async sendPaymentSuccess(to: string, name: string, orderNumber: string, amount: number) {
    return this.sendEmail({
      to,
      subject: `Payment Received for Order #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Payment Successful!</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>We've received your payment of <strong>₹${amount}</strong> for order <strong>#${orderNumber}</strong>.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      `,
    });
  }

  async sendPaymentFailed(to: string, name: string, orderNumber: string, paymentUrl: string) {
    return this.sendEmail({
      to,
      subject: `Payment Failed for Order #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#dc2626">Payment Failed</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your payment for order <strong>#${orderNumber}</strong> was unsuccessful.</p>
          <p>Please retry to avoid order cancellation.</p>
          <a href="${paymentUrl}" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            Retry Payment
          </a>
        </div>
      `,
    });
  }

  // ─── Refund & Return Emails ───

  async sendRefundProcessed(to: string, name: string, orderNumber: string, amount: number) {
    return this.sendEmail({
      to,
      subject: `Refund Processed for Order #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Refund Processed</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your refund of <strong>₹${amount}</strong> for order <strong>#${orderNumber}</strong> has been processed.</p>
          <p>It will reflect in your account within 5-7 business days.</p>
        </div>
      `,
    });
  }

  async sendReturnApproved(to: string, name: string, orderNumber: string) {
    return this.sendEmail({
      to,
      subject: `Return Approved for Order #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Return Approved</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your return request for order <strong>#${orderNumber}</strong> has been approved.</p>
          <p>Pickup will be scheduled shortly. Please keep the item packed and ready.</p>
        </div>
      `,
    });
  }

  async sendReturnRejected(to: string, name: string, orderNumber: string, reason: string) {
    return this.sendEmail({
      to,
      subject: `Return Request Update for Order #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Return Request Update</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your return request for order <strong>#${orderNumber}</strong> could not be approved.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>If you have questions, please contact our support team.</p>
          <a href="${this.config.get('APP_URL') || 'https://xelnova.in'}/support" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            Contact Support
          </a>
        </div>
      `,
    });
  }

  async sendReturnPickupScheduled(to: string, name: string, orderNumber: string, pickupDate: string) {
    return this.sendEmail({
      to,
      subject: `Return Pickup Scheduled for Order #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Pickup Scheduled</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Return pickup for order <strong>#${orderNumber}</strong> has been scheduled.</p>
          <p><strong>Pickup Date:</strong> ${pickupDate}</p>
          <p>Please keep the package ready for pickup.</p>
        </div>
      `,
    });
  }

  // ─── Wallet Emails ───

  async sendWalletCredit(to: string, name: string, amount: number, newBalance: number, reason?: string) {
    return this.sendEmail({
      to,
      subject: `₹${amount} Credited to Your Wallet - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Wallet Credited</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p><strong>₹${amount}</strong> has been added to your Xelnova wallet${reason ? ` (${reason})` : ''}.</p>
          <p><strong>New Balance:</strong> ₹${newBalance}</p>
        </div>
      `,
    });
  }

  // ─── Seller Emails ───

  async sendSellerRejection(to: string, storeName: string, reason?: string) {
    return this.sendEmail({
      to,
      from: this.sellerFromEmail,
      subject: 'Seller Verification Update - XelNova',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Verification Update</h1>
          <p>Your seller account <strong>${storeName}</strong> verification requires attention.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please review and update your details to proceed.</p>
          <a href="${this.config.get('SELLER_URL') || 'https://seller.xelnova.in'}" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            Update Details
          </a>
        </div>
      `,
    });
  }

  async sendNewOrderToSeller(to: string, sellerName: string, orderNumber: string, amount: number) {
    return this.sendEmail({
      to,
      from: this.sellerFromEmail,
      subject: `New Order Received - #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">New Order!</h1>
          <p>Hi ${this.cleanName(sellerName, 'Seller')},</p>
          <p>You have received a new order.</p>
          <p><strong>Order #:</strong> ${orderNumber}</p>
          <p><strong>Amount:</strong> ₹${amount}</p>
          <p>Please process and ship the order soon.</p>
          <a href="${this.config.get('SELLER_URL') || 'https://seller.xelnova.in'}/orders" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            View Order
          </a>
        </div>
      `,
    });
  }

  async sendProductApproved(to: string, sellerName: string, productName: string) {
    return this.sendEmail({
      to,
      from: this.sellerFromEmail,
      subject: `Product Approved - ${productName} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Product Approved!</h1>
          <p>Hi ${this.cleanName(sellerName, 'Seller')},</p>
          <p>Your product <strong>${productName}</strong> has been approved and is now live on the marketplace.</p>
          <a href="${this.config.get('SELLER_URL') || 'https://seller.xelnova.in'}/products" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            View Products
          </a>
        </div>
      `,
    });
  }

  async sendProductRejected(to: string, sellerName: string, productName: string, reason?: string) {
    return this.sendEmail({
      to,
      from: this.sellerFromEmail,
      subject: `Product Review Update - ${productName} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Product Review Update</h1>
          <p>Hi ${this.cleanName(sellerName, 'Seller')},</p>
          <p>Your product <strong>${productName}</strong> was not approved.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please update and resubmit.</p>
          <a href="${this.config.get('SELLER_URL') || 'https://seller.xelnova.in'}/products" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            Edit Product
          </a>
        </div>
      `,
    });
  }

  // ─── Support Ticket Emails ───

  async sendTicketCreated(to: string, name: string, ticketNumber: string) {
    return this.sendEmail({
      to,
      subject: `Support Ticket Created - #${ticketNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Ticket Created</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your support ticket <strong>#${ticketNumber}</strong> has been created.</p>
          <p>We will respond within 24 hours.</p>
          <a href="${this.config.get('APP_URL') || 'https://xelnova.in'}/account/support" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            Track Ticket
          </a>
        </div>
      `,
    });
  }

  async sendTicketReply(to: string, name: string, ticketNumber: string, replierName: string) {
    return this.sendEmail({
      to,
      subject: `New Reply on Ticket #${ticketNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">New Reply</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p><strong>${replierName}</strong> has replied to your support ticket <strong>#${ticketNumber}</strong>.</p>
          <a href="${this.config.get('APP_URL') || 'https://xelnova.in'}/account/support" 
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;margin-top:16px">
            View Reply
          </a>
        </div>
      `,
    });
  }

  async sendTicketResolved(to: string, name: string, ticketNumber: string) {
    return this.sendEmail({
      to,
      subject: `Ticket #${ticketNumber} Resolved - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Ticket Resolved</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your support ticket <strong>#${ticketNumber}</strong> has been resolved.</p>
          <p>Thank you for contacting us. If you need further assistance, feel free to create a new ticket.</p>
        </div>
      `,
    });
  }

  async sendOrderCancelledNotification(to: string, name: string, orderNumber: string, reason?: string) {
    return this.sendEmail({
      to,
      subject: `Order #${orderNumber} Cancelled - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#dc2626">Order Cancelled</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>Your order <strong>#${orderNumber}</strong> has been cancelled by the seller.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you paid for this order, the amount will be refunded to your original payment method within 3-5 business days.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `,
    });
  }

  async sendShipmentCancelledNotification(to: string, name: string, orderNumber: string, reason?: string) {
    return this.sendEmail({
      to,
      subject: `Shipment Cancelled for Order #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#dc2626">Shipment Cancelled</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>The shipment for your order <strong>#${orderNumber}</strong> has been cancelled.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>You will receive a new shipment or refund shortly. We apologize for any inconvenience.</p>
          <p>For more details, please check your order on XelNova or contact our support team.</p>
        </div>
      `,
    });
  }

  async sendShipmentRescheduledNotification(to: string, name: string, orderNumber: string, newDate: string, reason?: string) {
    return this.sendEmail({
      to,
      subject: `Shipment Rescheduled for Order #${orderNumber} - XelNova`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h1 style="color:#7c3aed">Shipment Rescheduled</h1>
          <p>Hi ${this.cleanName(name)},</p>
          <p>The shipment for your order <strong>#${orderNumber}</strong> has been rescheduled.</p>
          <p><strong>New Pickup Date:</strong> ${newDate}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>We will keep you updated on the new shipment status. You can track your order anytime on XelNova.</p>
        </div>
      `,
    });
  }
}
