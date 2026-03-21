import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string; phone?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async addAddress(
    userId: string,
    address: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      pincode: string;
      landmark?: string;
      type: string;
    },
  ) {
    return this.prisma.address.create({
      data: {
        userId,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        type: (address.type?.toUpperCase() as any) || 'HOME',
      },
    });
  }

  async getWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: { seller: true },
        },
      },
    });
    return wishlist.map((w) => w.product);
  }

  async toggleWishlist(userId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.wishlist.delete({
        where: { userId_productId: { userId, productId } },
      });
      const wishlistIds = (
        await this.prisma.wishlist.findMany({
          where: { userId },
          select: { productId: true },
        })
      ).map((w) => w.productId);
      return { added: false, wishlist: wishlistIds };
    } else {
      await this.prisma.wishlist.create({
        data: { userId, productId },
      });
      const wishlistIds = (
        await this.prisma.wishlist.findMany({
          where: { userId },
          select: { productId: true },
        })
      ).map((w) => w.productId);
      return { added: true, wishlist: wishlistIds };
    }
  }
}
