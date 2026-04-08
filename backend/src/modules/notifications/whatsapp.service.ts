import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
    this.enabled = !!(this.token && this.phoneNumberId);

    if (!this.enabled) {
      this.logger.warn('[WhatsApp] Not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
    }
  }

  private async sendRequest(body: Record<string, unknown>) {
    if (!this.enabled) {
      this.logger.debug('[WhatsApp] Skipping — not configured');
      return { sent: false, reason: 'not_configured' };
    }

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.text();
        this.logger.error(`[WhatsApp] API error: ${res.status} ${error}`);
        return { sent: false, reason: 'api_error', status: res.status };
      }

      const data = await res.json();
      this.logger.log(`[WhatsApp] Message sent: ${JSON.stringify(data.messages?.[0]?.id)}`);
      return { sent: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      this.logger.error(`[WhatsApp] Send failed: ${err.message}`);
      return { sent: false, reason: err.message };
    }
  }

  async sendTemplate(to: string, templateName: string, languageCode = 'en', components?: any[]) {
    const phone = to.replace(/[^0-9]/g, '');
    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: phone.startsWith('91') ? phone : `91${phone}`,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    };
    return this.sendRequest(body);
  }

  async sendTextMessage(to: string, text: string) {
    const phone = to.replace(/[^0-9]/g, '');
    return this.sendRequest({
      messaging_product: 'whatsapp',
      to: phone.startsWith('91') ? phone : `91${phone}`,
      type: 'text',
      text: { body: text },
    });
  }

  async sendOrderConfirmation(phone: string, orderNumber: string, total: string) {
    return this.sendTemplate(phone, 'order_confirmation', 'en', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: orderNumber },
          { type: 'text', text: total },
        ],
      },
    ]);
  }

  async sendShipmentUpdate(phone: string, orderNumber: string, trackingUrl: string) {
    return this.sendTemplate(phone, 'order_shipped', 'en', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: orderNumber },
          { type: 'text', text: trackingUrl },
        ],
      },
    ]);
  }

  async sendOtp(phone: string, otp: string) {
    return this.sendTemplate(phone, 'otp_verification', 'en', [
      {
        type: 'body',
        parameters: [{ type: 'text', text: otp }],
      },
    ]);
  }

  async sendDeliveryOtp(phone: string, otp: string, orderNumber: string) {
    return this.sendTemplate(phone, 'delivery_otp', 'en', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: orderNumber },
          { type: 'text', text: otp },
        ],
      },
    ]);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
