import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.sellerProfile.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.sellerProfile.findUnique({
      where: { slug },
    });
  }

  async findProducts(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId, isActive: true },
      include: { category: true },
    });
  }
}
