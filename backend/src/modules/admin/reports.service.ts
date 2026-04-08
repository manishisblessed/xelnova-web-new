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
}
