import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly RETURNABLE_STATUSES = ['DELIVERED'];

  async create(userId: string, orderNumber: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (!ReturnsService.RETURNABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Only delivered orders can be returned. Current status: ${order.status}`,
      );
    }

    const existing = await this.prisma.returnRequest.findFirst({
      where: { orderId: order.id, status: { notIn: ['REJECTED'] } },
    });
    if (existing) {
      throw new BadRequestException(
        'A return request already exists for this order',
      );
    }

    return this.prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId,
        reason,
        refundAmount: order.total,
      },
      include: {
        order: {
          select: { orderNumber: true, total: true, status: true },
        },
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.returnRequest.findMany({
      where: { userId },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            status: true,
            items: {
              include: { product: { select: { name: true, images: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        include: {
          order: {
            select: { orderNumber: true, total: true, status: true },
          },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.returnRequest.count(),
    ]);
    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(
    id: string,
    status: string,
    adminNote?: string,
    refundAmount?: number,
  ) {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!request) throw new NotFoundException('Return request not found');

    const data: Record<string, unknown> = { status, adminNote };
    if (refundAmount !== undefined) data.refundAmount = refundAmount;

    if (status === 'APPROVED') {
      await this.prisma.order.update({
        where: { id: request.orderId },
        data: { status: 'RETURNED' },
      });
    }

    if (status === 'REFUNDED') {
      await this.prisma.order.update({
        where: { id: request.orderId },
        data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
      });
    }

    return this.prisma.returnRequest.update({
      where: { id },
      data: data as any,
      include: {
        order: {
          select: { orderNumber: true, total: true, status: true },
        },
      },
    });
  }

  async scheduleReversePickup(
    id: string,
    courier: string,
    awb?: string,
    trackingUrl?: string,
    pickupDate?: string,
  ) {
    const request = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Return request not found');
    if (request.status !== 'APPROVED') {
      throw new BadRequestException('Return must be approved before scheduling reverse pickup');
    }

    return this.prisma.returnRequest.update({
      where: { id },
      data: {
        reverseCourier: courier,
        reverseAwb: awb || null,
        reverseTrackingUrl: trackingUrl || null,
        reversePickupScheduled: pickupDate ? new Date(pickupDate) : new Date(),
        status: 'PICKED_UP',
      },
      include: {
        order: { select: { orderNumber: true, total: true, status: true } },
      },
    });
  }

  async updateReversePickupStatus(id: string, pickedUp: boolean) {
    const request = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Return request not found');

    return this.prisma.returnRequest.update({
      where: { id },
      data: {
        reversePickedUpAt: pickedUp ? new Date() : null,
        status: pickedUp ? 'PICKED_UP' : request.status,
      },
      include: {
        order: { select: { orderNumber: true, total: true, status: true } },
      },
    });
  }
}
