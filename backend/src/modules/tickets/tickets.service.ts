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
          },
        },
      },
      include: TICKET_INCLUDE,
    });

    this.notifyAdminNewTicket(ticket.ticketNumber, subject).catch((e) =>
      this.logger.warn(`Failed to notify admin: ${e.message}`),
    );

    this.notificationService.notifyTicketCreated(customerId, ticket.ticketNumber).catch((err) =>
      this.logger.warn(`Failed to notify customer ticket created: ${err.message}`),
    );

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

  async getCustomerTicketDetail(ticketId: string, customerId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ...TICKET_INCLUDE,
        messages: {
          where: { isInternal: false },
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
    return ticket;
  }

  async customerReply(ticketId: string, customerId: string, message: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, customerId: true, status: true },
    });
    if (!ticket || ticket.customerId !== customerId) {
      throw new NotFoundException('Ticket not found');
    }
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Cannot reply to a closed ticket');
    }

    const [msg] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: { ticketId, senderId: customerId, senderRole: 'CUSTOMER', message },
        include: {
          sender: { select: { id: true, name: true, avatar: true, role: true } },
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'OPEN', updatedAt: new Date() },
      }),
    ]);

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

  async getTicketDetail(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
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
      this.notificationService.notifyTicketReply(ticket.customerId, ticket.ticketNumber, admin?.name || 'Support').catch((err) =>
        this.logger.warn(`Failed to notify ticket reply: ${err.message}`),
      );
    }

    return msg;
  }

  async forwardToSeller(ticketId: string, sellerId: string, adminId: string, note?: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const seller = await this.prisma.sellerProfile.findFirst({
      where: { userId: sellerId },
      select: { userId: true },
    });
    if (!seller) throw new BadRequestException('Seller not found');

    const updates: unknown[] = [
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { assignedSellerId: sellerId, assignedAdminId: adminId, updatedAt: new Date() },
      }),
    ];

    if (note) {
      updates.push(
        this.prisma.ticketMessage.create({
          data: {
            ticketId,
            senderId: adminId,
            senderRole: 'ADMIN',
            message: `[Forwarded to seller] ${note}`,
            isInternal: true,
          },
        }),
      );
    }

    await this.prisma.$transaction(updates as any);

    this.notificationService.notifyTicketForwarded(sellerId, ticket.ticketNumber).catch((err) =>
      this.logger.warn(`Failed to notify ticket forwarded: ${err.message}`),
    );

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

    this.notificationService.notifyTicketUpdate(ticket.customerId, ticket.ticketNumber, status).catch((err) =>
      this.logger.warn(`Failed to notify ticket update: ${err.message}`),
    );

    return ticket;
  }

  // ─── Seller ───

  async getSellerTickets(sellerId: string) {
    return this.prisma.ticket.findMany({
      where: { assignedSellerId: sellerId },
      include: {
        customer: { select: { id: true, name: true } },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSellerTicketDetail(ticketId: string, sellerId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ...TICKET_INCLUDE,
        messages: {
          where: { isInternal: false },
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
    return ticket;
  }

  async sellerReply(ticketId: string, sellerId: string, message: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, assignedSellerId: true, status: true },
    });
    if (!ticket || ticket.assignedSellerId !== sellerId) {
      throw new ForbiddenException('Ticket not assigned to you');
    }

    return this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: sellerId,
        senderRole: 'SELLER',
        message,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
  }

  // ─── Email helpers ───

  private async notifyAdminNewTicket(ticketNumber: string, subject: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
      take: 5,
    });
    for (const admin of admins) {
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
}
