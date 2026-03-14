import { Injectable } from '@nestjs/common';
import { products, coupons } from '../../data/mock-data';
import { AddToCartDto, UpdateCartDto } from './dto/cart.dto';

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  compareAtPrice: number;
  quantity: number;
  variant?: string;
  brand: string;
  sellerId: string;
}

interface Cart {
  items: CartItem[];
  coupon: { code: string; discount: number } | null;
}

@Injectable()
export class CartService {
  private cart: Cart = { items: [], coupon: null };

  getCart() {
    const subtotal = this.cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const discount = this.cart.coupon?.discount || 0;
    const shipping = subtotal > 499 ? 0 : 49;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = subtotal - discount + shipping + tax;

    return {
      items: this.cart.items,
      coupon: this.cart.coupon,
      summary: {
        subtotal,
        discount,
        shipping,
        tax,
        total,
        itemCount: this.cart.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    };
  }

  addItem(dto: AddToCartDto) {
    const product = products.find((p) => p.id === dto.productId);
    if (!product) return { error: 'Product not found' };

    const existingIndex = this.cart.items.findIndex(
      (item) =>
        item.productId === dto.productId &&
        item.variant === (dto.variant || undefined),
    );

    if (existingIndex >= 0) {
      this.cart.items[existingIndex].quantity += dto.quantity;
    } else {
      this.cart.items.push({
        productId: product.id,
        productName: product.name,
        productImage: product.images[0],
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        quantity: dto.quantity,
        variant: dto.variant,
        brand: product.brand,
        sellerId: product.sellerId,
      });
    }

    return this.getCart();
  }

  updateItem(dto: UpdateCartDto) {
    const index = this.cart.items.findIndex(
      (item) => item.productId === dto.productId,
    );

    if (index === -1) return { error: 'Item not found in cart' };

    if (dto.quantity === 0) {
      this.cart.items.splice(index, 1);
    } else {
      this.cart.items[index].quantity = dto.quantity;
    }

    return this.getCart();
  }

  removeItem(productId: string) {
    const index = this.cart.items.findIndex(
      (item) => item.productId === productId,
    );

    if (index === -1) return { error: 'Item not found in cart' };

    this.cart.items.splice(index, 1);
    return this.getCart();
  }

  applyCoupon(code: string) {
    const coupon = coupons.find(
      (c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive,
    );

    if (!coupon) return { error: 'Invalid or expired coupon code' };

    const subtotal = this.cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (subtotal < coupon.minOrderAmount) {
      return {
        error: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
      };
    }

    let discount: number;
    if (coupon.discountType === 'percentage') {
      discount = Math.min(
        Math.round((subtotal * coupon.discountValue) / 100),
        coupon.maxDiscount,
      );
    } else {
      discount = coupon.discountValue;
    }

    this.cart.coupon = { code: coupon.code, discount };
    return this.getCart();
  }

  removeCoupon() {
    this.cart.coupon = null;
    return this.getCart();
  }
}
