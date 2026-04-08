import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PricingFlag {
  productId: string;
  productName: string;
  sku: string | null;
  sellerId: string;
  sellerName: string;
  price: number;
  compareAtPrice: number | null;
  reason: string;
  severity: 'warning' | 'critical';
}

@Injectable()
export class PricingCheckService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scan active products for pricing anomalies:
   * 1. Price is 0 or negative
   * 2. Price higher than compareAtPrice (inverted discount)
   * 3. Extreme discount (>80% off compareAtPrice)
   * 4. Suspiciously low price (<₹1)
   */
  async scanPricingIssues(): Promise<PricingFlag[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, status: 'ACTIVE' },
      select: {
        id: true, name: true, sku: true, price: true, compareAtPrice: true,
        sellerId: true,
        seller: { select: { storeName: true } },
      },
    });

    const flags: PricingFlag[] = [];

    for (const p of products) {
      const base = {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        sellerId: p.sellerId,
        sellerName: p.seller.storeName,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
      };

      if (p.price <= 0) {
        flags.push({ ...base, reason: 'Price is zero or negative', severity: 'critical' });
        continue;
      }

      if (p.price < 1) {
        flags.push({ ...base, reason: `Suspiciously low price: ₹${p.price}`, severity: 'warning' });
      }

      if (p.compareAtPrice && p.price > p.compareAtPrice) {
        flags.push({ ...base, reason: 'Price exceeds compare-at price (inverted discount)', severity: 'warning' });
      }

      if (p.compareAtPrice && p.compareAtPrice > 0) {
        const discountPct = ((p.compareAtPrice - p.price) / p.compareAtPrice) * 100;
        if (discountPct > 80) {
          flags.push({ ...base, reason: `Extreme discount: ${discountPct.toFixed(0)}% off`, severity: 'warning' });
        }
      }
    }

    return flags.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1));
  }
}
