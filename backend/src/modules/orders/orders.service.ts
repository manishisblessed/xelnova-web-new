import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, shippingAddress: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrderNumber(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, shippingAddress: true },
    });
    if (!order || order.userId !== userId) return null;
    return order;
  }

  async create(userId: string, dto: CreateOrderDto) {
    const orderItems = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown Product',
          productImage: product?.images[0] || '',
          quantity: item.quantity,
          price: product?.price || 0,
          variant: item.variant,
        };
      }),
    );

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    let discount = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.toUpperCase() },
      });
      if (coupon && coupon.isActive) {
        if (coupon.discountType === 'PERCENTAGE') {
          discount = Math.min(
            Math.round((subtotal * coupon.discountValue) / 100),
            coupon.maxDiscount || Infinity,
          );
        } else {
          discount = coupon.discountValue;
        }
      }
    }

    const shipping = subtotal > 499 ? 0 : 49;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = subtotal - discount + shipping + tax;

    const orderNumber = `XN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    let shippingAddressId: string | undefined;

    const existingAddress = await this.prisma.address.findFirst({
      where: {
        userId,
        addressLine1: dto.shippingAddress.addressLine1,
        pincode: dto.shippingAddress.pincode,
      },
    });

    if (existingAddress) {
      shippingAddressId = existingAddress.id;
    } else {
      const newAddress = await this.prisma.address.create({
        data: {
          userId,
          fullName: dto.shippingAddress.fullName,
          phone: dto.shippingAddress.phone,
          addressLine1: dto.shippingAddress.addressLine1,
          addressLine2: dto.shippingAddress.addressLine2,
          city: dto.shippingAddress.city,
          state: dto.shippingAddress.state,
          pincode: dto.shippingAddress.pincode,
          landmark: dto.shippingAddress.landmark,
          type: (dto.shippingAddress.type?.toUpperCase() as any) || 'HOME',
        },
      });
      shippingAddressId = newAddress.id;
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        status: 'PROCESSING',
        paymentMethod: dto.paymentMethod,
        shippingAddressId,
        couponCode: dto.couponCode,
        estimatedDelivery,
        items: {
          create: orderItems,
        },
      },
      include: { items: true, shippingAddress: true },
    });

    // Clear user's cart after order
    await this.prisma.cartItem.deleteMany({ where: { userId } });

    return order;
  }
}
