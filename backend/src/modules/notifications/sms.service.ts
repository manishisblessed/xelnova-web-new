import { Injectable, Logger, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Fortius SMS Template Configuration
 * Based on DLT-approved templates from Fortius SMS Panel
 * 
 * PRODUCTION CHECKLIST:
 * - Templates marked with templateId: '' need DLT approval
 * - Get templates approved at Fortius panel with EXACT message text
 * - Update templateId once approved
 */
export enum SmsTemplateType {
  // ═══════════════════════════════════════════════════════════════════
  // APPROVED TEMPLATES (9) - Ready for production
  // ═══════════════════════════════════════════════════════════════════
  
  // OTP/Auth
  LOGIN_OTP = 'LOGIN_OTP',
  
  // Order Lifecycle - Customer
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_PROCESSING = 'ORDER_PROCESSING',
  ORDER_PACKED = 'ORDER_PACKED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  
  // Payment - Customer
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Seller Alert
  SELF_SHIP_EOD_ALERT = 'SELF_SHIP_EOD_ALERT',

  // ═══════════════════════════════════════════════════════════════════
  // PENDING TEMPLATES - Need DLT approval from Fortius
  // ═══════════════════════════════════════════════════════════════════
  
  // Customer - Account
  WELCOME_REGISTRATION = 'WELCOME_REGISTRATION',
  PASSWORD_RESET_OTP = 'PASSWORD_RESET_OTP',
  
  // Customer - Order Events
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_OUT_FOR_DELIVERY = 'ORDER_OUT_FOR_DELIVERY',
  COD_DELIVERY_OTP = 'COD_DELIVERY_OTP',
  
  // Customer - Returns/Refunds
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  RETURN_APPROVED = 'RETURN_APPROVED',
  RETURN_REJECTED = 'RETURN_REJECTED',
  RETURN_PICKUP_SCHEDULED = 'RETURN_PICKUP_SCHEDULED',
  
  // Customer - Wallet
  WALLET_CREDITED = 'WALLET_CREDITED',
  WALLET_DEBITED = 'WALLET_DEBITED',
  
  // Seller - Account
  SELLER_APPROVED = 'SELLER_APPROVED',
  SELLER_REJECTED = 'SELLER_REJECTED',
  
  // Seller - Orders
  NEW_ORDER_SELLER = 'NEW_ORDER_SELLER',
  
  // Seller - Products
  PRODUCT_APPROVED = 'PRODUCT_APPROVED',
  PRODUCT_REJECTED = 'PRODUCT_REJECTED',
  
  // Seller - Finance
  PAYOUT_PROCESSED = 'PAYOUT_PROCESSED',
  PAYOUT_REJECTED = 'PAYOUT_REJECTED',
  
  // Seller - Inventory
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  
  // Support
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_REPLY = 'TICKET_REPLY',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
}

interface SmsTemplate {
  templateId: string;
  message: string;
  description: string;
  approved: boolean;
}

/**
 * SMS Templates Configuration
 * 
 * APPROVED TEMPLATES: Have valid templateId from Fortius DLT
 * PENDING TEMPLATES: templateId is empty - need to get approved
 */
const SMS_TEMPLATES: Record<SmsTemplateType, SmsTemplate> = {
  // ═══════════════════════════════════════════════════════════════════
  // APPROVED TEMPLATES (9)
  // ═══════════════════════════════════════════════════════════════════

  [SmsTemplateType.LOGIN_OTP]: {
    templateId: '1707177018835749938',
    message: 'XELNOVA: Your OTP is {#var#}. Please do not share this code with anyone. It is valid for 10 minutes.',
    description: 'Login / OTP Verification',
    approved: true,
  },

  [SmsTemplateType.ORDER_PLACED]: {
    templateId: '1707177018842418611',
    message: "XELNOVA: Thank you for your order! Order ID {#var#} placed successfully. Amount Rs. {#var#}. You'll be notified once it is shipped.",
    description: 'Order Placed / Order Confirmation',
    approved: true,
  },

  [SmsTemplateType.ORDER_PROCESSING]: {
    templateId: '1707177018824258746',
    message: 'XELNOVA: Your Order {#var#} is being processed and prepared for dispatch. You will receive shipping updates shortly.',
    description: 'Order Processing',
    approved: true,
  },

  [SmsTemplateType.ORDER_PACKED]: {
    templateId: '1707177018858944064',
    message: 'XELNOVA: Good news! Your Order {#var#} is packed and ready for dispatch.',
    description: 'Order Packed',
    approved: true,
  },

  [SmsTemplateType.ORDER_SHIPPED]: {
    templateId: '1707177018854193139',
    message: 'XELNOVA: Your Order {#var#} has been shipped via {#var#}. Track your shipment here: {#var#}',
    description: 'Order Shipped (With Tracking)',
    approved: true,
  },

  [SmsTemplateType.ORDER_DELIVERED]: {
    templateId: '1707177018845683982',
    message: 'XELNOVA: Order {#var#} delivered successfully. We hope you love it! For support, visit xelnova.in',
    description: 'Order Delivered',
    approved: true,
  },

  [SmsTemplateType.PAYMENT_SUCCESSFUL]: {
    templateId: '1707177018832478298',
    message: 'XELNOVA: Payment of Rs. {#var#} received successfully for Order {#var#}. Thank you for shopping with us.',
    description: 'Payment Successful',
    approved: true,
  },

  [SmsTemplateType.PAYMENT_FAILED]: {
    templateId: '1707177018824455688',
    message: 'XELNOVA: Payment for Order {#var#} was unsuccessful. Please retry to avoid cancellation. Pay now: {#var#}',
    description: 'Payment Failed',
    approved: true,
  },

  [SmsTemplateType.SELF_SHIP_EOD_ALERT]: {
    templateId: '1707177018934270077',
    message: 'XELNOVA: {#var#} Self-ship standard order must be shipped by today EOD to avoid late shipment. View unshipped: https://xelnova.in',
    description: 'Self-Ship EOD Alert (Seller)',
    approved: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // PENDING TEMPLATES - Need DLT Approval
  // ═══════════════════════════════════════════════════════════════════

  // --- Customer Account ---
  [SmsTemplateType.WELCOME_REGISTRATION]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Welcome to Xelnova! Your account has been created successfully. Start shopping at xelnova.in',
    description: 'Welcome / Registration Success',
    approved: false,
  },

  [SmsTemplateType.PASSWORD_RESET_OTP]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your password reset OTP is {#var#}. Valid for 10 minutes. Do not share with anyone.',
    description: 'Password Reset OTP',
    approved: false,
  },

  // --- Customer Order Events ---
  [SmsTemplateType.ORDER_CANCELLED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your order {#var#} has been cancelled. Refund of Rs. {#var#} will be processed within 5-7 days.',
    description: 'Order Cancelled',
    approved: false,
  },

  [SmsTemplateType.ORDER_OUT_FOR_DELIVERY]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Great news! Your order {#var#} is out for delivery today. Keep your phone handy.',
    description: 'Order Out for Delivery',
    approved: false,
  },

  [SmsTemplateType.COD_DELIVERY_OTP]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your delivery OTP for order {#var#} is {#var#}. Share with delivery partner to receive your order.',
    description: 'COD Delivery OTP',
    approved: false,
  },

  // --- Customer Returns/Refunds ---
  [SmsTemplateType.REFUND_PROCESSED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Refund of Rs. {#var#} for order {#var#} has been processed. It will reflect in 5-7 business days.',
    description: 'Refund Processed',
    approved: false,
  },

  [SmsTemplateType.RETURN_APPROVED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your return request for order {#var#} has been approved. Pickup will be scheduled shortly.',
    description: 'Return Request Approved',
    approved: false,
  },

  [SmsTemplateType.RETURN_REJECTED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your return request for order {#var#} was not approved. Reason: {#var#}. Contact support for help.',
    description: 'Return Request Rejected',
    approved: false,
  },

  [SmsTemplateType.RETURN_PICKUP_SCHEDULED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Return pickup for order {#var#} scheduled for {#var#}. Keep the package ready.',
    description: 'Return Pickup Scheduled',
    approved: false,
  },

  // --- Customer Wallet ---
  [SmsTemplateType.WALLET_CREDITED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Rs. {#var#} credited to your Xelnova wallet. New balance: Rs. {#var#}',
    description: 'Wallet Credit',
    approved: false,
  },

  [SmsTemplateType.WALLET_DEBITED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Rs. {#var#} debited from your Xelnova wallet for {#var#}. Balance: Rs. {#var#}',
    description: 'Wallet Debit',
    approved: false,
  },

  // --- Seller Account ---
  [SmsTemplateType.SELLER_APPROVED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Congratulations! Your seller account {#var#} is now approved. Start selling at seller.xelnova.in',
    description: 'Seller Account Approved',
    approved: false,
  },

  [SmsTemplateType.SELLER_REJECTED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your seller verification for {#var#} needs attention. Reason: {#var#}. Update at seller.xelnova.in',
    description: 'Seller Account Rejected',
    approved: false,
  },

  // --- Seller Orders ---
  [SmsTemplateType.NEW_ORDER_SELLER]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: New order! Order {#var#} worth Rs. {#var#} received. Ship by EOD. View at seller.xelnova.in',
    description: 'New Order for Seller',
    approved: false,
  },

  // --- Seller Products ---
  [SmsTemplateType.PRODUCT_APPROVED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your product {#var#} is now live on Xelnova marketplace.',
    description: 'Product Approved',
    approved: false,
  },

  [SmsTemplateType.PRODUCT_REJECTED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your product {#var#} was not approved. Reason: {#var#}. Update at seller.xelnova.in',
    description: 'Product Rejected',
    approved: false,
  },

  // --- Seller Finance ---
  [SmsTemplateType.PAYOUT_PROCESSED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Payout of Rs. {#var#} processed to your bank account. Transaction ref: {#var#}',
    description: 'Payout Processed',
    approved: false,
  },

  [SmsTemplateType.PAYOUT_REJECTED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your payout request of Rs. {#var#} was rejected. Reason: {#var#}. Contact support.',
    description: 'Payout Rejected',
    approved: false,
  },

  // --- Seller Inventory ---
  [SmsTemplateType.LOW_STOCK_ALERT]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Low stock alert! {#var#} products are running low. Restock now at seller.xelnova.in',
    description: 'Low Stock Alert',
    approved: false,
  },

  // --- Support Tickets ---
  [SmsTemplateType.TICKET_CREATED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Support ticket {#var#} created. We will respond within 24 hours. Track at xelnova.in/support',
    description: 'Support Ticket Created',
    approved: false,
  },

  [SmsTemplateType.TICKET_REPLY]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: New reply on your support ticket {#var#}. View at xelnova.in/support',
    description: 'Support Ticket Reply',
    approved: false,
  },

  [SmsTemplateType.TICKET_RESOLVED]: {
    templateId: '', // TODO: Get DLT approval
    message: 'XELNOVA: Your support ticket {#var#} has been resolved. Thank you for contacting us.',
    description: 'Support Ticket Resolved',
    approved: false,
  },
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('FORTIUS_API_KEY')?.trim() || '';
    this.senderId = (this.config.get<string>('FORTIUS_SENDER_ID') || 'XELNVA').trim();
    this.baseUrl = this.config.get<string>('FORTIUS_SMS_URL') || 'https://smsfortius.work/V2/apikey.php';

    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      this.logger.error('FORTIUS_API_KEY is not configured for production!');
    }
  }

  private normalizePhone(phone: string): string {
    let number = phone.replace(/\D/g, '');
    if (number.startsWith('91') && number.length === 12) number = number.slice(2);
    if (number.length !== 10 || !/^[6-9]/.test(number)) {
      throw new Error('Invalid 10-digit Indian mobile number');
    }
    return number;
  }

  private buildMessage(template: SmsTemplate, variables: string[]): string {
    let message = template.message;
    let varIndex = 0;
    while (message.includes('{#var#}') && varIndex < variables.length) {
      message = message.replace('{#var#}', variables[varIndex]);
      varIndex++;
    }
    return message;
  }

  /**
   * Send SMS using Fortius API with retry logic
   */
  async sendSms(phone: string, templateType: SmsTemplateType, variables: string[]): Promise<boolean> {
    const template = SMS_TEMPLATES[templateType];

    if (!template.templateId) {
      this.logger.warn(`[SMS] Template ${templateType} not approved - skipping (needs DLT approval from Fortius)`);
      if (process.env.NODE_ENV !== 'production') {
        const message = this.buildMessage(template, variables);
        this.logger.log(`[DEV SMS - PENDING TEMPLATE] To: ${phone} | ${templateType} | Message: ${message}`);
      }
      return false;
    }

    if (!this.apiKey) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('[SMS] CRITICAL: FORTIUS_API_KEY not set in production!');
        throw new ServiceUnavailableException('SMS service not configured');
      }
      const message = this.buildMessage(template, variables);
      this.logger.log(`[DEV SMS] To: ${phone} | ${templateType} | Message: ${message}`);
      return true;
    }

    let number: string;
    try {
      number = this.normalizePhone(phone);
    } catch (err) {
      this.logger.warn(`[SMS] Invalid phone number: ${phone}`);
      return false;
    }

    const message = this.buildMessage(template, variables);
    const e = encodeURIComponent;
    const url = `${this.baseUrl}?apikey=${e(this.apiKey)}&senderid=${e(this.senderId)}&templateid=${e(template.templateId)}&number=${e(number)}&message=${e(message)}`;

    this.logger.log(`[SMS] Sending ${templateType} | number=${number} | templateId=${template.templateId}`);
    this.logger.debug(`[SMS] Message: "${message}"`);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        this.logger.log(`[SMS] Retry ${attempt}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json, text/plain' },
          signal: controller.signal,
        });
        clearTimeout(timer);

        const raw = await res.text();
        this.logger.debug(`[SMS] Fortius response (HTTP ${res.status}): ${raw.slice(0, 500)}`);

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(raw);
        } catch {
          lastError = new BadGatewayException(`Non-JSON response: ${raw.slice(0, 200)}`);
          continue;
        }

        const code = data.code ?? data.status;
        const codeOk = code === '011' || code === 11 || String(code) === '011';

        if (!codeOk) {
          const desc = (data.description || data.message || data.msg || raw.slice(0, 250)) as string;
          this.logger.error(`[SMS] Fortius rejected | code=${code} | ${desc}`);
          throw new BadGatewayException(`SMS failed (${code}): ${desc}`);
        }

        const msgid = (data.data as { messageid?: string } | undefined)?.messageid;
        this.logger.log(`[SMS] Sent successfully | number=${number} | msgid=${msgid ?? 'n/a'} | type=${templateType}`);
        return true;
      } catch (err) {
        if (err instanceof BadGatewayException) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[SMS] Network error (attempt ${attempt + 1}): ${msg}`);
        lastError = new BadGatewayException(`SMS gateway unreachable: ${msg}`);
      }
    }

    this.logger.error(`[SMS] Failed after ${MAX_RETRIES + 1} attempts`);
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // APPROVED TEMPLATE METHODS (Ready for Production)
  // ═══════════════════════════════════════════════════════════════════

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.LOGIN_OTP, [otp]);
  }

  async sendOrderPlaced(phone: string, orderNumber: string, amount: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.ORDER_PLACED, [orderNumber, amount]);
  }

  async sendOrderProcessing(phone: string, orderNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.ORDER_PROCESSING, [orderNumber]);
  }

  async sendOrderPacked(phone: string, orderNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.ORDER_PACKED, [orderNumber]);
  }

  async sendOrderShipped(phone: string, orderNumber: string, courier: string, trackingUrl: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.ORDER_SHIPPED, [orderNumber, courier, trackingUrl]);
  }

  async sendOrderDelivered(phone: string, orderNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.ORDER_DELIVERED, [orderNumber]);
  }

  async sendPaymentSuccessful(phone: string, amount: string, orderNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.PAYMENT_SUCCESSFUL, [amount, orderNumber]);
  }

  async sendPaymentFailed(phone: string, orderNumber: string, paymentUrl: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.PAYMENT_FAILED, [orderNumber, paymentUrl]);
  }

  async sendSelfShipEodAlert(phone: string, orderCount: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.SELF_SHIP_EOD_ALERT, [orderCount]);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PENDING TEMPLATE METHODS (Will work once DLT approved)
  // ═══════════════════════════════════════════════════════════════════

  // --- Customer Account ---
  async sendWelcome(phone: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.WELCOME_REGISTRATION, []);
  }

  async sendPasswordResetOtp(phone: string, otp: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.PASSWORD_RESET_OTP, [otp]);
  }

  // --- Customer Order Events ---
  async sendOrderCancelled(phone: string, orderNumber: string, refundAmount: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.ORDER_CANCELLED, [orderNumber, refundAmount]);
  }

  async sendOrderOutForDelivery(phone: string, orderNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.ORDER_OUT_FOR_DELIVERY, [orderNumber]);
  }

  async sendCodDeliveryOtp(phone: string, orderNumber: string, otp: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.COD_DELIVERY_OTP, [orderNumber, otp]);
  }

  // --- Customer Returns/Refunds ---
  async sendRefundProcessed(phone: string, amount: string, orderNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.REFUND_PROCESSED, [amount, orderNumber]);
  }

  async sendReturnApproved(phone: string, orderNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.RETURN_APPROVED, [orderNumber]);
  }

  async sendReturnRejected(phone: string, orderNumber: string, reason: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.RETURN_REJECTED, [orderNumber, reason]);
  }

  async sendReturnPickupScheduled(phone: string, orderNumber: string, date: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.RETURN_PICKUP_SCHEDULED, [orderNumber, date]);
  }

  // --- Customer Wallet ---
  async sendWalletCredited(phone: string, amount: string, balance: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.WALLET_CREDITED, [amount, balance]);
  }

  async sendWalletDebited(phone: string, amount: string, purpose: string, balance: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.WALLET_DEBITED, [amount, purpose, balance]);
  }

  // --- Seller Account ---
  async sendSellerApproved(phone: string, storeName: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.SELLER_APPROVED, [storeName]);
  }

  async sendSellerRejected(phone: string, storeName: string, reason: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.SELLER_REJECTED, [storeName, reason]);
  }

  // --- Seller Orders ---
  async sendNewOrderToSeller(phone: string, orderNumber: string, amount: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.NEW_ORDER_SELLER, [orderNumber, amount]);
  }

  // --- Seller Products ---
  async sendProductApproved(phone: string, productName: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.PRODUCT_APPROVED, [productName]);
  }

  async sendProductRejected(phone: string, productName: string, reason: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.PRODUCT_REJECTED, [productName, reason]);
  }

  // --- Seller Finance ---
  async sendPayoutProcessed(phone: string, amount: string, transactionRef: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.PAYOUT_PROCESSED, [amount, transactionRef]);
  }

  async sendPayoutRejected(phone: string, amount: string, reason: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.PAYOUT_REJECTED, [amount, reason]);
  }

  // --- Seller Inventory ---
  async sendLowStockAlert(phone: string, productCount: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.LOW_STOCK_ALERT, [productCount]);
  }

  // --- Support Tickets ---
  async sendTicketCreated(phone: string, ticketNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.TICKET_CREATED, [ticketNumber]);
  }

  async sendTicketReply(phone: string, ticketNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.TICKET_REPLY, [ticketNumber]);
  }

  async sendTicketResolved(phone: string, ticketNumber: string): Promise<boolean> {
    return this.sendSms(phone, SmsTemplateType.TICKET_RESOLVED, [ticketNumber]);
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get status of all SMS templates
   */
  getTemplateStatus(): {
    total: number;
    approved: number;
    pending: number;
    templates: { type: string; description: string; approved: boolean; hasTemplateId: boolean }[];
  } {
    const templates = Object.entries(SMS_TEMPLATES).map(([type, tpl]) => ({
      type,
      description: tpl.description,
      approved: tpl.approved,
      hasTemplateId: !!tpl.templateId,
    }));

    return {
      total: templates.length,
      approved: templates.filter((t) => t.approved).length,
      pending: templates.filter((t) => !t.approved).length,
      templates,
    };
  }

  /**
   * Get list of pending templates for DLT approval
   */
  getPendingTemplates(): { type: string; description: string; message: string }[] {
    return Object.entries(SMS_TEMPLATES)
      .filter(([, tpl]) => !tpl.templateId)
      .map(([type, tpl]) => ({
        type,
        description: tpl.description,
        message: tpl.message,
      }));
  }

  /**
   * Update template ID after DLT approval
   */
  setTemplateId(templateType: SmsTemplateType, templateId: string): void {
    if (SMS_TEMPLATES[templateType]) {
      SMS_TEMPLATES[templateType].templateId = templateId;
      SMS_TEMPLATES[templateType].approved = true;
      this.logger.log(`[SMS] Template ${templateType} updated with ID: ${templateId}`);
    }
  }
}
