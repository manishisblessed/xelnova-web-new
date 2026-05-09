import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateReturnDto } from './dto/return.dto';

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly walletService: WalletService,
  ) {}

  private static readonly RETURNABLE_STATUSES = ['DELIVERED'];

  async create(userId: string, dto: CreateReturnDto) {
    const kind = dto.kind ?? 'RETURN';
    const reasonCode = (dto.reasonCode?.trim() || 'OTHER').slice(0, 64);
    const reasonDetail = dto.reason?.trim() || '';
    const description = dto.description?.trim() || null;
    const imageUrls = (dto.imageUrls ?? []).filter((u) => typeof u === 'string' && u.trim()).slice(0, 5);

    if (!reasonDetail && reasonCode === 'OTHER' && !description) {
      throw new BadRequestException('Please select a reason or add a short description');
    }

    const composedReason =
      reasonDetail ||
      (description ? `${reasonCode}: ${description}` : reasonCode);

    const order = await this.prisma.order.findUnique({
      where: { orderNumber: dto.orderNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                isReturnable: true,
                isReplaceable: true,
                returnWindow: true,
                replacementWindow: true,
                returnPolicyPreset: true,
              },
            },
          },
        },
        shipment: true,
      },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (!ReturnsService.RETURNABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Only delivered orders can be returned. Current status: ${order.status}`,
      );
    }

    if (order.items.some((i) => i.product?.returnPolicyPreset === 'NON_RETURNABLE')) {
      throw new BadRequestException('This order includes a non-returnable product');
    }

    if (
      kind === 'RETURN' &&
      order.items.some((i) => i.product?.returnPolicyPreset === 'REPLACEMENT_ONLY')
    ) {
      throw new BadRequestException(
        'One or more items only support replacement — choose replacement instead of return.',
      );
    }

    const deliveredAt =
      order.shipment?.deliveredAt ??
      (order.status === 'DELIVERED' ? order.updatedAt : null);
    if (!deliveredAt) {
      throw new BadRequestException(
        'Delivery date is not on record yet. Please try again in a few hours.',
      );
    }

    const now = new Date();
    const daysSinceDelivery = daysBetween(deliveredAt, now);

    if (kind === 'REPLACEMENT') {
      if (!order.items.every((i) => i.product?.isReplaceable)) {
        throw new BadRequestException(
          'One or more items in this order are not eligible for replacement',
        );
      }
      const windows = order.items.map((i) => {
        const p = i.product;
        return p?.replacementWindow ?? p?.returnWindow ?? 7;
      });
      const allowed = Math.min(...windows);
      if (daysSinceDelivery > allowed) {
        throw new BadRequestException(
          `Replacement window ended (${allowed} days from delivery)`,
        );
      }
    } else {
      if (!order.items.every((i) => i.product?.isReturnable !== false)) {
        throw new BadRequestException(
          'One or more items in this order are not eligible for return',
        );
      }
      const windows = order.items.map((i) => i.product?.returnWindow ?? 7);
      const allowed = Math.min(...windows);
      if (daysSinceDelivery > allowed) {
        throw new BadRequestException(
          `Return window ended (${allowed} days from delivery)`,
        );
      }
    }

    const existing = await this.prisma.returnRequest.findFirst({
      where: { orderId: order.id, status: { notIn: ['REJECTED'] } },
    });
    if (existing) {
      throw new BadRequestException(
        'A return or replacement request already exists for this order',
      );
    }

    const created = await this.prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId,
        kind,
        reasonCode,
        reason: composedReason,
        description,
        imageUrls,
        refundAmount: kind === 'RETURN' ? order.total : null,
      },
      include: {
        order: {
          select: { orderNumber: true, total: true, status: true },
        },
      },
    });

    this.notificationService
      .notifyAllAdmins({
        type: 'ADMIN_RETURN_REQUESTED',
        title: kind === 'REPLACEMENT' ? 'New replacement request' : 'New return request',
        body: `${kind === 'REPLACEMENT' ? 'Replacement' : 'Return'} requested for order #${created.order.orderNumber}.`,
        data: {
          returnRequestId: created.id,
          orderNumber: created.order.orderNumber,
          kind,
        },
      })
      .catch(() => {});

    const products = await this.prisma.product.findMany({
      where: { id: { in: order.items.map((x) => x.productId) } },
      select: { id: true, sellerId: true },
    });
    const sellerIds = [...new Set(products.map((p) => p.sellerId).filter(Boolean))] as string[];
    for (const sellerProfileId of sellerIds) {
      const profile = await this.prisma.sellerProfile.findUnique({
        where: { id: sellerProfileId },
        select: { userId: true, storeName: true },
      });
      if (profile?.userId) {
        this.notificationService
          .notifySellerReturnRequested(
            profile.userId,
            created.order.orderNumber,
            kind,
            reasonCode,
          )
          .catch(() => {});
      }
    }

    if (order.shipment) {
      const history = [...((order.shipment.statusHistory as object[]) || [])];
      history.push({
        status: order.shipment.shipmentStatus,
        timestamp: new Date().toISOString(),
        remark:
          kind === 'REPLACEMENT'
            ? `Buyer requested replacement (${reasonCode})`
            : `Buyer requested return (${reasonCode})`,
        source: 'return_request',
      });
      await this.prisma.shipment.update({
        where: { id: order.shipment.id },
        data: { statusHistory: history as object[] },
      });
    }

    return created;
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

      if (request.kind === 'RETURN') {
        const actualRefundAmount = refundAmount ?? Number(request.refundAmount) ?? Number(request.order.total);
        if (actualRefundAmount > 0) {
          try {
            await this.walletService.refundToWallet(
              request.userId,
              actualRefundAmount,
              request.order.orderNumber,
              'Return approved - refund processed',
            );
            this.logger.log(`Refund of ₹${actualRefundAmount} processed for return ${id}`);
          } catch (err) {
            this.logger.error(`Failed to process refund for return ${id}: ${err.message}`);
          }
        }
      }
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: data as any,
      include: {
        order: {
          select: { orderNumber: true, total: true, status: true },
        },
      },
    });

    const orderNumber = request.order.orderNumber;

    if (status === 'APPROVED') {
      await this.autoScheduleReversePickup(id, request.userId, orderNumber, request.kind);
    }

    try {
      if (status === 'APPROVED') {
        this.notificationService.notifyReturnApproved(request.userId, orderNumber).catch(() => {});
      } else if (status === 'REJECTED') {
        this.notificationService.notifyReturnRejected(request.userId, orderNumber, adminNote || 'No reason provided').catch(() => {});
      } else if (status === 'REFUNDED') {
        this.notificationService.notifyRefundProcessed(request.userId, orderNumber, Number(updated.refundAmount || request.order.total)).catch(() => {});
      } else if (status === 'PICKED_UP') {
        this.notificationService
          .notifyReturnRequestUpdate(request.userId, orderNumber, 'Item picked up for return')
          .catch(() => {});
      } else {
        this.notificationService
          .notifyReturnRequestUpdate(request.userId, orderNumber, `Status: ${status}`)
          .catch(() => {});
      }
    } catch (err) {
      this.logger.warn(`Failed to send return notification: ${err}`);
    }

    return updated;
  }

  /**
   * Books a placeholder reverse pickup slot — couriers assign AWB via ops / admin when integrated.
   */
  private async autoScheduleReversePickup(
    returnId: string,
    userId: string,
    orderNumber: string,
    kind: string,
  ) {
    const pickupAt = new Date();
    pickupAt.setDate(pickupAt.getDate() + 1);

    await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        reverseCourier: 'Xelnova Reverse Logistics',
        reversePickupScheduled: pickupAt,
      },
    });

    const dateLabel = pickupAt.toISOString().split('T')[0];
    this.notificationService
      .notifyReturnPickupScheduled(userId, orderNumber, dateLabel)
      .catch(() => {});

    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { shipment: true, items: true },
    });
    if (order?.shipment) {
      const history = [...((order.shipment.statusHistory as object[]) || [])];
      history.push({
        status: order.shipment.shipmentStatus,
        timestamp: new Date().toISOString(),
        remark:
          kind === 'REPLACEMENT'
            ? `Reverse pickup scheduled (replacement) — ${dateLabel}`
            : `Reverse pickup scheduled (return) — ${dateLabel}`,
        source: 'auto_pickup',
      });
      await this.prisma.shipment.update({
        where: { id: order.shipment.id },
        data: { statusHistory: history as object[] },
      });
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: order?.items.map((i) => i.productId) ?? [] } },
      select: { sellerId: true },
    });
    const sellerIds = [...new Set(products.map((p) => p.sellerId).filter(Boolean))] as string[];
    for (const sid of sellerIds) {
      const profile = await this.prisma.sellerProfile.findUnique({
        where: { id: sid },
        select: { userId: true },
      });
      if (profile?.userId) {
        this.notificationService
          .notifySellerReversePickupScheduled(profile.userId, orderNumber, dateLabel)
          .catch(() => {});
      }
    }
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

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: {
        reverseCourier: courier,
        reverseAwb: awb || null,
        reverseTrackingUrl: trackingUrl || null,
        reversePickupScheduled: pickupDate ? new Date(pickupDate) : new Date(),
        status: 'APPROVED',
      },
      include: {
        order: { select: { orderNumber: true, total: true, status: true } },
      },
    });

    this.notificationService
      .notifyReturnPickupScheduled(
        request.userId,
        updated.order.orderNumber,
        (pickupDate || new Date().toISOString()).split('T')[0],
      )
      .catch(() => {});

    return updated;
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
