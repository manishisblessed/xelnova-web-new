import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 30;
const LINE_HEIGHT = 14;

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

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year}, ${hours}:${minutes}`;
}

function formatDateShort(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

interface SellerInfo {
  storeName: string;
  gstNumber: string | null;
  panNumber: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPincode: string | null;
  fssaiLicense?: string | null;
  signatureData?: string | null;
  signatureUrl?: string | null;
}

interface OrderItemWithDetails {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
  variant: string | null;
  hsnCode: string | null;
  gstRate: number | null;
  imeiSerialNo: string | null;
  sellerId: string | null;
  product?: { name: string; sellerId?: string };
}

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInvoice(orderNumber: string, userId: string): Promise<Buffer> {
    return this.generateInvoiceInternal(orderNumber, { customerUserId: userId });
  }

  /**
   * Seller-facing access to the same customer invoice PDF — used on the
   * order detail "Invoice (PDF)" button (testing observation #7).
   * Authorisation: caller must be a seller who owns at least one item
   * in the order (verified by sellerProfileId of the seller user).
   */
  async generateInvoiceForSeller(orderId: string, sellerProfileId: string): Promise<Buffer> {
    return this.generateInvoiceInternal(orderId, { sellerProfileId });
  }

  /**
   * Generate a single merged PDF containing every customer invoice for
   * orders the seller participated in within the requested calendar
   * month (testing observation #23). If `month` is omitted the current
   * calendar month is used.
   */
  async generateMonthlyInvoicesForSeller(
    sellerProfileId: string,
    opts: { year?: number; month?: number } = {},
  ): Promise<{ pdf: Buffer; orderCount: number; year: number; month: number }> {
    const now = new Date();
    const year = opts.year ?? now.getFullYear();
    const month = opts.month ?? now.getMonth() + 1; // 1-indexed
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to = new Date(year, month, 1, 0, 0, 0, 0);

    // Find every order in the window where this seller has at least one item.
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from, lt: to },
        items: { some: { sellerId: sellerProfileId } },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const merged = await PDFDocument.create();
    let included = 0;
    for (const o of orders) {
      try {
        const buf = await this.generateInvoiceInternal(o.id, { sellerProfileId });
        const src = await PDFDocument.load(buf);
        const pages = await merged.copyPages(src, src.getPageIndices());
        for (const p of pages) merged.addPage(p);
        included += 1;
      } catch {
        // Skip orders that can't be generated (e.g. missing seller info)
        // so a single bad order doesn't break the whole monthly statement.
      }
    }

    if (included === 0) {
      // Produce an empty placeholder page so the download is still valid
      const page = merged.addPage([A4_WIDTH, A4_HEIGHT]);
      const font = await merged.embedFont(StandardFonts.Helvetica);
      page.drawText(`No invoices for ${month}/${year}`, {
        x: MARGIN,
        y: A4_HEIGHT - MARGIN - 20,
        size: 14,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    const bytes = await merged.save();
    return { pdf: Buffer.from(bytes), orderCount: included, year, month };
  }

  private async generateInvoiceInternal(
    orderIdOrNumber: string,
    auth: { customerUserId?: string; sellerProfileId?: string },
  ): Promise<Buffer> {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: orderIdOrNumber }, { id: orderIdOrNumber }],
      },
      include: {
        items: { include: { product: { select: { name: true, sellerId: true } } } },
        shippingAddress: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (auth.customerUserId && order.userId !== auth.customerUserId) {
      throw new NotFoundException('Order not found');
    }
    if (auth.sellerProfileId) {
      const owns = order.items.some((it) => {
        const sid = (it as any).sellerId || (it as any).product?.sellerId;
        return sid === auth.sellerProfileId;
      });
      if (!owns) throw new NotFoundException('Order not found');
    }

    // Get seller information for the first item (for multi-seller, we'd need per-item invoices)
    const firstItem = order.items[0] as OrderItemWithDetails;
    const sellerId = firstItem?.sellerId || firstItem?.product?.sellerId;
    
    let seller: SellerInfo | null = null;
    if (sellerId) {
      const sellerProfile = await this.prisma.sellerProfile.findUnique({
        where: { id: sellerId },
        select: {
          storeName: true,
          gstNumber: true,
          panNumber: true,
          businessAddress: true,
          businessCity: true,
          businessState: true,
          businessPincode: true,
          signatureData: true,
          signatureUrl: true,
        },
      });
      if (sellerProfile) {
        seller = sellerProfile;
      }
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.6, 0.6, 0.6);
    const borderGray = rgb(0.75, 0.75, 0.75);
    const primary = rgb(0.486, 0.227, 0.929);

    let y = A4_HEIGHT - MARGIN;

    const drawText = (
      text: string,
      x: number,
      yPos: number,
      opts?: { size?: number; color?: typeof black; bold?: boolean; maxWidth?: number },
    ) => {
      const finalText = safeStr(text);
      page.drawText(finalText, {
        x,
        y: yPos,
        size: opts?.size || 9,
        font: opts?.bold ? fontBold : font,
        color: opts?.color || black,
        maxWidth: opts?.maxWidth,
      });
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number, thickness = 0.5, color = borderGray) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness,
        color,
      });
    };

    const drawRect = (x: number, yPos: number, width: number, height: number, borderColor = borderGray) => {
      page.drawRectangle({
        x,
        y: yPos,
        width,
        height,
        borderColor,
        borderWidth: 0.5,
      });
    };

    // ─── Header with "Not for resale" and timestamp ───
    const printedAt = new Date();
    drawText('Not for resale.', MARGIN, y, { size: 8, color: gray });
    drawText(`Printed at ${String(printedAt.getHours()).padStart(2, '0')}${String(printedAt.getMinutes()).padStart(2, '0')} hrs, ${formatDateShort(printedAt)}`, A4_WIDTH - MARGIN - 120, y, { size: 8, color: gray });
    y -= 8;
    drawLine(MARGIN, y, A4_WIDTH - MARGIN, y, 1, rgb(0, 0, 0));
    y -= 20;

    // ─── Tax Invoice Header ───
    drawText('Tax Invoice', MARGIN, y, { size: 14, bold: true });

    // GSTIN block on the far right of the title row. PAN intentionally
    // omitted — GSTIN already encodes the PAN as characters 3-12, so
    // showing both is redundant on a tax invoice (per client request).
    const gstinX = A4_WIDTH - MARGIN - 170;
    drawText(`GSTIN: ${seller?.gstNumber || 'N/A'}`, gstinX, y, { size: 8 });

    // Order and Invoice details (split left + middle so they don't crash into GSTIN).
    const detailsX = MARGIN;
    const rightDetailsX = MARGIN + 220;

    y -= 22;
    drawText('Order Id:', detailsX, y, { size: 8, color: gray });
    drawText(order.orderNumber, detailsX + 45, y, { size: 8, bold: true });

    drawText('Invoice No:', rightDetailsX, y, { size: 8, color: gray });
    drawText(`XEL${order.orderNumber.replace('XN-', '').replace(/-/g, '')}`, rightDetailsX + 55, y, { size: 8, bold: true });

    y -= 12;
    drawText('Order Date:', detailsX, y, { size: 8, color: gray });
    drawText(formatDate(new Date(order.createdAt)), detailsX + 55, y, { size: 8 });

    drawText('Invoice Date:', rightDetailsX, y, { size: 8, color: gray });
    drawText(formatDate(new Date(order.createdAt)), rightDetailsX + 60, y, { size: 8 });

    // ─── QR Code ───
    try {
      const qrData = JSON.stringify({
        invoice: `INV-${order.orderNumber}`,
        order: order.orderNumber,
        total: order.total,
        date: new Date(order.createdAt).toISOString(),
      });
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 60, margin: 0 });
      const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      const qrImage = await pdf.embedPng(qrImageBytes);
      page.drawImage(qrImage, {
        x: A4_WIDTH - MARGIN - 55,
        y: y - 30,
        width: 50,
        height: 50,
      });
    } catch {
      // QR code generation failed, continue without it
    }

    y -= 30;

    // ─── Sold By / Billing / Shipping Addresses ───
    const colWidth = (A4_WIDTH - 2 * MARGIN) / 3;
    const soldByX = MARGIN;
    const billingX = MARGIN + colWidth;
    const shippingX = MARGIN + colWidth * 2;

    drawText('Sold By', soldByX, y, { size: 9, bold: true });
    drawText('Billing Address', billingX, y, { size: 9, bold: true });
    drawText('Shipping ADDRESS', shippingX, y, { size: 9, bold: true });
    y -= 12;

    // Sold By details
    const sellerName = seller?.storeName || 'Xelnova Seller';
    const sellerAddress = [
      seller?.businessAddress,
      seller?.businessCity,
      `${seller?.businessState || ''} - ${seller?.businessPincode || ''}`.trim(),
    ].filter(Boolean).join(', ');

    // Wrap the seller name itself — long store names used to overflow into the billing column.
    const sellerNameLines = this.wrapText(sellerName.toUpperCase(), fontBold, 8, colWidth - 10);
    for (const line of sellerNameLines) {
      drawText(line, soldByX, y, { size: 8, bold: true });
      y -= 10;
    }

    const sellerAddrLines = this.wrapText(sellerAddress || 'Address not available', font, 7, colWidth - 10);
    for (const line of sellerAddrLines) {
      drawText(line, soldByX, y, { size: 7 });
      y -= 9;
    }

    if (seller?.gstNumber) {
      drawText(`GST: ${seller.gstNumber}`, soldByX, y, { size: 7, bold: true });
      y -= 9;
    }

    // Billing/shipping start at the top of the row — match where the seller block started.
    const soldByConsumedHeight = sellerNameLines.length * 10 + sellerAddrLines.length * 9 + (seller?.gstNumber ? 9 : 0);
    let billingY = y + soldByConsumedHeight - 10;
    let shippingY = billingY;

    // Billing address (same as user info for now)
    const billingName = order.shippingAddress?.fullName || order.user.name || 'Customer';
    const billingAddr = order.shippingAddress 
      ? [
          order.shippingAddress.addressLine1,
          order.shippingAddress.addressLine2,
          order.shippingAddress.city,
          `${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
        ].filter(Boolean).join(', ')
      : '';

    drawText(billingName, billingX, billingY, { size: 8, bold: true });
    billingY -= 10;
    const billingLines = this.wrapText(billingAddr, font, 7, colWidth - 10);
    for (const line of billingLines) {
      drawText(line, billingX, billingY, { size: 7 });
      billingY -= 9;
    }

    // Shipping address
    const shippingName = order.shippingAddress?.fullName || '';
    const shippingAddr = order.shippingAddress
      ? [
          order.shippingAddress.addressLine1,
          order.shippingAddress.addressLine2,
          order.shippingAddress.city,
          `${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
        ].filter(Boolean).join(', ')
      : '';

    drawText(shippingName, shippingX, shippingY, { size: 8, bold: true });
    shippingY -= 10;
    const shippingLines = this.wrapText(shippingAddr, font, 7, colWidth - 10);
    for (const line of shippingLines) {
      drawText(line, shippingX, shippingY, { size: 7 });
      shippingY -= 9;
    }

    // Move y to the lowest point
    y = Math.min(y, billingY, shippingY) - 15;

    // ─── Items Table ───
    const tableLeft = MARGIN;
    const tableRight = A4_WIDTH - MARGIN;
    const tableWidth = tableRight - tableLeft;

    // Same-state vs inter-state determines whether GST is split (CGST+SGST) or single (IGST).
    const sellerStateKey = (seller?.businessState || '').trim().toLowerCase();
    const buyerStateKey = (order.shippingAddress?.state || '').trim().toLowerCase();
    const isIntraState = sellerStateKey.length > 0 && sellerStateKey === buyerStateKey;
    const taxLabel = isIntraState ? 'CGST + SGST' : 'IGST';

    // Re-spaced columns so 6-digit numbers no longer overlap with the next column.
    const cols = {
      product: tableLeft + 5,
      description: tableLeft + 175,
      qty: tableLeft + 270,
      grossAmt: tableLeft + 300,
      discount: tableLeft + 350,
      taxable: tableLeft + 395,
      tax: tableLeft + 445,
      total: tableLeft + 495,
    };

    const headerHeight = 28;
    drawRect(tableLeft, y - headerHeight, tableWidth, headerHeight);

    y -= 10;
    drawText('Product', cols.product, y, { size: 7, bold: true });
    drawText('Description', cols.description, y, { size: 7, bold: true });
    drawText('Qty', cols.qty, y, { size: 7, bold: true });
    drawText('Gross', cols.grossAmt, y, { size: 7, bold: true });
    drawText('Discount', cols.discount, y, { size: 7, bold: true });
    drawText('Taxable', cols.taxable, y, { size: 7, bold: true });
    drawText(taxLabel, cols.tax, y, { size: 7, bold: true });
    drawText('Total', cols.total, y, { size: 7, bold: true });

    y -= 9;
    drawText('(incl. GST)', cols.grossAmt, y, { size: 6, color: gray });
    drawText('Value', cols.taxable, y, { size: 6, color: gray });

    y -= 12;

    // Subtotal here is GST-EXCLUSIVE (the value stored in the order record). All discount/tax
    // math is consistent with the storefront — see OrdersService.create.
    const subtotal = toNum(order.subtotal);
    const totalDiscount = toNum(order.discount);
    const discountRatio = subtotal > 0 ? totalDiscount / subtotal : 0;

    let totalQty = 0;
    let grandTotal = 0;
    let summaryGross = 0;
    let summaryDiscount = 0;
    let summaryTaxable = 0;
    let summaryTax = 0;

    for (const item of order.items as OrderItemWithDetails[]) {
      const itemPrice = toNum(item.price);
      const itemQty = toNum(item.quantity);
      const gstRate = toNum(item.gstRate) || 18;

      // Gross amount on the invoice is now TAX-INCLUSIVE — mirrors what the customer sees in
      // the cart and on Razorpay so they don't think tax is being added twice.
      const inclusiveUnit = itemPrice + Math.round((itemPrice * gstRate) / 100);
      const grossAmount = inclusiveUnit * itemQty;

      // Apportion the order-level discount across items by (exclusive) value.
      const exclusiveLine = itemPrice * itemQty;
      const itemDiscount = exclusiveLine * discountRatio;
      const taxableValue = exclusiveLine - itemDiscount;
      const taxAmount = taxableValue * (gstRate / 100);
      const itemTotal = taxableValue + taxAmount;

      totalQty += itemQty;
      grandTotal += itemTotal;
      summaryGross += grossAmount;
      summaryDiscount += itemDiscount;
      summaryTaxable += taxableValue;
      summaryTax += taxAmount;

      const rowHeight = 38;
      drawRect(tableLeft, y - rowHeight + 10, tableWidth, rowHeight);

      // Wrap product name to a max of 2 lines. `cols.description` starts at +175 from
      // tableLeft so we cap the product name at 165px to keep a clean gutter.
      const productName = safeStr(item.productName);
      const productLines = this.wrapText(productName, font, 7, 165);
      let productY = y;
      for (const line of productLines.slice(0, 2)) {
        drawText(line, cols.product, productY, { size: 7 });
        productY -= 9;
      }

      // Description column also stays inside its band (90px wide).
      const hsnCode = item.hsnCode || 'N/A';
      const taxBreakdown = isIntraState
        ? `CGST: ${(gstRate / 2).toFixed(1)}% | SGST: ${(gstRate / 2).toFixed(1)}%`
        : `IGST: ${gstRate.toFixed(0)}%`;
      drawText(`HSN: ${hsnCode}`, cols.description, y, { size: 6, color: gray });
      drawText(taxBreakdown, cols.description, y - 9, { size: 6, color: gray });

      if (item.imeiSerialNo) {
        drawText(`SrNo: ${item.imeiSerialNo}`, cols.description, y - 18, { size: 6, color: gray });
      }

      // Numbers — slight x-offset for cleaner right-alignment.
      drawText(String(itemQty), cols.qty, y - 6, { size: 7 });
      drawText(grossAmount.toFixed(2), cols.grossAmt, y - 6, { size: 7 });
      drawText(itemDiscount > 0 ? `-${itemDiscount.toFixed(2)}` : '0.00', cols.discount, y - 6, { size: 7 });
      drawText(taxableValue.toFixed(2), cols.taxable, y - 6, { size: 7 });
      drawText(taxAmount.toFixed(2), cols.tax, y - 6, { size: 7 });
      drawText(itemTotal.toFixed(2), cols.total, y - 6, { size: 7, bold: true });

      y -= rowHeight;
    }

    // Handling Fee row (if shipping > 0). Shipping is shown as a separate (tax-free) line.
    const shippingCost = toNum(order.shipping);
    if (shippingCost > 0) {
      const rowHeight = 20;
      drawRect(tableLeft, y - rowHeight + 10, tableWidth, rowHeight);
      drawText('Handling Fee', cols.product, y - 4, { size: 7 });
      drawText('1', cols.qty, y - 6, { size: 7 });
      drawText(shippingCost.toFixed(2), cols.grossAmt, y - 6, { size: 7 });
      drawText('0.00', cols.discount, y - 6, { size: 7 });
      drawText(shippingCost.toFixed(2), cols.taxable, y - 6, { size: 7 });
      drawText('0.00', cols.tax, y - 6, { size: 7 });
      drawText(shippingCost.toFixed(2), cols.total, y - 6, { size: 7 });
      y -= rowHeight;
      grandTotal += shippingCost;
      summaryGross += shippingCost;
      summaryTaxable += shippingCost;
    }

    // ─── Tax summary row ───
    y -= 4;
    drawRect(tableLeft, y - 18, tableWidth, 18, rgb(0.9, 0.9, 0.9));
    drawText('Total', cols.product, y - 12, { size: 7, bold: true });
    drawText(String(totalQty), cols.qty, y - 12, { size: 7, bold: true });
    drawText(summaryGross.toFixed(2), cols.grossAmt, y - 12, { size: 7, bold: true });
    drawText(summaryDiscount > 0 ? `-${summaryDiscount.toFixed(2)}` : '0.00', cols.discount, y - 12, { size: 7, bold: true });
    drawText(summaryTaxable.toFixed(2), cols.taxable, y - 12, { size: 7, bold: true });
    drawText(summaryTax.toFixed(2), cols.tax, y - 12, { size: 7, bold: true });
    drawText(grandTotal.toFixed(2), cols.total, y - 12, { size: 7, bold: true });
    y -= 22;

    y -= 15;

    // ─── Total Summary ───
    drawText(`TOTAL QTY: ${totalQty}`, MARGIN, y, { size: 9, bold: true });
    
    const totalX = A4_WIDTH - MARGIN - 150;
    drawText(`TOTAL PRICE: ${toNum(order.total).toFixed(2)}`, totalX, y, { size: 10, bold: true });
    y -= 12;
    drawText('All values are in INR', totalX + 50, y, { size: 7, color: gray });

    y -= 30;

    // ─── Seller Registered Address Box ───
    // Comfortable top + bottom padding (~12px each side) inside the box so
    // the title doesn't kiss the top border and the FSSAI line doesn't kiss
    // the bottom border (per client review).
    const sellerBoxPaddingY = 12;
    const sellerBoxLineCount = 4; // title + store name + address (2 lines avg) + fssai
    const sellerBoxLineHeight = 11;
    const boxHeight = sellerBoxPaddingY * 2 + sellerBoxLineCount * sellerBoxLineHeight; // ≈ 68
    const boxY = y - boxHeight;

    // Yellow/highlighted background for seller address
    page.drawRectangle({
      x: MARGIN,
      y: boxY,
      width: tableWidth * 0.65,
      height: boxHeight,
      color: rgb(1, 1, 0.8), // Light yellow
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    let sellerLineY = y - sellerBoxPaddingY - 8; // first baseline
    drawText('Seller Registered Address:', MARGIN + 8, sellerLineY, { size: 8, bold: true });
    sellerLineY -= sellerBoxLineHeight;
    drawText(sellerName.toUpperCase(), MARGIN + 8, sellerLineY, { size: 7, bold: true });
    sellerLineY -= sellerBoxLineHeight;

    const fullSellerAddr = [
      seller?.businessAddress,
      seller?.businessCity,
      `${seller?.businessState || ''} - ${seller?.businessPincode || ''}`.trim(),
    ].filter(Boolean).join(', ');

    const addrLines = this.wrapText(fullSellerAddr || 'Address not available', font, 7, tableWidth * 0.6 - 6);
    for (const line of addrLines.slice(0, 2)) {
      drawText(line, MARGIN + 8, sellerLineY, { size: 7 });
      sellerLineY -= sellerBoxLineHeight;
    }
    drawText(`FSSAI License number: ${seller?.fssaiLicense || 'N/A'}`, MARGIN + 8, sellerLineY, { size: 7 });

    // ─── Signature Box ───
    const sigBoxX = MARGIN + tableWidth * 0.65 + 5;
    const sigBoxWidth = tableWidth * 0.35 - 5;
    
    page.drawRectangle({
      x: sigBoxX,
      y: boxY,
      width: sigBoxWidth,
      height: boxHeight,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    // Vertically center signature inside the (now taller) signature box.
    const sigImgHeight = 30;
    const sigImgY = boxY + (boxHeight - sigImgHeight) / 2 + 4; // small bias up to leave room for caption
    if (seller?.signatureData) {
      try {
        const sigData = seller.signatureData.includes('base64,')
          ? seller.signatureData.split(',')[1]
          : seller.signatureData;
        const sigBytes = Buffer.from(sigData, 'base64');
        const sigImage = await pdf.embedPng(sigBytes);
        page.drawImage(sigImage, {
          x: sigBoxX + 20,
          y: sigImgY,
          width: 60,
          height: sigImgHeight,
        });
      } catch {
        drawText('(Signature)', sigBoxX + 30, sigImgY + 12, { size: 8, color: gray });
      }
    } else {
      drawText('(Signature)', sigBoxX + 30, sigImgY + 12, { size: 8, color: gray });
    }

    drawText(sellerName.toUpperCase(), sigBoxX + 10, boxY + 8, { size: 7, bold: true });
    drawText('Authorized Signature', sigBoxX + 10, boxY - 8, { size: 6, color: gray });

    y = boxY - 25;

    // ─── Footer ───
    drawText('E. & O.E.', MARGIN, y, { size: 7, color: gray });

    // "Ordered Through" + Xelnova Logo in center
    const orderedThroughText = 'Ordered Through';
    const orderedThroughWidth = font.widthOfTextAtSize(orderedThroughText, 10);
    
    // Calculate center position for the entire footer branding
    // "Ordered Through" text + space + Logo
    const logoWidth = 60;
    const logoHeight = 18;
    const spacing = 8;
    const totalBrandingWidth = orderedThroughWidth + spacing + logoWidth;
    const brandingStartX = (A4_WIDTH - totalBrandingWidth) / 2;
    
    // Draw "Ordered Through" text
    drawText(orderedThroughText, brandingStartX, y, { size: 10 });
    
    // Try to embed Xelnova logo
    let logoEmbedded = false;
    try {
      // Try multiple possible logo paths
      const possibleLogoPaths = [
        // Backend assets folder (for production builds)
        path.resolve(__dirname, '../../assets/xelnova-logo.png'),
        path.resolve(__dirname, '../../../src/assets/xelnova-logo.png'),
        // Development paths
        path.resolve(process.cwd(), 'src/assets/xelnova-logo.png'),
        path.resolve(process.cwd(), 'dist/src/assets/xelnova-logo.png'),
        // Web app public folder fallback
        path.resolve(process.cwd(), '../apps/web/public/xelnova-logo.png'),
        path.resolve(process.cwd(), 'apps/web/public/xelnova-logo.png'),
      ];
      
      for (const logoPath of possibleLogoPaths) {
        if (fs.existsSync(logoPath)) {
          const logoBytes = fs.readFileSync(logoPath);
          const logoImage = await pdf.embedPng(logoBytes);
          page.drawImage(logoImage, {
            x: brandingStartX + orderedThroughWidth + spacing,
            y: y - 4,
            width: logoWidth,
            height: logoHeight,
          });
          logoEmbedded = true;
          break;
        }
      }
    } catch {
      // Logo embedding failed
    }
    
    // Fallback: Draw "Xelnova" text with branding if logo not embedded
    if (!logoEmbedded) {
      drawText('Xelnova', brandingStartX + orderedThroughWidth + spacing, y, { 
        size: 14, 
        bold: true, 
        color: primary 
      });
    }

    // Seller name on right side
    const sellerNameWidth = fontBold.widthOfTextAtSize(sellerName.toUpperCase(), 8);
    drawText(sellerName.toUpperCase(), A4_WIDTH - MARGIN - sellerNameWidth, y, { size: 8, bold: true });
    drawText('Authorized Signature', A4_WIDTH - MARGIN - sellerNameWidth, y - 10, { size: 6, color: gray });

    const pdfBytes = await pdf.save();
    return Buffer.from(pdfBytes);
  }

  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
}
