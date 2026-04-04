import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/order.dto';

interface VariantOption {
  value: string;
  price?: number;
  stock?: number;
  [key: string]: unknown;
}

interface VariantGroup {
  type: string;
  options: VariantOption[];
  [key: string]: unknown;
}

/**
 * Given a product's `variants` JSON and a dash-separated variant string from the
 * client (e.g. "red-l"), resolve the effective price. Returns `undefined` when no
 * option-level price override exists.
 */
function resolveVariantPrice(variants: unknown, variantStr: string | undefined): number | undefined {
  if (!variantStr || !Array.isArray(variants)) return undefined;
  const parts = new Set(variantStr.split('-'));
  for (const group of variants as VariantGroup[]) {
    if (!Array.isArray(group?.options)) continue;
    for (const opt of group.options) {
      if (parts.has(opt.value) && typeof opt.price === 'number') return opt.price;
    }
  }
  return undefined;
}

/**
 * Check that the requested quantity does not exceed available stock.
 * If the variant option has its own `stock`, use that; otherwise fall back to product stock.
 */
function checkVariantStock(
  productStock: number,
  variants: unknown,
  variantStr: string | undefined,
  requestedQty: number,
  productName: string,
): void {
  let available = productStock;
  if (variantStr && Array.isArray(variants)) {
    const parts = new Set(variantStr.split('-'));
    for (const group of variants as VariantGroup[]) {
      if (!Array.isArray(group?.options)) continue;
      for (const opt of group.options) {
        if (parts.has(opt.value) && typeof opt.stock === 'number') {
          available = Math.min(available, opt.stock);
        }
      }
    }
  }
  if (requestedQty > available) {
    throw new BadRequestException(
      `Insufficient stock for "${productName}"${variantStr ? ` (${variantStr})` : ''}: requested ${requestedQty}, available ${available}`,
    );
  }
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrderNumber(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        shippingAddress: true,
      },
    });
    if (!order || order.userId !== userId) return null;
    return order;
  }

  async create(userId: string, dto: CreateOrderDto) {
    const productUpdates: Array<{
      productId: string;
      stockDelta: number;
      variantValue?: string;
      variants: unknown;
    }> = [];

    const orderItems = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        checkVariantStock(product.stock, product.variants, item.variant, item.quantity, product.name);

        const variantPrice = resolveVariantPrice(product.variants, item.variant);
        const price = variantPrice ?? product.price;

        productUpdates.push({
          productId: product.id,
          stockDelta: item.quantity,
          variantValue: item.variant,
          variants: product.variants,
        });

        return {
          productId: item.productId,
          productName: product.name,
          productImage: product.images[0] || '',
          quantity: item.quantity,
          price,
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
      const VALID_TYPES = ['HOME', 'OFFICE', 'OTHER'] as const;
      const TYPE_ALIASES: Record<string, (typeof VALID_TYPES)[number]> = { WORK: 'OFFICE' };
      const rawType = dto.shippingAddress.type?.toUpperCase() || 'HOME';
      const addrType = VALID_TYPES.includes(rawType as any) ? rawType : (TYPE_ALIASES[rawType] || 'HOME');

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
          type: addrType as any,
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

    // Decrement stock on products and variant options
    for (const upd of productUpdates) {
      const updateData: Record<string, unknown> = {
        stock: { decrement: upd.stockDelta },
      };

      if (upd.variantValue && Array.isArray(upd.variants)) {
        const parts = new Set(upd.variantValue.split('-'));
        const updatedVariants = (upd.variants as VariantGroup[]).map((group) => {
          if (!Array.isArray(group.options)) return group;
          return {
            ...group,
            options: group.options.map((opt) => {
              if (parts.has(opt.value) && typeof opt.stock === 'number') {
                return { ...opt, stock: Math.max(0, opt.stock - upd.stockDelta) };
              }
              return opt;
            }),
          };
        });
        updateData.variants = updatedVariants;
      }

      await this.prisma.product.update({
        where: { id: upd.productId },
        data: updateData as any,
      });
    }

    // Clear user's cart after order
    await this.prisma.cartItem.deleteMany({ where: { userId } });

    return order;
  }

  private static readonly CANCELLABLE_STATUSES = ['PENDING', 'PROCESSING', 'CONFIRMED'];

  async cancelOrder(orderNumber: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (!OrdersService.CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Order cannot be cancelled — it is already ${order.status.toLowerCase()}. ` +
        `Only orders in Pending, Processing, or Confirmed status can be cancelled.`,
      );
    }

    // Restore stock for each item
    for (const item of order.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        ...(reason ? { couponCode: order.couponCode } : {}),
      },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        shippingAddress: true,
      },
    });

    return updated;
  }
}
