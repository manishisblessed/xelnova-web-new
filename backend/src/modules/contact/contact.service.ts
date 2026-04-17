import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

const escapeHtml = (raw: string) =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  private get supportInbox(): string {
    return this.config.get<string>('SUPPORT_INBOX') || 'support@xelnova.in';
  }

  private get fromAddress(): string {
    return this.config.get<string>('CONTACT_FROM') || 'Xelnova <seller@xelnova.in>';
  }

  async sendContactMessage(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
    phone?: string;
  }) {
    const safeName = escapeHtml(input.name);
    const safeEmail = escapeHtml(input.email);
    const safeSubject = escapeHtml(input.subject);
    const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br/>');
    const safePhone = input.phone ? escapeHtml(input.phone) : '';

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1f2937">
        <h2 style="color:#7c3aed;margin:0 0 16px">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin:0 0 16px">
          <tr><td style="padding:8px 0;width:120px;color:#6b7280"><strong>Name</strong></td><td style="padding:8px 0">${safeName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          ${safePhone ? `<tr><td style="padding:8px 0;color:#6b7280"><strong>Phone</strong></td><td style="padding:8px 0">${safePhone}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280"><strong>Subject</strong></td><td style="padding:8px 0">${safeSubject}</td></tr>
        </table>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;line-height:1.55">
          ${safeMessage}
        </div>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">
          This message was sent from the Xelnova contact form. Reply directly to ${safeEmail} to respond to the customer.
        </p>
      </div>
    `;

    await this.emailService.sendEmail({
      to: this.supportInbox,
      from: this.fromAddress,
      subject: `[Xelnova Contact] ${input.subject}`,
      html: adminHtml,
    });

    const ackHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937">
        <h2 style="color:#7c3aed;margin:0 0 12px">Thanks for reaching out, ${safeName}!</h2>
        <p>We have received your message and our team will respond within 24 hours.</p>
        <p style="margin-top:16px;color:#6b7280;font-size:13px"><strong>Your message:</strong></p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;line-height:1.55;color:#374151">
          ${safeMessage}
        </div>
        <p style="margin-top:24px">Need urgent help? Call us at <a href="tel:+919259131155">+91 9259131155</a> (Mon\u2013Sat, 9AM\u20136PM IST).</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">\u2014 Xelnova Support</p>
      </div>
    `;

    try {
      await this.emailService.sendEmail({
        to: input.email,
        from: this.fromAddress,
        subject: 'We received your message - Xelnova',
        html: ackHtml,
      });
    } catch (e) {
      this.logger.warn(`Failed to send contact acknowledgement to ${input.email}: ${(e as Error).message}`);
    }

    return { delivered: true };
  }

  async subscribeNewsletter(email: string) {
    const safeEmail = escapeHtml(email);

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937">
        <h2 style="color:#7c3aed;margin:0 0 12px">New Newsletter Subscriber</h2>
        <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <p style="color:#9ca3af;font-size:12px">Subscribed via xelnova.in footer.</p>
      </div>
    `;

    await this.emailService.sendEmail({
      to: this.supportInbox,
      from: this.fromAddress,
      subject: '[Xelnova] New Newsletter Subscriber',
      html: adminHtml,
    });

    const welcomeHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937">
        <h2 style="color:#7c3aed;margin:0 0 12px">You\u2019re on the list \u{1F389}</h2>
        <p>Thanks for subscribing to the Xelnova newsletter.</p>
        <p>Watch your inbox for exclusive offers, new arrivals and insider-only discounts.</p>
        <p style="margin-top:24px">
          <a href="${this.config.get('APP_URL') || 'https://xelnova.in'}"
             style="display:inline-block;padding:12px 22px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            Start shopping
          </a>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">If you didn\u2019t subscribe, you can ignore this email.</p>
      </div>
    `;

    try {
      await this.emailService.sendEmail({
        to: email,
        from: this.fromAddress,
        subject: 'Welcome to the Xelnova newsletter',
        html: welcomeHtml,
      });
    } catch (e) {
      this.logger.warn(`Failed to send newsletter welcome to ${email}: ${(e as Error).message}`);
    }

    return { subscribed: true };
  }
}
