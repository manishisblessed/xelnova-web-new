import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const all = await this.prisma.category.findMany({
      include: { _count: { select: { products: { where: { isActive: true } } } } },
      orderBy: { name: 'asc' },
    });

    type Row = (typeof all)[number];
    type Node = Omit<Row, '_count'> & { children: Node[]; productCount: number };

    const byId = new Map<string, Node>();
    for (const c of all) {
      const { _count, ...rest } = c;
      byId.set(c.id, { ...rest, children: [], productCount: _count.products });
    }

    const roots: Node[] = [];
    for (const c of all) {
      const node = byId.get(c.id)!;
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
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
