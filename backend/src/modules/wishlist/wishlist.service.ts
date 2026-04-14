import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, price: true, compareAtPrice: true,
            images: true, rating: true, reviewCount: true, brand: true, stock: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((w) => w.product);
  }

  async getWishlistIds(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return items.map((w) => w.productId);
  }

  private async validateProduct(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
  }

  async toggle(userId: string, productId: string) {
    await this.validateProduct(productId);
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.wishlist.delete({
        where: { userId_productId: { userId, productId } },
      });
      return { added: false, productId };
    }

    await this.prisma.wishlist.create({
      data: { userId, productId },
    });
    return { added: true, productId };
  }

  async add(userId: string, productId: string) {
    await this.validateProduct(productId);
    await this.prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { added: true, productId };
  }

  async remove(userId: string, productId: string) {
    await this.prisma.wishlist.deleteMany({
      where: { userId, productId },
    });
    return { removed: true, productId };
  }
}
