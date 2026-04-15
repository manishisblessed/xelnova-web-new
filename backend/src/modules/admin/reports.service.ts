import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ReportQuery {
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateFilter(query: ReportQuery) {
    const filter: Record<string, Date> = {};
    if (query.dateFrom) filter.gte = new Date(query.dateFrom);
    if (query.dateTo) filter.lte = new Date(query.dateTo);
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  async getGstReport(query: ReportQuery) {
    const createdAt = this.dateFilter(query);
    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        status: { notIn: ['CANCELLED'] },
        ...(createdAt ? { createdAt } : {}),
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, hsnCode: true, gstRate: true, sellerId: true } },
          },
        },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const rows: {
      orderNumber: string; date: string; customerName: string; productName: string;
      hsnCode: string; quantity: number; unitPrice: number; taxableValue: number;
      gstRate: number; cgst: number; sgst: number; igst: number; totalGst: number; totalAmount: number;
    }[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        const gstRate = item.product?.gstRate ?? 18;
        const taxableValue = item.price * item.quantity;
        const gstAmount = taxableValue * (gstRate / (100 + gstRate));
        const cgst = gstAmount / 2;
        const sgst = gstAmount / 2;

        rows.push({
          orderNumber: order.orderNumber,
          date: order.createdAt.toISOString().split('T')[0],
          customerName: order.user.name,
          productName: item.productName,
          hsnCode: item.product?.hsnCode || '',
          quantity: item.quantity,
          unitPrice: item.price,
          taxableValue,
          gstRate,
          cgst: Math.round(cgst * 100) / 100,
          sgst: Math.round(sgst * 100) / 100,
          igst: 0,
          totalGst: Math.round(gstAmount * 100) / 100,
          totalAmount: taxableValue,
        });
      }
    }

    const totals = rows.reduce(
      (acc, r) => ({
        taxableValue: acc.taxableValue + r.taxableValue,
        cgst: acc.cgst + r.cgst,
        sgst: acc.sgst + r.sgst,
        totalGst: acc.totalGst + r.totalGst,
        totalAmount: acc.totalAmount + r.totalAmount,
      }),
      { taxableValue: 0, cgst: 0, sgst: 0, totalGst: 0, totalAmount: 0 },
    );

    return { rows, totals };
  }

  async getGstReportCsv(query: ReportQuery): Promise<string> {
    const report = await this.getGstReport(query);
    const header = 'Order Number,Date,Customer,Product,HSN Code,Qty,Unit Price,Taxable Value,GST Rate %,CGST,SGST,IGST,Total GST,Total Amount';
    const lines = report.rows.map((r) =>
      [
        r.orderNumber, r.date, `"${r.customerName}"`, `"${r.productName}"`, r.hsnCode,
        r.quantity, r.unitPrice.toFixed(2), r.taxableValue.toFixed(2), r.gstRate,
        r.cgst.toFixed(2), r.sgst.toFixed(2), r.igst.toFixed(2), r.totalGst.toFixed(2), r.totalAmount.toFixed(2),
      ].join(','),
    );
    lines.push('');
    lines.push(`,,,,,,Total,${report.totals.taxableValue.toFixed(2)},,${report.totals.cgst.toFixed(2)},${report.totals.sgst.toFixed(2)},0,${report.totals.totalGst.toFixed(2)},${report.totals.totalAmount.toFixed(2)}`);
    return [header, ...lines].join('\n');
  }

  async getTdsReport(query: ReportQuery) {
    const createdAt = this.dateFilter(query);
    const payouts = await this.prisma.payout.findMany({
      where: {
        status: { in: ['PAID', 'APPROVED'] },
        ...(createdAt ? { requestedAt: createdAt } : {}),
      },
      include: {
        seller: {
          select: {
            storeName: true, panNumber: true, gstNumber: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });

    const tdsRate = 1; // 1% TDS under Section 194-O for e-commerce
    const rows = payouts.map((p) => {
      const tds = p.amount * (tdsRate / 100);
      return {
        payoutId: p.id,
        date: p.requestedAt.toISOString().split('T')[0],
        sellerName: p.seller.storeName,
        pan: p.seller.panNumber || '',
        gstin: p.seller.gstNumber || '',
        grossAmount: p.amount,
        tdsRate,
        tdsAmount: Math.round(tds * 100) / 100,
        netAmount: Math.round((p.amount - tds) * 100) / 100,
        status: p.status,
        isAdvance: (p as any).isAdvance || false,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        grossAmount: acc.grossAmount + r.grossAmount,
        tdsAmount: acc.tdsAmount + r.tdsAmount,
        netAmount: acc.netAmount + r.netAmount,
      }),
      { grossAmount: 0, tdsAmount: 0, netAmount: 0 },
    );

    return { rows, totals, tdsRate };
  }

  async getTdsReportCsv(query: ReportQuery): Promise<string> {
    const report = await this.getTdsReport(query);
    const header = 'Payout ID,Date,Seller,PAN,GSTIN,Gross Amount,TDS Rate %,TDS Amount,Net Amount,Status,Is Advance';
    const lines = report.rows.map((r) =>
      [
        r.payoutId, r.date, `"${r.sellerName}"`, r.pan, r.gstin,
        r.grossAmount.toFixed(2), r.tdsRate, r.tdsAmount.toFixed(2),
        r.netAmount.toFixed(2), r.status, r.isAdvance,
      ].join(','),
    );
    lines.push('');
    lines.push(`,,,,Total,${report.totals.grossAmount.toFixed(2)},,${report.totals.tdsAmount.toFixed(2)},${report.totals.netAmount.toFixed(2)},,`);
    return [header, ...lines].join('\n');
  }

  async getRefundReport(query: ReportQuery) {
    const createdAt = this.dateFilter(query);
    const returns = await this.prisma.returnRequest.findMany({
      where: {
        ...(createdAt ? { createdAt } : {}),
      },
      include: {
        order: { select: { orderNumber: true, total: true, paymentMethod: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return returns.map((r) => ({
      returnId: r.id,
      orderNumber: r.order.orderNumber,
      date: r.createdAt.toISOString().split('T')[0],
      customerName: r.user.name,
      reason: r.reason,
      status: r.status,
      orderTotal: r.order.total,
      refundAmount: r.refundAmount || 0,
      paymentMethod: r.order.paymentMethod || '',
    }));
  }

  async getRefundReportCsv(query: ReportQuery): Promise<string> {
    const rows = await this.getRefundReport(query);
    const header = 'Return ID,Order Number,Date,Customer,Reason,Status,Order Total,Refund Amount,Payment Method';
    const lines = rows.map((r) =>
      [r.returnId, r.orderNumber, r.date, `"${r.customerName}"`, `"${r.reason}"`, r.status, r.orderTotal, r.refundAmount.toFixed(2), r.paymentMethod].join(','),
    );
    return [header, ...lines].join('\n');
  }

  // ─── Sales Report ───

  async getSalesReport(query: ReportQuery) {
    const createdAt = this.dateFilter(query);
    const orders = await this.prisma.order.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
        ...(createdAt ? { createdAt } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, sellerId: true, categoryId: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const rows = orders.flatMap((order) =>
      order.items.map((item) => ({
        orderNumber: order.orderNumber,
        date: order.createdAt.toISOString().split('T')[0],
        customerName: order.user.name,
        customerEmail: order.user.email,
        productName: item.productName,
        sku: item.product?.sku || '',
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.price * item.quantity,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod || '',
        couponCode: order.couponCode || '',
        discount: Number(order.discount) || 0,
        shipping: Number(order.shipping) || 0,
        tax: Number(order.tax) || 0,
        orderTotal: Number(order.total) || 0,
      })),
    );

    const totals = {
      totalOrders: new Set(orders.map((o) => o.id)).size,
      totalItems: rows.reduce((s, r) => s + r.quantity, 0),
      totalRevenue: orders.reduce((s, o) => s + Number(o.total), 0),
      totalDiscount: orders.reduce((s, o) => s + Number(o.discount), 0),
      totalShipping: orders.reduce((s, o) => s + Number(o.shipping), 0),
      totalTax: orders.reduce((s, o) => s + Number(o.tax), 0),
    };

    return { rows, totals };
  }

  async getSalesReportCsv(query: ReportQuery): Promise<string> {
    const report = await this.getSalesReport(query);
    const header = 'Order Number,Date,Customer,Email,Product,SKU,Qty,Unit Price,Line Total,Order Status,Payment Status,Payment Method,Coupon,Discount,Shipping,Tax,Order Total';
    const lines = report.rows.map((r) =>
      [
        r.orderNumber, r.date, `"${r.customerName}"`, r.customerEmail, `"${r.productName}"`, r.sku,
        r.quantity, r.unitPrice.toFixed(2), r.lineTotal.toFixed(2), r.orderStatus, r.paymentStatus,
        r.paymentMethod, r.couponCode, r.discount.toFixed(2), r.shipping.toFixed(2), r.tax.toFixed(2), r.orderTotal.toFixed(2),
      ].join(','),
    );
    lines.push('');
    lines.push(`,,,,,,Total Items: ${report.totals.totalItems},,Revenue: ${report.totals.totalRevenue.toFixed(2)},,,,Discount: ${report.totals.totalDiscount.toFixed(2)},Shipping: ${report.totals.totalShipping.toFixed(2)},Tax: ${report.totals.totalTax.toFixed(2)},${report.totals.totalRevenue.toFixed(2)}`);
    return [header, ...lines].join('\n');
  }

  // ─── Inventory Report ───

  async getInventoryReport() {
    const products = await this.prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        seller: { select: { storeName: true } },
      },
      orderBy: { stock: 'asc' },
    });

    const rows = products.map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category?.name || '',
      seller: p.seller?.storeName || '',
      price: p.price,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.stock <= p.lowStockThreshold,
      isOutOfStock: p.stock === 0,
      status: p.status,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString().split('T')[0],
    }));

    const totals = {
      totalProducts: rows.length,
      activeProducts: rows.filter((r) => r.isActive).length,
      outOfStock: rows.filter((r) => r.isOutOfStock).length,
      lowStock: rows.filter((r) => r.isLowStock && !r.isOutOfStock).length,
      totalStockValue: rows.reduce((s, r) => s + r.price * r.stock, 0),
    };

    return { rows, totals };
  }

  async getInventoryReportCsv(): Promise<string> {
    const report = await this.getInventoryReport();
    const header = 'Product ID,Name,SKU,Category,Seller,Price,Stock,Low Stock Threshold,Low Stock,Out of Stock,Status,Active,Created';
    const lines = report.rows.map((r) =>
      [
        r.productId, `"${r.name}"`, r.sku, `"${r.category}"`, `"${r.seller}"`, r.price.toFixed(2),
        r.stock, r.lowStockThreshold, r.isLowStock, r.isOutOfStock, r.status, r.isActive, r.createdAt,
      ].join(','),
    );
    lines.push('');
    lines.push(`Total Products: ${report.totals.totalProducts},,Active: ${report.totals.activeProducts},,Out of Stock: ${report.totals.outOfStock},,Low Stock: ${report.totals.lowStock},,Stock Value: ${report.totals.totalStockValue.toFixed(2)}`);
    return [header, ...lines].join('\n');
  }

  // ─── Seller Performance Report ───

  async getSellerPerformanceReport(query: ReportQuery) {
    const createdAt = this.dateFilter(query);
    const sellers = await this.prisma.sellerProfile.findMany({
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { products: true } },
      },
    });

    const result = await Promise.all(
      sellers.map(async (seller) => {
        const productIds = (
          await this.prisma.product.findMany({ where: { sellerId: seller.id }, select: { id: true } })
        ).map((p) => p.id);

        const orderItems = await this.prisma.orderItem.findMany({
          where: {
            productId: { in: productIds },
            order: {
              status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
              ...(createdAt ? { createdAt } : {}),
            },
          },
          select: { price: true, quantity: true, orderId: true },
        });

        const totalRevenue = orderItems.reduce((s, oi) => s + oi.price * oi.quantity, 0);
        const totalOrders = new Set(orderItems.map((oi) => oi.orderId)).size;
        const totalUnits = orderItems.reduce((s, oi) => s + oi.quantity, 0);
        const commission = totalRevenue * (seller.commissionRate / 100);

        return {
          sellerId: seller.id,
          storeName: seller.storeName,
          email: seller.user?.email || seller.email || '',
          verified: seller.verified,
          totalProducts: seller._count.products,
          totalOrders,
          totalUnits,
          totalRevenue,
          commissionRate: seller.commissionRate,
          commission,
          netPayout: totalRevenue - commission,
          rating: seller.rating,
          joinedAt: seller.createdAt.toISOString().split('T')[0],
        };
      }),
    );

    const totals = {
      totalSellers: result.length,
      activeSellers: result.filter((r) => r.verified).length,
      totalRevenue: result.reduce((s, r) => s + r.totalRevenue, 0),
      totalCommission: result.reduce((s, r) => s + r.commission, 0),
      totalOrders: result.reduce((s, r) => s + r.totalOrders, 0),
    };

    return { rows: result.sort((a, b) => b.totalRevenue - a.totalRevenue), totals };
  }

  async getSellerPerformanceReportCsv(query: ReportQuery): Promise<string> {
    const report = await this.getSellerPerformanceReport(query);
    const header = 'Seller ID,Store Name,Email,Verified,Products,Orders,Units,Revenue,Commission %,Commission,Net Payout,Rating,Joined';
    const lines = report.rows.map((r) =>
      [
        r.sellerId, `"${r.storeName}"`, r.email, r.verified, r.totalProducts, r.totalOrders, r.totalUnits,
        r.totalRevenue.toFixed(2), r.commissionRate, r.commission.toFixed(2), r.netPayout.toFixed(2),
        r.rating.toFixed(1), r.joinedAt,
      ].join(','),
    );
    lines.push('');
    lines.push(`Total Sellers: ${report.totals.totalSellers},,Active: ${report.totals.activeSellers},,,,Total Revenue: ${report.totals.totalRevenue.toFixed(2)},,Commission: ${report.totals.totalCommission.toFixed(2)},,Orders: ${report.totals.totalOrders},,`);
    return [header, ...lines].join('\n');
  }

  // ─── Coupon Usage Report ───

  async getCouponUsageReport(query: ReportQuery) {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { usedCount: 'desc' },
    });

    const createdAt = this.dateFilter(query);
    const ordersWithCoupons = await this.prisma.order.findMany({
      where: {
        couponCode: { not: null },
        ...(createdAt ? { createdAt } : {}),
      },
      select: { couponCode: true, discount: true, total: true },
    });

    const usageMap = new Map<string, { uses: number; totalDiscount: number; totalOrderValue: number }>();
    for (const order of ordersWithCoupons) {
      if (!order.couponCode) continue;
      const existing = usageMap.get(order.couponCode) || { uses: 0, totalDiscount: 0, totalOrderValue: 0 };
      existing.uses++;
      existing.totalDiscount += Number(order.discount) || 0;
      existing.totalOrderValue += Number(order.total) || 0;
      usageMap.set(order.couponCode, existing);
    }

    const rows = coupons.map((c) => {
      const usage = usageMap.get(c.code) || { uses: 0, totalDiscount: 0, totalOrderValue: 0 };
      return {
        couponId: c.id,
        code: c.code,
        description: c.description || '',
        discountType: c.discountType,
        discountValue: c.discountValue,
        scope: c.scope,
        isActive: c.isActive,
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        periodUses: usage.uses,
        periodDiscount: usage.totalDiscount,
        periodOrderValue: usage.totalOrderValue,
        validUntil: c.validUntil ? c.validUntil.toISOString().split('T')[0] : '',
        createdAt: c.createdAt.toISOString().split('T')[0],
      };
    });

    const totals = {
      totalCoupons: rows.length,
      activeCoupons: rows.filter((r) => r.isActive).length,
      totalUsage: rows.reduce((s, r) => s + r.periodUses, 0),
      totalDiscount: rows.reduce((s, r) => s + r.periodDiscount, 0),
      totalOrderValue: rows.reduce((s, r) => s + r.periodOrderValue, 0),
    };

    return { rows, totals };
  }

  async getCouponUsageReportCsv(query: ReportQuery): Promise<string> {
    const report = await this.getCouponUsageReport(query);
    const header = 'Code,Description,Type,Value,Scope,Active,Limit,Total Used,Period Uses,Period Discount,Period Order Value,Valid Until,Created';
    const lines = report.rows.map((r) =>
      [
        r.code, `"${r.description}"`, r.discountType, r.discountValue, r.scope, r.isActive,
        r.usageLimit ?? 'Unlimited', r.usedCount, r.periodUses, r.periodDiscount.toFixed(2),
        r.periodOrderValue.toFixed(2), r.validUntil, r.createdAt,
      ].join(','),
    );
    lines.push('');
    lines.push(`Total: ${report.totals.totalCoupons},,Active: ${report.totals.activeCoupons},,Uses: ${report.totals.totalUsage},,Discount Given: ${report.totals.totalDiscount.toFixed(2)},,Order Value: ${report.totals.totalOrderValue.toFixed(2)}`);
    return [header, ...lines].join('\n');
  }
}
