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
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: { select: { name: true, sellerId: true } } } },
        shippingAddress: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
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
    
    // Order and Invoice details (left side)
    const detailsX = MARGIN;
    const rightDetailsX = 250;
    
    y -= 18;
    drawText('Order Id:', detailsX, y, { size: 8, color: gray });
    drawText(order.orderNumber, detailsX + 45, y, { size: 8, bold: true });
    
    drawText('Invoice No:', rightDetailsX, y, { size: 8, color: gray });
    drawText(`FAXP${order.orderNumber.replace('XN-', '').replace(/-/g, '')}`, rightDetailsX + 55, y, { size: 8, bold: true });
    
    // GSTIN & PAN (right side - top)
    const gstinX = A4_WIDTH - MARGIN - 150;
    drawText(`GSTIN: ${seller?.gstNumber || 'N/A'}`, gstinX, y + 18, { size: 8 });
    
    y -= 12;
    drawText('Order Date:', detailsX, y, { size: 8, color: gray });
    drawText(formatDate(new Date(order.createdAt)), detailsX + 55, y, { size: 8 });
    
    drawText('Invoice Date:', rightDetailsX, y, { size: 8, color: gray });
    drawText(formatDate(new Date(order.createdAt)), rightDetailsX + 60, y, { size: 8 });
    
    // PAN
    drawText(`PAN: ${seller?.panNumber || 'N/A'}`, gstinX, y + 6, { size: 8 });

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

    drawText(sellerName.toUpperCase(), soldByX, y, { size: 8, bold: true, maxWidth: colWidth - 10 });
    y -= 10;
    
    // Wrap seller address
    const sellerAddrLines = this.wrapText(sellerAddress || 'Address not available', font, 8, colWidth - 10);
    for (const line of sellerAddrLines) {
      drawText(line, soldByX, y, { size: 7 });
      y -= 9;
    }
    
    if (seller?.gstNumber) {
      drawText(`GST: ${seller.gstNumber}`, soldByX, y, { size: 7, bold: true });
      y -= 9;
    }

    // Reset y for billing/shipping (they start from same line as sold by)
    let billingY = y + (sellerAddrLines.length * 9) + (seller?.gstNumber ? 9 : 0) + 10;
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
    const tableTop = y;
    const tableLeft = MARGIN;
    const tableRight = A4_WIDTH - MARGIN;
    const tableWidth = tableRight - tableLeft;

    // Column positions
    const cols = {
      product: tableLeft + 5,
      description: tableLeft + 180,
      qty: tableLeft + 280,
      grossAmt: tableLeft + 310,
      discount: tableLeft + 360,
      taxable: tableLeft + 400,
      igst: tableLeft + 450,
      cess: tableLeft + 485,
      total: tableLeft + 510,
    };

    // Table header
    const headerHeight = 30;
    drawRect(tableLeft, y - headerHeight, tableWidth, headerHeight);
    
    y -= 10;
    drawText('Product', cols.product, y, { size: 7, bold: true });
    drawText('Description', cols.description, y, { size: 7, bold: true });
    drawText('Qty', cols.qty, y, { size: 7, bold: true });
    drawText('Gross', cols.grossAmt, y, { size: 7, bold: true });
    drawText('Discount', cols.discount, y, { size: 7, bold: true });
    drawText('Taxable', cols.taxable, y, { size: 7, bold: true });
    drawText('IGST', cols.igst, y, { size: 7, bold: true });
    drawText('CESS', cols.cess, y, { size: 7, bold: true });
    drawText('Total', cols.total, y, { size: 7, bold: true });
    
    y -= 10;
    drawText('', cols.product, y, { size: 6 });
    drawText('', cols.description, y, { size: 6 });
    drawText('', cols.qty, y, { size: 6 });
    drawText('Amount', cols.grossAmt, y, { size: 6 });
    drawText('', cols.discount, y, { size: 6 });
    drawText('Value', cols.taxable, y, { size: 6 });
    drawText('', cols.igst, y, { size: 6 });
    drawText('', cols.cess, y, { size: 6 });
    drawText('', cols.total, y, { size: 6 });

    y -= 12;

    // Calculate discount ratio for proportional distribution
    const subtotal = toNum(order.subtotal);
    const totalDiscount = toNum(order.discount);
    const discountRatio = subtotal > 0 ? totalDiscount / subtotal : 0;

    let totalQty = 0;
    let grandTotal = 0;

    // Items
    for (const item of order.items as OrderItemWithDetails[]) {
      const itemPrice = toNum(item.price);
      const itemQty = toNum(item.quantity);
      const gstRate = toNum(item.gstRate) || 18;
      const grossAmount = itemPrice * itemQty;
      const itemDiscount = grossAmount * discountRatio;
      const taxableValue = grossAmount - itemDiscount;
      const igst = taxableValue * (gstRate / 100);
      const cess = 0; // CESS is usually 0 for most products
      const itemTotal = taxableValue + igst + cess;

      totalQty += itemQty;
      grandTotal += itemTotal;

      const rowHeight = 35;
      drawRect(tableLeft, y - rowHeight + 10, tableWidth, rowHeight);

      // Product name (wrap if needed)
      const productName = safeStr(item.productName);
      const productLines = this.wrapText(productName, font, 7, 170);
      let productY = y;
      for (const line of productLines.slice(0, 2)) {
        drawText(line, cols.product, productY, { size: 7 });
        productY -= 9;
      }

      // HSN and GST info
      const hsnCode = item.hsnCode || 'N/A';
      const hsnInfo = `HSN: ${hsnCode} | IGST: ${gstRate.toFixed(0)}% | CESS: 0.00%`;
      drawText(hsnInfo, cols.description, y, { size: 6, color: gray });
      
      // IMEI/Serial if available
      if (item.imeiSerialNo) {
        drawText(`IMEI/SrNo: [${item.imeiSerialNo}]`, cols.description, y - 10, { size: 6, color: gray });
      }

      // Numbers
      drawText(String(itemQty), cols.qty, y - 5, { size: 7 });
      drawText(grossAmount.toFixed(2), cols.grossAmt, y - 5, { size: 7 });
      drawText(itemDiscount > 0 ? `-${itemDiscount.toFixed(2)}` : '0', cols.discount, y - 5, { size: 7 });
      drawText(taxableValue.toFixed(2), cols.taxable, y - 5, { size: 7 });
      drawText(igst.toFixed(2), cols.igst, y - 5, { size: 7 });
      drawText(cess.toFixed(2), cols.cess, y - 5, { size: 7 });
      drawText(itemTotal.toFixed(2), cols.total, y - 5, { size: 7, bold: true });

      y -= rowHeight;
    }

    // Handling Fee row (if shipping > 0)
    const shippingCost = toNum(order.shipping);
    if (shippingCost > 0) {
      const rowHeight = 20;
      drawRect(tableLeft, y - rowHeight + 10, tableWidth, rowHeight);
      drawText('Handling Fee', cols.product, y, { size: 7 });
      drawText('1', cols.qty, y - 5, { size: 7 });
      drawText(shippingCost.toFixed(2), cols.grossAmt, y - 5, { size: 7 });
      drawText('0', cols.discount, y - 5, { size: 7 });
      drawText(shippingCost.toFixed(2), cols.taxable, y - 5, { size: 7 });
      drawText('0.00', cols.igst, y - 5, { size: 7 });
      drawText('0.00', cols.cess, y - 5, { size: 7 });
      drawText(shippingCost.toFixed(2), cols.total, y - 5, { size: 7 });
      y -= rowHeight;
      grandTotal += shippingCost;
    }

    y -= 15;

    // ─── Total Summary ───
    drawText(`TOTAL QTY: ${totalQty}`, MARGIN, y, { size: 9, bold: true });
    
    const totalX = A4_WIDTH - MARGIN - 150;
    drawText(`TOTAL PRICE: ${toNum(order.total).toFixed(2)}`, totalX, y, { size: 10, bold: true });
    y -= 12;
    drawText('All values are in INR', totalX + 50, y, { size: 7, color: gray });

    y -= 30;

    // ─── Seller Registered Address Box ───
    const boxHeight = 50;
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

    drawText('Seller Registered Address:', MARGIN + 5, y - 10, { size: 8, bold: true });
    drawText(sellerName.toUpperCase(), MARGIN + 5, y - 22, { size: 7, bold: true });
    
    const fullSellerAddr = [
      seller?.businessAddress,
      seller?.businessCity,
      `${seller?.businessState || ''} - ${seller?.businessPincode || ''}`.trim(),
    ].filter(Boolean).join(', ');
    
    const addrLines = this.wrapText(fullSellerAddr || 'Address not available', font, 7, tableWidth * 0.6);
    let addrY = y - 32;
    for (const line of addrLines.slice(0, 2)) {
      drawText(line, MARGIN + 5, addrY, { size: 7 });
      addrY -= 9;
    }
    drawText('FSSAI License number: null', MARGIN + 5, addrY, { size: 7 });

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

    // Try to embed signature if available
    if (seller?.signatureData) {
      try {
        // signatureData is base64 encoded PNG
        const sigData = seller.signatureData.includes('base64,') 
          ? seller.signatureData.split(',')[1] 
          : seller.signatureData;
        const sigBytes = Buffer.from(sigData, 'base64');
        const sigImage = await pdf.embedPng(sigBytes);
        page.drawImage(sigImage, {
          x: sigBoxX + 20,
          y: boxY + 8,
          width: 60,
          height: 30,
        });
      } catch {
        // Signature embedding failed, show placeholder
        drawText('(Signature)', sigBoxX + 30, boxY + 25, { size: 8, color: gray });
      }
    } else {
      drawText('(Signature)', sigBoxX + 30, boxY + 25, { size: 8, color: gray });
    }

    drawText(sellerName.toUpperCase(), sigBoxX + 10, boxY + 5, { size: 7, bold: true });
    drawText('Authorized Signature', sigBoxX + 10, boxY - 5, { size: 6, color: gray });

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
