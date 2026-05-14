import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notifications/notification.service';
import {
  detectIntent,
  buildOrderStatusReply,
  buildShippingReply,
  buildReturnReply,
  buildRefundReply,
  buildPaymentIssuesReply,
  buildAccountHelpReply,
  ESCALATION_PROMPT,
  NEEDS_ORDER_PROMPT,
  type OrderContext,
} from './chatbot-intents';

const TICKET_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, avatar: true } },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      sender: { select: { id: true, name: true, avatar: true, role: true } },
    },
  },
};

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── Customer ───

  async createTicket(
    customerId: string,
    subject: string,
    message: string,
    orderNumber?: string,
  ) {
    let orderId: string | undefined;
    if (orderNumber) {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true, userId: true },
      });
      if (!order || order.userId !== customerId) {
        throw new BadRequestException('Order not found');
      }
      orderId = order.id;
    }

    const ticketNumber = `TK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        subject,
        customerId,
        orderId,
        messages: {
          create: {
            senderId: customerId,
            senderRole: 'CUSTOMER',
            message,
            customerVisible: true,
            sellerVisible: false,
          },
        },
      },
      include: TICKET_INCLUDE,
    });

    this.notifyAdminNewTicket(ticket.ticketNumber, subject).catch((e) =>
      this.logger.warn(`Failed to notify admin: ${e.message}`),
    );

    this.notificationService.notifyTicketCreated(customerId, ticket.ticketNumber, ticket.id).catch((err) =>
      this.logger.warn(`Failed to notify customer ticket created: ${err.message}`),
    );

    this.notificationService
      .notifyAllAdmins({
        type: 'ADMIN_SUPPORT_TICKET',
        title: 'New support ticket',
        body: `#${ticket.ticketNumber}: ${subject}`,
        data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, subject },
      })
      .catch((err) => this.logger.warn(`Failed to notify admins of ticket: ${err.message}`));

    return ticket;
  }

  async getCustomerTickets(customerId: string) {
    return this.prisma.ticket.findMany({
      where: { customerId },
      include: {
        customer: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Visible on customer portal: never internal; hide seller thread unless relayed to buyer. */
  private customerMessageWhere(): Record<string, unknown> {
    return {
      isInternal: false,
      customerVisible: true,
      OR: [{ senderRole: { not: 'SELLER' } }, { isForwarded: true }],
    };
  }

  private static RE_SELLER_PREFIX = /^\[Seller\]\s*/i;

  async getCustomerTicketDetail(ticketId: string, customerId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ...TICKET_INCLUDE,
        messages: {
          where: this.customerMessageWhere(),
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, name: true, avatar: true, role: true } },
          },
        },
      },
    });
    if (!ticket || ticket.customerId !== customerId) {
      throw new NotFoundException('Ticket not found');
    }

    let assignedSellerStoreName: string | null = null;
    if (ticket.assignedSellerId) {
      const sp = await this.prisma.sellerProfile.findFirst({
        where: { userId: ticket.assignedSellerId },
        select: { storeName: true },
      });
      assignedSellerStoreName = sp?.storeName ?? null;
    }

    const messages = (ticket.messages || []).map((msg) => {
      const isRelay =
        msg.senderRole === 'ADMIN' &&
        (msg.isForwarded ||
          TicketsService.RE_SELLER_PREFIX.test(msg.message));
      if (!isRelay) return msg;
      return {
        ...msg,
        message: msg.message
          .replace(TicketsService.RE_SELLER_PREFIX, '')
          .trim(),
        senderRole: 'SELLER',
        sender: {
          ...(msg.sender ?? { id: '', avatar: null, role: 'SELLER' }),
          name: assignedSellerStoreName || 'Seller',
        },
      };
    });

    return { ...ticket, messages, assignedSellerStoreName };
  }

  async customerReply(ticketId: string, customerId: string, message: string, attachments?: string[]) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, customerId: true, status: true, ticketNumber: true, subject: true },
    });
    if (!ticket || ticket.customerId !== customerId) {
      throw new NotFoundException('Ticket not found');
    }
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Cannot reply to a closed ticket');
    }

    const [msg] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: { ticketId, senderId: customerId, senderRole: 'CUSTOMER', message, attachments: attachments ?? [], customerVisible: true, sellerVisible: false },
        include: {
          sender: { select: { id: true, name: true, avatar: true, role: true } },
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'OPEN', updatedAt: new Date() },
      }),
    ]);

    this.notificationService
      .notifyAllAdmins({
        type: 'ADMIN_TICKET_CUSTOMER_REPLY',
        title: 'Customer replied on ticket',
        body: `Ticket #${ticket.ticketNumber}: new message from customer.`,
        data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber },
      })
      .catch((err) => this.logger.warn(`Failed to notify admins of ticket reply: ${err.message}`));

    return msg;
  }

  // ─── Admin ───

  async getAllTickets(page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Sellers that may receive this ticket (from linked order line items). */
  async getForwardSellersForTicket(ticket: {
    orderId: string | null;
  }): Promise<{ userId: string; storeName: string }[]> {
    if (!ticket.orderId) return [];

    const items = await this.prisma.orderItem.findMany({
      where: { orderId: ticket.orderId },
      select: { sellerId: true },
    });
    const profileIds = [
      ...new Set(items.map((i) => i.sellerId).filter((id): id is string => !!id)),
    ];
    if (profileIds.length === 0) return [];

    const profiles = await this.prisma.sellerProfile.findMany({
      where: { id: { in: profileIds }, userId: { not: null } },
      select: { userId: true, storeName: true },
    });

    const map = new Map<string, string>();
    for (const p of profiles) {
      if (p.userId) map.set(p.userId, p.storeName);
    }

    return [...map.entries()]
      .map(([userId, storeName]) => ({ userId, storeName }))
      .sort((a, b) => a.storeName.localeCompare(b.storeName));
  }

  async getTicketDetail(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const forwardSellers = await this.getForwardSellersForTicket(ticket);
    return { ...ticket, forwardSellers };
  }

  async adminReply(
    ticketId: string,
    adminId: string,
    message: string,
    isInternal = false,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, customerId: true, status: true, ticketNumber: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const newStatus = isInternal ? ticket.status : 'IN_PROGRESS';

    const [msg] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: adminId,
          senderRole: 'ADMIN',
          message,
          isInternal,
          customerVisible: !isInternal,
          sellerVisible: !isInternal,
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true, role: true } },
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: newStatus as any, updatedAt: new Date() },
      }),
    ]);

    if (!isInternal) {
      this.notifyCustomerReply(ticket.customerId, ticketId).catch((e) =>
        this.logger.warn(`Failed to notify customer: ${e.message}`),
      );
      const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
      this.notificationService.notifyTicketReply(ticket.customerId, ticket.ticketNumber, admin?.name || 'Support', ticketId).catch((err) =>
        this.logger.warn(`Failed to notify ticket reply: ${err.message}`),
      );
    }

    return msg;
  }

  async forwardToSeller(ticketId: string, adminId: string, sellerId?: string, note?: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const allowed = await this.getForwardSellersForTicket(ticket);
    let resolved = sellerId;
    if (!resolved) {
      if (allowed.length === 0) {
        throw new BadRequestException(
          'No seller is linked to this ticket. The customer must have attached an order when opening the ticket.',
        );
      }
      if (allowed.length > 1) {
        throw new BadRequestException('Multiple sellers are on this order. Choose which seller to forward to.');
      }
      resolved = allowed[0].userId;
    } else if (!allowed.some((s) => s.userId === resolved)) {
      throw new BadRequestException('That seller is not associated with this ticket order.');
    }

    const seller = await this.prisma.sellerProfile.findFirst({
      where: { userId: resolved },
      select: { userId: true },
    });
    if (!seller) throw new BadRequestException('Seller not found');

    const forwardBody =
      (note && note.trim()) ||
      'This ticket has been forwarded to your store. Please review and reply — your response will be reviewed by support before sharing with the customer.';

    const updates = [
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedSellerId: resolved,
          assignedAdminId: adminId,
          forwardedAt: new Date(),
          status: 'FORWARDED',
          updatedAt: new Date(),
        },
      }),
      this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: adminId,
          senderRole: 'ADMIN',
          message: `[Forwarded by support → seller]\n${forwardBody}`,
          isInternal: false,
          customerVisible: false,
          sellerVisible: true,
        },
      }),
    ];

    await this.prisma.$transaction(updates);

    this.notificationService.notifyTicketForwarded(resolved, ticket.ticketNumber, ticketId).catch((err) =>
      this.logger.warn(`Failed to notify ticket forwarded: ${err.message}`),
    );

    return this.getTicketDetail(ticketId);
  }

  async forwardSellerReplyToCustomer(
    ticketId: string,
    adminId: string,
    sellerMessageId: string,
    note?: string,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, customerId: true, status: true, ticketNumber: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Cannot forward on a closed ticket');
    }

    const sellerMsg = await this.prisma.ticketMessage.findFirst({
      where: { id: sellerMessageId, ticketId },
    });
    if (!sellerMsg) throw new NotFoundException('Message not found');
    if (sellerMsg.senderRole !== 'SELLER') {
      throw new BadRequestException('Only a seller reply can be forwarded to the customer');
    }
    if (sellerMsg.isInternal) {
      throw new BadRequestException('Cannot forward an internal message');
    }

    const detail = sellerMsg.message.trim();
    const relayBody = note?.trim() ? `${note.trim()}\n\n${detail}` : detail;
    const fullMessage = `[Seller]\n${relayBody}`;

    await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: adminId,
          senderRole: 'ADMIN',
          message: fullMessage,
          isInternal: false,
          isForwarded: true,
          customerVisible: true,
          sellerVisible: false,
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS', updatedAt: new Date() },
      }),
    ]);

    this.notifyCustomerReply(ticket.customerId, ticketId).catch((e) =>
      this.logger.warn(`Failed to notify customer: ${e.message}`),
    );
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true },
    });
    this.notificationService
      .notifyTicketReply(ticket.customerId, ticket.ticketNumber, admin?.name || 'Support', ticketId)
      .catch((err) => this.logger.warn(`Failed to notify ticket reply: ${err.message}`));

    return this.getTicketDetail(ticketId);
  }

  async forwardCustomerMessageToSeller(
    ticketId: string,
    adminId: string,
    customerMessageId: string,
    note?: string,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, assignedSellerId: true, status: true, ticketNumber: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!ticket.assignedSellerId) {
      throw new BadRequestException('Ticket is not assigned to a seller. Forward the ticket first.');
    }
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Cannot forward on a closed ticket');
    }

    const customerMsg = await this.prisma.ticketMessage.findFirst({
      where: { id: customerMessageId, ticketId },
    });
    if (!customerMsg) throw new NotFoundException('Message not found');
    if (customerMsg.senderRole !== 'CUSTOMER') {
      throw new BadRequestException('Only a customer message can be forwarded to the seller');
    }

    const detail = customerMsg.message.trim();
    const relayBody = note?.trim() ? `${note.trim()}\n\n${detail}` : detail;
    const fullMessage = `[Customer]\n${relayBody}`;

    await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: adminId,
          senderRole: 'ADMIN',
          message: fullMessage,
          isInternal: false,
          isForwarded: true,
          customerVisible: false,
          sellerVisible: true,
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'FORWARDED', updatedAt: new Date() },
      }),
    ]);

    this.notificationService
      .notifyTicketForwarded(ticket.assignedSellerId, ticket.ticketNumber, ticketId)
      .catch((err) => this.logger.warn(`Failed to notify seller of forwarded message: ${err.message}`));

    return this.getTicketDetail(ticketId);
  }

  async updateStatus(ticketId: string, status: string, priority?: string) {
    const data: Record<string, unknown> = { status, updatedAt: new Date() };
    if (priority) data.priority = priority;
    if (status === 'CLOSED') data.closedAt = new Date();

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: data as any,
      include: TICKET_INCLUDE,
    });

    this.notificationService.notifyTicketUpdate(ticket.customerId, ticket.ticketNumber, status, ticket.id).catch((err) =>
      this.logger.warn(`Failed to notify ticket update: ${err.message}`),
    );

    return this.getTicketDetail(ticketId);
  }

  // ─── Seller ───

  async getSellerTickets(sellerId: string) {
    return this.prisma.ticket.findMany({
      where: { assignedSellerId: sellerId },
      include: {
        customer: { select: { id: true, name: true } },
        messages: {
          where: { isInternal: false, sellerVisible: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private static RE_CUSTOMER_PREFIX = /^\[Customer\]\s*/i;

  async getSellerTicketDetail(ticketId: string, sellerId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ...TICKET_INCLUDE,
        messages: {
          where: { isInternal: false, sellerVisible: true },
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, name: true, avatar: true, role: true } },
          },
        },
      },
    });
    if (!ticket || ticket.assignedSellerId !== sellerId) {
      throw new ForbiddenException('Ticket not assigned to you');
    }

    const customerName = ticket.customer?.name || 'Customer';
    const messages = (ticket.messages || []).map((msg) => {
      const isRelay =
        msg.senderRole === 'ADMIN' &&
        (msg.isForwarded ||
          TicketsService.RE_CUSTOMER_PREFIX.test(msg.message));
      if (!isRelay) return msg;
      return {
        ...msg,
        message: msg.message
          .replace(TicketsService.RE_CUSTOMER_PREFIX, '')
          .trim(),
        senderRole: 'CUSTOMER',
        sender: {
          ...(msg.sender ?? { id: '', avatar: null, role: 'CUSTOMER' }),
          name: customerName,
        },
      };
    });

    return { ...ticket, messages };
  }

  async sellerReply(ticketId: string, sellerId: string, message: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, assignedSellerId: true, status: true },
    });
    if (!ticket || ticket.assignedSellerId !== sellerId) {
      throw new ForbiddenException('Ticket not assigned to you');
    }

    const [msg] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: sellerId,
          senderRole: 'SELLER',
          message,
          customerVisible: false,
          sellerVisible: true,
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true, role: true } },
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'SELLER_REPLIED',
          updatedAt: new Date(),
        },
      }),
    ]);

    const tn = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { ticketNumber: true },
    });

    this.notificationService
      .notifyTicketSellerReplyAdmins(tn?.ticketNumber || '', ticketId)
      .catch((err) => this.logger.warn(`Failed to notify admins of seller reply: ${err.message}`));

    return msg;
  }

  // ─── Email helpers ───

  private async notifyAdminNewTicket(ticketNumber: string, subject: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
      take: 5,
    });
    for (const admin of admins) {
      if (!admin.email) continue;
      await this.emailService.sendEmail({
        to: admin.email,
        subject: `New Support Ticket #${ticketNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#7c3aed">New Support Ticket</h2>
            <p>A customer has created a new support ticket:</p>
            <p><strong>#${ticketNumber}</strong> — ${subject}</p>
            <p>Please review it in the admin panel.</p>
          </div>
        `,
      });
    }
  }

  private async notifyCustomerReply(customerId: string, ticketId: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { email: true, name: true },
    });
    if (!customer?.email) return;

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { ticketNumber: true, subject: true },
    });

    await this.emailService.sendEmail({
      to: customer.email,
      subject: `Reply on Ticket #${ticket?.ticketNumber || ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#7c3aed">Support Update</h2>
          <p>Hi ${customer.name},</p>
          <p>There's a new reply on your support ticket <strong>#${ticket?.ticketNumber}</strong> — "${ticket?.subject}".</p>
          <p>Please check your account for the full response.</p>
        </div>
      `,
    });
  }

  // ─── Chatbot ───

  /**
   * Resolve a customer message via the chatbot. Returns the bot reply
   * and, when it can't resolve, auto-creates a ticket for human follow-up.
   */
  async chatMessage(
    customerId: string,
    message: string,
    orderNumber?: string,
  ): Promise<{ resolved: boolean; reply: string; ticketId?: string; suggestedSubject?: string }> {
    const { intent, needsOrder } = detectIntent(message);

    if (intent === 'PAYMENT_ISSUES') {
      return { resolved: true, reply: buildPaymentIssuesReply() };
    }
    if (intent === 'ACCOUNT_HELP') {
      return { resolved: true, reply: buildAccountHelpReply() };
    }

    if (needsOrder && !orderNumber) {
      return { resolved: false, reply: NEEDS_ORDER_PROMPT, suggestedSubject: message.slice(0, 80) };
    }

    if (needsOrder && orderNumber) {
      const order = await this.prisma.order.findFirst({
        where: { orderNumber, userId: customerId },
        include: {
          shipment: {
            select: {
              shipmentStatus: true,
              courierProvider: true,
              awbNumber: true,
              trackingUrl: true,
              pickupDate: true,
              deliveredAt: true,
            },
          },
          returnRequests: {
            select: {
              status: true,
              kind: true,
              refundAmount: true,
              reverseAwb: true,
              reverseTrackingUrl: true,
            },
          },
        },
      });

      if (!order) {
        return {
          resolved: false,
          reply: `I couldn't find order #${orderNumber} linked to your account. Please double-check the order number and try again, or type **"talk to support"** for help.`,
          suggestedSubject: `Order inquiry: ${orderNumber}`,
        };
      }

      const ctx: OrderContext = {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        createdAt: order.createdAt,
        shipment: order.shipment,
        returnRequests: order.returnRequests,
      };

      switch (intent) {
        case 'ORDER_STATUS':
          return { resolved: true, reply: buildOrderStatusReply(ctx) };
        case 'SHIPPING_DETAILS':
          return { resolved: true, reply: buildShippingReply(ctx) };
        case 'RETURN_REPLACEMENT':
          return { resolved: true, reply: buildReturnReply(ctx) };
        case 'REFUND_STATUS':
          return { resolved: true, reply: buildRefundReply(ctx) };
        default:
          break;
      }
    }

    // UNKNOWN intent or unresolved — escalate to a support ticket
    const subject = message.length > 60 ? message.slice(0, 57) + '...' : message;
    const ticket = await this.createTicket(customerId, subject, message, orderNumber);

    return {
      resolved: false,
      reply: ESCALATION_PROMPT,
      ticketId: ticket.id,
      suggestedSubject: subject,
    };
  }
}
