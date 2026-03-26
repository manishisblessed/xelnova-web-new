import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      ...cat,
      productCount: cat._count.products,
      _count: undefined,
    }));
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: true, parent: true },
    });

    if (!category) return null;

    const categoryIds = [category.id, ...category.children.map((c) => c.id)];

    const products = await this.prisma.product.findMany({
      where: { categoryId: { in: categoryIds }, isActive: true },
      include: { seller: true },
    });

    return { category, products };
  }
}
