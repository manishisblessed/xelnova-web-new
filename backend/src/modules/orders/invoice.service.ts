import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 40;
const LINE_HEIGHT = 16;

function toNum(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'toNumber' in val && typeof (val as { toNumber: () => number }).toNumber === 'function') {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}

function safeStr(val: unknown): string {
  if (val == null) return '';
  return String(val);
}

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInvoice(orderNumber: string, userId: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: { select: { name: true } } } },
        shippingAddress: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = A4_HEIGHT - MARGIN;
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const primary = rgb(0.486, 0.227, 0.929);

    const drawText = (
      text: string,
      x: number,
      yPos: number,
      opts?: { size?: number; color?: typeof black; bold?: boolean },
    ) => {
      page.drawText(safeStr(text), {
        x,
        y: yPos,
        size: opts?.size || 10,
        font: opts?.bold ? fontBold : font,
        color: opts?.color || black,
      });
    };

    drawText('XELNOVA', MARGIN, y, { size: 22, color: primary, bold: true });
    drawText('Tax Invoice', A4_WIDTH - MARGIN - 80, y, { size: 14, bold: true });
    y -= 12;
    drawText('www.xelnova.in', MARGIN, y, { size: 8, color: gray });
    y -= 30;

    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 20;

    drawText(`Invoice #: INV-${order.orderNumber}`, MARGIN, y, { bold: true });
    drawText(
      `Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      A4_WIDTH - MARGIN - 150,
      y,
    );
    y -= LINE_HEIGHT;
    drawText(`Order #: ${order.orderNumber}`, MARGIN, y);
    drawText(
      `Payment: ${order.paymentMethod || 'N/A'} (${order.paymentStatus})`,
      A4_WIDTH - MARGIN - 200,
      y,
    );
    y -= 30;

    drawText('Bill To:', MARGIN, y, { bold: true, color: gray, size: 9 });
    drawText('Ship To:', A4_WIDTH / 2, y, { bold: true, color: gray, size: 9 });
    y -= LINE_HEIGHT;

    drawText(safeStr(order.user.name) || 'Customer', MARGIN, y, { bold: true });
    if (order.shippingAddress) {
      drawText(safeStr(order.shippingAddress.fullName), A4_WIDTH / 2, y, { bold: true });
      y -= LINE_HEIGHT;
      drawText(safeStr(order.user.email), MARGIN, y, { size: 9 });
      drawText(safeStr(order.shippingAddress.addressLine1), A4_WIDTH / 2, y, { size: 9 });
      y -= LINE_HEIGHT;
      if (order.user.phone) drawText(safeStr(order.user.phone), MARGIN, y, { size: 9 });
      const cityLine = [
        order.shippingAddress.city,
        order.shippingAddress.state,
        order.shippingAddress.pincode,
      ]
        .filter(Boolean)
        .join(', ');
      drawText(cityLine, A4_WIDTH / 2, y, { size: 9 });
      y -= LINE_HEIGHT;
      drawText(safeStr(order.shippingAddress.phone), A4_WIDTH / 2, y, { size: 9 });
    } else {
      y -= LINE_HEIGHT;
      drawText(safeStr(order.user.email), MARGIN, y, { size: 9 });
    }

    y -= 30;

    page.drawRectangle({
      x: MARGIN,
      y: y - 2,
      width: A4_WIDTH - 2 * MARGIN,
      height: 20,
      color: rgb(0.95, 0.93, 1),
    });
    const colX = { item: MARGIN + 5, qty: 340, rate: 400, amount: 480 };
    drawText('Item', colX.item, y + 3, { bold: true, size: 9 });
    drawText('Qty', colX.qty, y + 3, { bold: true, size: 9 });
    drawText('Rate', colX.rate, y + 3, { bold: true, size: 9 });
    drawText('Amount', colX.amount, y + 3, { bold: true, size: 9 });
    y -= 20;

    for (const item of order.items) {
      const productName = safeStr(item.productName);
      const name = productName.length > 45 ? productName.slice(0, 42) + '...' : productName;
      const itemPrice = toNum(item.price);
      const itemQty = toNum(item.quantity);
      drawText(name, colX.item, y, { size: 9 });
      drawText(String(itemQty), colX.qty, y, { size: 9 });
      drawText(`₹${itemPrice.toFixed(2)}`, colX.rate, y, { size: 9 });
      drawText(`₹${(itemPrice * itemQty).toFixed(2)}`, colX.amount, y, {
        size: 9,
      });
      y -= LINE_HEIGHT;

      if (item.variant) {
        drawText(`  Variant: ${item.variant}`, colX.item, y, {
          size: 8,
          color: gray,
        });
        y -= LINE_HEIGHT;
      }
    }

    y -= 10;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 18;

    const summaryX = A4_WIDTH - MARGIN - 150;
    const valX = A4_WIDTH - MARGIN - 10;

    const drawSummaryLine = (
      label: string,
      value: string,
      bold = false,
    ) => {
      drawText(label, summaryX, y, { size: 9, bold });
      const w = (bold ? fontBold : font).widthOfTextAtSize(value, bold ? 11 : 9);
      drawText(value, valX - w, y, { size: bold ? 11 : 9, bold });
      y -= LINE_HEIGHT;
    };

    const subtotal = toNum(order.subtotal);
    const discount = toNum(order.discount);
    const shipping = toNum(order.shipping);
    const tax = toNum(order.tax);
    const total = toNum(order.total);

    drawSummaryLine('Subtotal', `₹${subtotal.toFixed(2)}`);
    if (discount > 0) {
      drawSummaryLine('Discount', `-₹${discount.toFixed(2)}`);
    }
    drawSummaryLine('Shipping', shipping > 0 ? `₹${shipping.toFixed(2)}` : 'FREE');
    drawSummaryLine('Tax (GST)', `₹${tax.toFixed(2)}`);
    y -= 4;
    page.drawLine({
      start: { x: summaryX, y: y + 10 },
      end: { x: A4_WIDTH - MARGIN, y: y + 10 },
      thickness: 1,
      color: primary,
    });
    drawSummaryLine('Total', `₹${total.toFixed(2)}`, true);

    y -= 40;
    drawText(
      'Thank you for shopping with Xelnova!',
      MARGIN,
      y,
      { size: 9, color: gray },
    );
    y -= LINE_HEIGHT;
    drawText(
      'For support, email support@xelnova.in or call 1800-123-XELNOVA',
      MARGIN,
      y,
      { size: 8, color: gray },
    );

    const pdfBytes = await pdf.save();
    return Buffer.from(pdfBytes);
  }
}
