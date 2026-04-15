import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';

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
        authProvider: true,
        emailVerified: true,
        phoneVerified: true,
        aadhaarVerified: true,
        aadhaarVerifiedAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, authProvider: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const needsCurrent = user.authProvider === 'EMAIL';
    if (needsCurrent) {
      if (!dto.currentPassword?.trim()) {
        throw new BadRequestException('Current password is required');
      }
      const ok = await bcrypt.compare(dto.currentPassword, user.password);
      if (!ok) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        ...(user.authProvider !== 'EMAIL' ? { authProvider: 'EMAIL' as const } : {}),
      },
    });

    return { ok: true as const };
  }

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string; phone?: string },
  ) {
    if (data.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: data.email, id: { not: userId } },
      });
      if (existing) throw new BadRequestException('Email already in use');
    }
    if (data.phone) {
      const existing = await this.prisma.user.findFirst({
        where: { phone: data.phone, id: { not: userId } },
      });
      if (existing) throw new BadRequestException('Phone number already in use');
    }

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
      district?: string;
      state: string;
      pincode: string;
      landmark?: string;
      type: string;
    },
  ) {
    const VALID_TYPES = ['HOME', 'OFFICE', 'OTHER'] as const;
    const TYPE_ALIASES: Record<string, (typeof VALID_TYPES)[number]> = { WORK: 'OFFICE' };
    const raw = address.type?.toUpperCase() || 'HOME';
    const addressType = VALID_TYPES.includes(raw as any) ? raw : (TYPE_ALIASES[raw] || 'HOME');

    return this.prisma.address.create({
      data: {
        userId,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        district: address.district,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        type: addressType as any,
      },
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    data: {
      fullName?: string;
      phone?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      district?: string;
      state?: string;
      pincode?: string;
      landmark?: string;
      type?: string;
      isDefault?: boolean;
    },
  ) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) throw new NotFoundException('Address not found');

    const updateData: Record<string, unknown> = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1;
    if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.district !== undefined) updateData.district = data.district;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.pincode !== undefined) updateData.pincode = data.pincode;
    if (data.landmark !== undefined) updateData.landmark = data.landmark;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.type !== undefined) {
      const VALID_TYPES = ['HOME', 'OFFICE', 'OTHER'] as const;
      const TYPE_ALIASES: Record<string, (typeof VALID_TYPES)[number]> = { WORK: 'OFFICE' };
      const raw = data.type.toUpperCase();
      updateData.type = VALID_TYPES.includes(raw as any) ? raw : (TYPE_ALIASES[raw] || 'HOME');
    }

    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({ where: { id: addressId }, data: updateData as any });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) throw new NotFoundException('Address not found');

    await this.prisma.address.delete({ where: { id: addressId } });
    return { deleted: true };
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
