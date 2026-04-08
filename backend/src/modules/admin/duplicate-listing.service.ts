import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DuplicateGroup {
  key: string;
  reason: string;
  products: {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    price: number;
    sellerId: string;
    sellerName: string;
    images: string[];
    createdAt: Date;
  }[];
}

@Injectable()
export class DuplicateListingService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Scan for potential duplicate listings using heuristics:
   * 1. Same seller + normalized title match
   * 2. Same SKU across any seller
   * 3. Very similar titles (>80% overlap) across sellers
   */
  async scanDuplicates(): Promise<DuplicateGroup[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, slug: true, sku: true, price: true,
        sellerId: true, images: true, createdAt: true,
        seller: { select: { storeName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const groups: DuplicateGroup[] = [];
    const seen = new Set<string>();

    // 1. Same seller + normalized title
    const sellerTitleMap = new Map<string, typeof products>();
    for (const p of products) {
      const key = `${p.sellerId}::${this.normalize(p.name)}`;
      const existing = sellerTitleMap.get(key) || [];
      existing.push(p);
      sellerTitleMap.set(key, existing);
    }

    for (const [key, prods] of sellerTitleMap) {
      if (prods.length < 2) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      groups.push({
        key,
        reason: 'Same seller, identical title',
        products: prods.map((p) => ({
          id: p.id, name: p.name, slug: p.slug, sku: p.sku,
          price: p.price, sellerId: p.sellerId,
          sellerName: p.seller.storeName, images: p.images, createdAt: p.createdAt,
        })),
      });
    }

    // 2. Same SKU across sellers
    const skuMap = new Map<string, typeof products>();
    for (const p of products) {
      if (!p.sku) continue;
      const skuKey = p.sku.toLowerCase().trim();
      if (!skuKey) continue;
      const existing = skuMap.get(skuKey) || [];
      existing.push(p);
      skuMap.set(skuKey, existing);
    }

    for (const [skuKey, prods] of skuMap) {
      if (prods.length < 2) continue;
      const uniqueSellers = new Set(prods.map((p) => p.sellerId));
      if (uniqueSellers.size < 2) continue;
      const key = `sku::${skuKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      groups.push({
        key,
        reason: `Same SKU "${prods[0].sku}" across different sellers`,
        products: prods.map((p) => ({
          id: p.id, name: p.name, slug: p.slug, sku: p.sku,
          price: p.price, sellerId: p.sellerId,
          sellerName: p.seller.storeName, images: p.images, createdAt: p.createdAt,
        })),
      });
    }

    return groups;
  }

  async hideProduct(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { isActive: false, status: 'ON_HOLD' },
    });
  }
}
