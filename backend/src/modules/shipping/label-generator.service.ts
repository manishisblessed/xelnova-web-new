import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import * as bwipjs from 'bwip-js';
import * as QRCode from 'qrcode';

interface ShippingLabelConfig {
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  companyPhone: string;
  companyGstin: string;
  tagline: string;
  footerText: string;
  showSellerSignature: boolean;
  showBarcode: boolean;
  logisticsName: string;
}

const PAGE_W = 595;
const PAGE_H = 842;
const M = 22;
/** Horizontal split: top = shipping label, bottom = tax invoice (Flipkart-style). */
const SPLIT_Y = 398;
const LINE_H = 11;
const BORDER = rgb(0.72, 0.72, 0.72);
const MUTED = rgb(0.38, 0.38, 0.38);
const BLACK = rgb(0, 0, 0);

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

function formatDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}${min} hrs, ${day}/${month}/${year}`;
}

function formatInvoiceNo(orderNumber: string): string {
  return `XNV${orderNumber.replace(/^XN-/, '').replace(/-/g, '')}`;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawDashedSeparator(page: PDFPage, y: number) {
  const dash = 5;
  const gap = 4;
  let x = M;
  while (x < PAGE_W - M) {
    page.drawLine({
      start: { x, y },
      end: { x: Math.min(x + dash, PAGE_W - M), y },
      thickness: 0.6,
      color: rgb(0.55, 0.55, 0.55),
    });
    x += dash + gap;
  }
}

@Injectable()
export class LabelGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generateShippingLabel(orderId: string, sellerUserId: string): Promise<Buffer> {
    const seller = await this.prisma.sellerProfile.findFirst({
      where: { userId: sellerUserId },
      select: {
        id: true,
        storeName: true,
        location: true,
        gstNumber: true,
        panNumber: true,
        businessAddress: true,
        businessCity: true,
        businessState: true,
        businessPincode: true,
        signatureUrl: true,
        signatureData: true,
      },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');

    const sellerProductIds = (
      await this.prisma.product.findMany({ where: { sellerId: seller.id }, select: { id: true } })
    ).map((p) => p.id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true, images: true } },
          },
        },
        shippingAddress: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const hasSellerProducts = order.items.some((item) => sellerProductIds.includes(item.productId));
    if (!hasSellerProducts) throw new ForbiddenException('Order has none of your products');

    const sellerItems = order.items.filter((item) => sellerProductIds.includes(item.productId));

    const settings = await this.loadLabelConfig();
    const logistics = settings.logisticsName || 'Xelnova Logistics';
    const prepaid = order.paymentStatus === 'PAID' || (order.paymentMethod || '').toUpperCase() === 'WALLET';

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const drawText = (
      t: string,
      x: number,
      y: number,
      opts?: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number },
    ) => {
      const f = opts?.font ?? font;
      const s = opts?.size ?? 8;
      let txt = safeStr(t);
      if (opts?.maxWidth) {
        while (f.widthOfTextAtSize(txt, s) > opts.maxWidth && txt.length > 4) {
          txt = txt.slice(0, -4) + '...';
        }
      }
      page.drawText(txt, { x, y, size: s, font: f, color: opts?.color ?? BLACK });
    };

    const drawRect = (x: number, y: number, w: number, h: number) => {
      page.drawRectangle({ x, y, width: w, height: h, borderColor: BORDER, borderWidth: 0.45 });
    };

    // ═══ TOP: Shipping label (exterior) ═══
    let y = PAGE_H - M;

    drawText('STD', M, y, { size: 8, font: fontBold });
    const logW = fontBold.widthOfTextAtSize(logistics, 9);
    drawText(logistics, (PAGE_W - logW) / 2, y, { size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.55) });
    drawText(prepaid ? 'PREPAID' : 'COD', PAGE_W - M - fontBold.widthOfTextAtSize(prepaid ? 'PREPAID' : 'COD', 8), y, {
      size: 8,
      font: fontBold,
      color: rgb(0.85, 0.2, 0.2),
    });
    y -= LINE_H + 2;

    const barcodePngTop = await this.safeBarcode(order.orderNumber, 2, 11);
    if (barcodePngTop) {
      const bc = await pdf.embedPng(barcodePngTop);
      const sc = Math.min((PAGE_W - 2 * M) / bc.width, 1);
      const bw = bc.width * sc;
      const bh = bc.height * sc;
      page.drawImage(bc, { x: M, y: y - bh, width: bw, height: bh });
      drawText(order.orderNumber, M + bw / 2 - font.widthOfTextAtSize(order.orderNumber, 7) / 2, y - bh - 10, {
        size: 7,
        color: MUTED,
      });
      y -= bh + 16;
    }

    const qrPayload = JSON.stringify({
      order: order.orderNumber,
      awb: order.orderNumber,
      to: order.shippingAddress?.pincode || '',
    });
    const qrPng = await QRCode.toBuffer(qrPayload, { type: 'png', width: 120, margin: 0 });
    const qrImg = await pdf.embedPng(qrPng);
    const qrSize = 72;

    const addr = order.shippingAddress;
    const shipLines: string[] = [];
    if (addr) {
      shipLines.push(addr.fullName.toUpperCase());
      for (const part of [addr.addressLine1, addr.addressLine2].filter(Boolean)) {
        wrapText(safeStr(part), font, 7.5, PAGE_W - M - qrSize - M - 30).forEach((l) => shipLines.push(l));
      }
      shipLines.push(`${addr.city} - ${addr.pincode}, IN-${this.stateCode(addr.state)}`);
      shipLines.push(`Ph: ${addr.phone}`);
    } else {
      shipLines.push(order.user?.name || 'Customer', 'Address on file');
    }

    const leftBlockW = PAGE_W - M - qrSize - M - 16;
    drawText(`Ordered through ${settings.companyName}`, M, y, { size: 7, color: MUTED });
    y -= 10;
    const awbLabel = `AWB: ${order.orderNumber}`;
    drawText(awbLabel, M, y, { size: 8, font: fontBold });
    y -= 12;

    let ty = y;
    for (const line of shipLines.slice(0, 8)) {
      drawText(line, M + 4, ty, { size: 7.5, maxWidth: leftBlockW });
      ty -= 9;
    }
    page.drawImage(qrImg, { x: PAGE_W - M - qrSize, y: y - qrSize + 8, width: qrSize, height: qrSize });
    y = Math.min(ty, y - qrSize) - 8;

    // Sold by strip
    drawRect(M, y - 36, PAGE_W - 2 * M, 36);
    drawText('Sold By:', M + 4, y - 10, { size: 7, font: fontBold });
    const soldLine1 = seller.storeName.toUpperCase();
    const soldLine2 = [
      [seller.businessAddress, seller.businessCity].filter(Boolean).join(', '),
      [seller.businessState, seller.businessPincode].filter(Boolean).join(' - '),
      seller.gstNumber ? `GSTIN: ${seller.gstNumber}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    drawText(soldLine1, M + 52, y - 10, { size: 7, font: fontBold, maxWidth: PAGE_W - 120 });
    drawText(soldLine2 || seller.location || '', M + 52, y - 22, { size: 6.5, color: MUTED, maxWidth: PAGE_W - 120 });
    y -= 42;

    // Items table (label): # | SKU | Description | Qty
    drawText('# | SKU | Description | Qty', M, y, { size: 7, font: fontBold });
    y -= 10;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: PAGE_W - M, y: y + 4 }, thickness: 0.4, color: BORDER });
    y -= 4;

    for (let i = 0; i < sellerItems.length; i++) {
      const it = sellerItems[i];
      const sku = it.product?.sku || it.productId.slice(-8);
      const desc = safeStr(it.productName).slice(0, 85) + (safeStr(it.productName).length > 85 ? '…' : '');
      const row = `${i + 1} | ${sku} | ${desc} | ${it.quantity}`;
      drawText(row, M + 2, y, { size: 6.5, maxWidth: PAGE_W - 2 * M - 4 });
      y -= 10;
      if (y < SPLIT_Y + 70) break;
    }

    y -= 4;
    const barcodePngBot = await this.safeBarcode(order.orderNumber, 2, 10);
    if (barcodePngBot) {
      const bc2 = await pdf.embedPng(barcodePngBot);
      const sc2 = Math.min(200 / bc2.width, 1);
      const bw2 = bc2.width * sc2;
      const bh2 = bc2.height * sc2;
      page.drawImage(bc2, { x: M, y: y - bh2, width: bw2, height: bh2 });
      const route = addr?.pincode?.slice(0, 3) || 'XNV';
      drawText(route, PAGE_W - M - 28, y - bh2 / 2, { size: 22, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
      y -= bh2 + 8;
    }

    const printed = new Date();
    drawText('Not for resale.', M, y, { size: 6, color: MUTED });
    drawText(`Printed at ${formatDateTime(printed)}`, PAGE_W - M - 150, y, { size: 6, color: MUTED });

    // ═══ Separator ═══
    drawDashedSeparator(page, SPLIT_Y);

    // ═══ BOTTOM: Tax invoice ═══
    y = SPLIT_Y - 18;

    drawText('Tax Invoice', M, y, { size: 13, font: fontBold });
    y -= 16;

    const invNo = formatInvoiceNo(order.orderNumber);
    drawText('Order Id:', M, y, { size: 7, color: MUTED });
    drawText(order.orderNumber, M + 48, y, { size: 8, font: fontBold });
    drawText('Invoice No:', 240, y, { size: 7, color: MUTED });
    drawText(invNo, 300, y, { size: 8, font: fontBold });
    drawText(`GSTIN: ${seller.gstNumber || 'N/A'}`, PAGE_W - M - 130, y + 14, { size: 7 });
    y -= 11;
    drawText('Order Date:', M, y, { size: 7, color: MUTED });
    drawText(this.fmtOrderDate(order.createdAt), M + 58, y, { size: 8 });
    drawText('Invoice Date:', 240, y, { size: 7, color: MUTED });
    drawText(this.fmtOrderDate(order.createdAt), 305, y, { size: 8 });
    drawText(`PAN: ${seller.panNumber || 'N/A'}`, PAGE_W - M - 130, y, { size: 7 });
    y -= 12;

    try {
      const qrInv = await QRCode.toBuffer(
        JSON.stringify({ order: order.orderNumber, invoice: invNo, total: order.total }),
        { type: 'png', width: 100, margin: 0 },
      );
      const qri = await pdf.embedPng(qrInv);
      page.drawImage(qri, { x: PAGE_W - M - 52, y: y - 8, width: 48, height: 48 });
    } catch {
      /* optional */
    }

    y -= 8;
    const colW = (PAGE_W - 2 * M) / 3;
    const c0 = M;
    const c1 = M + colW;
    const c2 = M + colW * 2;
    const hdrY = y;
    drawText('Sold By', c0, hdrY, { size: 8, font: fontBold });
    drawText('Billing Address', c1, hdrY, { size: 8, font: fontBold });
    drawText('Shipping Address', c2, hdrY, { size: 8, font: fontBold });
    y = hdrY - 12;

    const sellerBlock = [
      seller.storeName.toUpperCase(),
      [seller.businessAddress, seller.businessCity].filter(Boolean).join(', '),
      [seller.businessState, seller.businessPincode].filter(Boolean).join(' - '),
      seller.gstNumber ? `GSTIN: ${seller.gstNumber}` : '',
    ].filter(Boolean);
    let sy = y;
    for (const line of sellerBlock) {
      for (const wl of wrapText(line, font, 6.5, colW - 8)) {
        drawText(wl, c0, sy, { size: 6.5, maxWidth: colW - 8 });
        sy -= 8;
      }
    }

    const billName = addr?.fullName || order.user?.name || 'Customer';
    const billAddr = addr
      ? [addr.addressLine1, addr.addressLine2, `${addr.city}, ${addr.state} - ${addr.pincode}`].filter(Boolean).join(', ')
      : '';
    let by = y;
    drawText(billName, c1, by, { size: 7, font: fontBold });
    by -= 9;
    for (const wl of wrapText(billAddr || '—', font, 6.5, colW - 8)) {
      drawText(wl, c1, by, { size: 6.5, maxWidth: colW - 8 });
      by -= 8;
    }

    let shy = y;
    if (addr) {
      drawText(addr.fullName, c2, shy, { size: 7, font: fontBold });
      shy -= 9;
      for (const wl of wrapText(
        [addr.addressLine1, addr.addressLine2, `${addr.city}, ${addr.state} - ${addr.pincode}`].filter(Boolean).join(', '),
        font,
        6.5,
        colW - 8,
      )) {
        drawText(wl, c2, shy, { size: 6.5, maxWidth: colW - 8 });
        shy -= 8;
      }
    }
    y = Math.min(sy, by, shy) - 12;

    // GST table (seller lines only)
    const tableL = M;
    const tableR = PAGE_W - M;
    const cols = {
      p: tableL + 4,
      d: tableL + 118,
      q: tableL + 268,
      g: tableL + 292,
      di: tableL + 332,
      tx: tableL + 378,
      ig: tableL + 428,
      ce: tableL + 468,
      to: tableL + 498,
    };

    const subtotal = toNum(order.subtotal);
    const discRatio = subtotal > 0 ? toNum(order.discount) / subtotal : 0;

    drawRect(tableL, y - 22, tableR - tableL, 22);
    let hy = y - 8;
    drawText('Product', cols.p, hy, { size: 6, font: fontBold });
    drawText('Description / HSN', cols.d, hy, { size: 6, font: fontBold });
    drawText('Qty', cols.q, hy, { size: 6, font: fontBold });
    drawText('Gross', cols.g, hy, { size: 6, font: fontBold });
    drawText('Discount', cols.di, hy, { size: 6, font: fontBold });
    drawText('Taxable', cols.tx, hy, { size: 6, font: fontBold });
    drawText('IGST', cols.ig, hy, { size: 6, font: fontBold });
    drawText('CESS', cols.ce, hy, { size: 6, font: fontBold });
    drawText('Total', cols.to, hy, { size: 6, font: fontBold });
    hy -= 10;
    drawText('Amount', cols.g, hy, { size: 5, color: MUTED });
    drawText('Value', cols.tx, hy, { size: 5, color: MUTED });
    y -= 26;

    let totalQty = 0;
    let running = 0;

    for (const item of sellerItems) {
      const itemPrice = toNum(item.price);
      const itemQty = toNum(item.quantity);
      const gstRate = toNum(item.gstRate) || 18;
      const grossAmount = itemPrice * itemQty;
      const itemDiscount = grossAmount * discRatio;
      const taxableValue = grossAmount - itemDiscount;
      const igst = taxableValue * (gstRate / 100);
      const cess = 0;
      const lineTot = taxableValue + igst + cess;
      totalQty += itemQty;
      running += lineTot;

      const rowH = 28;
      drawRect(tableL, y - rowH + 6, tableR - tableL, rowH);

      const pname = wrapText(safeStr(item.productName), font, 6.5, 105);
      let py = y;
      for (const pl of pname.slice(0, 2)) {
        drawText(pl, cols.p, py, { size: 6.5, maxWidth: 105 });
        py -= 8;
      }
      const hsn = item.hsnCode || '—';
      drawText(`HSN: ${hsn} | GST ${gstRate}%`, cols.d, y, { size: 5.5, color: MUTED });
      drawText(String(itemQty), cols.q, y - 6, { size: 7 });
      drawText(grossAmount.toFixed(2), cols.g, y - 6, { size: 7 });
      drawText(itemDiscount > 0.01 ? `-${itemDiscount.toFixed(2)}` : '0', cols.di, y - 6, { size: 7 });
      drawText(taxableValue.toFixed(2), cols.tx, y - 6, { size: 7 });
      drawText(igst.toFixed(2), cols.ig, y - 6, { size: 7 });
      drawText(cess.toFixed(2), cols.ce, y - 6, { size: 7 });
      drawText(lineTot.toFixed(2), cols.to, y - 6, { size: 7, font: fontBold });

      y -= rowH;
      if (y < M + 120) break;
    }

    const shipShare =
      subtotal > 0
        ? sellerItems.reduce((s, i) => s + toNum(i.price) * toNum(i.quantity), 0) / subtotal
        : 1;
    const shipAmt = toNum(order.shipping) * shipShare;
    if (shipAmt > 0.01 && y > M + 100) {
      const rowH = 16;
      drawRect(tableL, y - rowH + 6, tableR - tableL, rowH);
      drawText('Handling / Shipping', cols.p, y - 4, { size: 7 });
      drawText('1', cols.q, y - 4, { size: 7 });
      drawText(shipAmt.toFixed(2), cols.g, y - 4, { size: 7 });
      drawText('0', cols.di, y - 4, { size: 7 });
      drawText(shipAmt.toFixed(2), cols.tx, y - 4, { size: 7 });
      drawText('0.00', cols.ig, y - 4, { size: 7 });
      drawText('0.00', cols.ce, y - 4, { size: 7 });
      drawText(shipAmt.toFixed(2), cols.to, y - 4, { size: 7 });
      running += shipAmt;
      y -= rowH;
    }

    y -= 10;
    drawText(`TOTAL QTY: ${totalQty}`, M, y, { size: 9, font: fontBold });
    const totStr = toNum(order.total).toFixed(2);
    drawText(`TOTAL (order): ${totStr}`, PAGE_W - M - fontBold.widthOfTextAtSize(`TOTAL (order): ${totStr}`, 9), y, {
      size: 9,
      font: fontBold,
    });
    y -= 11;
    drawText('All values are in INR', PAGE_W - M - 100, y, { size: 6, color: MUTED });
    y -= 18;

    drawText('E. & O.E.', M, y, { size: 7, color: MUTED });
    const ob = `Ordered Through ${settings.companyName}`;
    drawText(ob, (PAGE_W - font.widthOfTextAtSize(ob, 9)) / 2, y, { size: 9, color: rgb(0.35, 0.2, 0.65) });
    y -= 28;

    // Authorised signature (seller)
    if (settings.showSellerSignature) {
      const sigSrc = seller.signatureUrl || seller.signatureData;
      if (sigSrc) {
        try {
          let bytes: Uint8Array;
          if (seller.signatureData?.startsWith('data:')) {
            bytes = Uint8Array.from(Buffer.from(seller.signatureData.split(',')[1], 'base64'));
          } else if (seller.signatureUrl) {
            const r = await fetch(seller.signatureUrl);
            bytes = new Uint8Array(await r.arrayBuffer());
          } else {
            bytes = new Uint8Array();
          }
          if (bytes.length) {
            const isPng =
              sigSrc.includes('png') || sigSrc.includes('image/png') || seller.signatureData?.includes('image/png');
            const sigImg = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
            const sw = 70;
            const sh = 32;
            page.drawImage(sigImg, { x: PAGE_W - M - sw - 8, y: y - sh + 8, width: sw, height: sh });
          }
        } catch {
          /* */
        }
      }
      drawText('Authorised Signatory', PAGE_W - M - 88, y - 28, { size: 6, color: MUTED });
      drawText(seller.storeName.toUpperCase(), PAGE_W - M - 88, y - 36, { size: 7, font: fontBold });
    }

    const pdfBytes = await pdf.save();
    return Buffer.from(pdfBytes);
  }

  private fmtOrderDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /** 2-letter state code for label (best-effort). */
  private stateCode(stateName: string): string {
    const s = safeStr(stateName).toLowerCase();
    const map: Record<string, string> = {
      'delhi': 'DL',
      'haryana': 'HR',
      'tamil nadu': 'TN',
      'maharashtra': 'MH',
      'karnataka': 'KA',
      'west bengal': 'WB',
      'uttar pradesh': 'UP',
      'telangana': 'TG',
      'gujarat': 'GJ',
      'rajasthan': 'RJ',
    };
    for (const [k, v] of Object.entries(map)) {
      if (s.includes(k)) return v;
    }
    return (stateName || 'IN').slice(0, 2).toUpperCase();
  }

  private async safeBarcode(text: string, scale: number, height: number): Promise<Buffer | null> {
    try {
      return await bwipjs.toBuffer({
        bcid: 'code128',
        text,
        scale,
        height,
        includetext: true,
        textsize: 7,
      });
    } catch {
      return null;
    }
  }

  private async loadLabelConfig(): Promise<ShippingLabelConfig> {
    const defaults: ShippingLabelConfig = {
      companyName: 'Xelnova',
      companyLogo: '',
      companyAddress: '',
      companyPhone: '',
      companyGstin: '',
      tagline: '',
      footerText: 'Thank you for shopping with us!',
      showSellerSignature: true,
      showBarcode: true,
      logisticsName: 'Xelnova Logistics',
    };

    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!row?.payload) return defaults;

    const payload = row.payload as Record<string, unknown>;
    const sl = (payload.shippingLabel ?? {}) as Record<string, unknown>;

    return {
      companyName: (sl.companyName as string) || defaults.companyName,
      companyLogo: (sl.companyLogo as string) || defaults.companyLogo,
      companyAddress: (sl.companyAddress as string) || defaults.companyAddress,
      companyPhone: (sl.companyPhone as string) || defaults.companyPhone,
      companyGstin: (sl.companyGstin as string) || defaults.companyGstin,
      tagline: (sl.tagline as string) || defaults.tagline,
      footerText: (sl.footerText as string) ?? defaults.footerText,
      showSellerSignature: sl.showSellerSignature !== undefined ? !!sl.showSellerSignature : defaults.showSellerSignature,
      showBarcode: sl.showBarcode !== undefined ? !!sl.showBarcode : defaults.showBarcode,
      logisticsName: (sl.logisticsName as string) || defaults.logisticsName,
    };
  }
}
