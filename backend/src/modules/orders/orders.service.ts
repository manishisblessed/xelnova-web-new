import { Injectable } from '@nestjs/common';
import { orders, products, coupons } from '../../data/mock-data';
import { CreateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  private allOrders = [...orders];

  findAll() {
    return this.allOrders
      .filter((o) => o.userId === 'user-1')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  findByOrderNumber(orderNumber: string) {
    return this.allOrders.find((o) => o.orderNumber === orderNumber) || null;
  }

  create(dto: CreateOrderDto) {
    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown Product',
        productImage: product?.images[0] || '',
        quantity: item.quantity,
        price: product?.price || 0,
        variant: item.variant,
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    let discount = 0;
    if (dto.couponCode) {
      const coupon = coupons.find(
        (c) =>
          c.code.toUpperCase() === dto.couponCode!.toUpperCase() && c.isActive,
      );
      if (coupon) {
        if (coupon.discountType === 'percentage') {
          discount = Math.min(
            Math.round((subtotal * coupon.discountValue) / 100),
            coupon.maxDiscount,
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

    const now = new Date();
    const estimatedDelivery = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const newOrder = {
      id: `order-${Date.now()}`,
      orderNumber,
      userId: 'user-1',
      items: orderItems,
      subtotal,
      discount,
      shipping,
      tax,
      total,
      status: 'processing',
      paymentMethod: dto.paymentMethod,
      shippingAddress: {
        ...dto.shippingAddress,
        addressLine2: dto.shippingAddress.addressLine2 || '',
        type: dto.shippingAddress.type,
      },
      createdAt: now.toISOString().split('T')[0],
      estimatedDelivery: estimatedDelivery.toISOString().split('T')[0],
    };

    this.allOrders.push(newOrder);
    return newOrder;
  }
}
