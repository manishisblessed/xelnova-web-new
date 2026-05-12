import { Injectable, Logger, NotFoundException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import * as bwipjs from 'bwip-js';
import * as QRCode from 'qrcode';
import { ShippingService } from './shipping.service';
import { gstAmountFromInclusive } from '@xelnova/utils';

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
  private readonly logger = new Logger(LabelGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    // forwardRef avoids a circular-dependency edge case if ShippingService
    // ever needs to call back into LabelGeneratorService.
    @Inject(forwardRef(() => ShippingService))
    private readonly shippingService: ShippingService,
  ) {}

  async generateShippingLabel(orderId: string, sellerUserId: string): Promise<Buffer> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
      select: { shippingMode: true, awbNumber: true, courierOrderId: true, courierProvider: true },
    });

    const isSelfShip = !shipment || shipment.shippingMode === 'SELF_SHIP';
    const hasCarrierRef = Boolean(shipment?.awbNumber || shipment?.courierOrderId);

    // Self-ship or no shipment at all → use the Xelnova fallback label.
    if (isSelfShip || !hasCarrierRef) {
      return this.generateXelnovaFallbackLabel(orderId, sellerUserId);
    }

    // Integrated carrier shipment — always serve the carrier's official
    // label. The rider scans the carrier's barcode at pickup, so the
    // bytes the seller prints MUST be exactly what the carrier issued.
    // If getCarrierIssuedLabel throws (e.g. 503 "not ready"), let that
    // error propagate — never fall back to a branded label for
    // integrated shipments.
    const official = await this.shippingService.getCarrierIssuedLabel(orderId, sellerUserId);
    if (official && official.length > 0) {
      this.logger.log(
        `Returning carrier-issued label for order ${orderId} (${official.length} bytes).`,
      );
      return official;
    }

    // Carrier IS integrated but label fetch returned null (no provider
    // configured, or carrier returned empty) — throw so the seller can
    // retry or fix the carrier config.
    this.logger.warn(
      `Carrier label unavailable for order ${orderId} (mode=${shipment.shippingMode}, awb=${shipment.awbNumber}, courierOrderId=${shipment.courierOrderId}). Returning 503 for retry.`,
    );
    const err = new Error(
      'Shipping label is not ready yet. The courier usually generates it within 1-2 minutes after booking. Please try again shortly.',
    );
    (err as any).status = 503;
    throw err;
  }

  /**
   * Custom Xelnova-branded label PDF. Used ONLY when the shipment has
   * no carrier-issued label (self-ship, or Xelgo running on the
   * internal stub). Real carrier shipments always serve the carrier's
   * exact PDF instead.
   */
  private async generateXelnovaFallbackLabel(orderId: string, sellerUserId: string): Promise<Buffer> {
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
        shipment: {
          select: {
            courierProvider: true,
            awbNumber: true,
            shippingMode: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const hasSellerProducts = order.items.some((item) => sellerProductIds.includes(item.productId));
    if (!hasSellerProducts) throw new ForbiddenException('Order has none of your products');

    const sellerItems = order.items.filter((item) => sellerProductIds.includes(item.productId));

    const settings = await this.loadLabelConfig();
    /**
     * Sellers asked us to stop branding the label as "Xelgo" — they want
     * the actual carrier (Delhivery / XpressBees / Ekart / …) printed at
     * the top so the rider and the warehouse staff immediately see who's
     * picking the parcel up. We fall back to the configured platform
     * logistics name only when no shipment record exists yet (e.g. a
     * preview download before the shipment is booked).
     */
    const logistics = this.resolveLogisticsLabel(
      order.shipment?.courierProvider ?? null,
      settings.logisticsName,
    );
    const awbForLabel = order.shipment?.awbNumber || order.orderNumber;
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

    const barcodePngTop = await this.safeBarcode(awbForLabel, 2, 11);
    if (barcodePngTop) {
      const bc = await pdf.embedPng(barcodePngTop);
      const sc = Math.min((PAGE_W - 2 * M) / bc.width, 1);
      const bw = bc.width * sc;
      const bh = bc.height * sc;
      page.drawImage(bc, { x: M, y: y - bh, width: bw, height: bh });
      drawText(awbForLabel, M + bw / 2 - font.widthOfTextAtSize(awbForLabel, 7) / 2, y - bh - 10, {
        size: 7,
        color: MUTED,
      });
      y -= bh + 16;
    }

    const qrPayload = JSON.stringify({
      order: order.orderNumber,
      awb: awbForLabel,
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
    const awbLabel = `AWB: ${awbForLabel}`;
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
    const soldStripH = 40;
    drawRect(M, y - soldStripH, PAGE_W - 2 * M, soldStripH);
    drawText('Sold By:', M + 4, y - 10, { size: 7, font: fontBold });
    const soldLine1 = seller.storeName.toUpperCase();
    const soldAddrPart = [seller.businessAddress, seller.businessCity, seller.businessState, seller.businessPincode]
      .filter(Boolean).join(', ');
    const soldGstin = seller.gstNumber ? `GSTIN: ${seller.gstNumber}` : '';
    const maxSoldW = PAGE_W - 2 * M - 60;
    drawText(soldLine1, M + 52, y - 10, { size: 7, font: fontBold, maxWidth: maxSoldW });
    drawText(soldAddrPart || seller.location || '', M + 52, y - 20, { size: 6, color: MUTED, maxWidth: maxSoldW });
    if (soldGstin) {
      drawText(soldGstin, M + 52, y - 29, { size: 6, color: MUTED, maxWidth: maxSoldW });
    }
    y -= soldStripH + 6;

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
    const barcodePngBot = await this.safeBarcode(awbForLabel, 2, 10);
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

    /**
     * Brand-accent palette for the invoice half. Picked to feel premium
     * (deep purple, similar to the Xelnova brand mark) without dropping a
     * giant logo into the document — the seller's branding still owns the
     * "Sold By" block.
     */
    const ACCENT = rgb(0.36, 0.20, 0.66);
    const ACCENT_SOFT = rgb(0.96, 0.94, 0.99);
    const TABLE_HDR_BG = rgb(0.94, 0.92, 0.98);
    const ROW_ALT = rgb(0.985, 0.985, 0.99);

    const drawFilledRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      color: ReturnType<typeof rgb>,
      borderColor?: ReturnType<typeof rgb>,
    ) => {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color,
        borderColor: borderColor ?? color,
        borderWidth: borderColor ? 0.5 : 0,
      });
    };

    y = SPLIT_Y - 14;

    // ── Invoice header bar ─────────────────────────────────────────────
    const headerH = 28;
    drawFilledRect(M, y - headerH, PAGE_W - 2 * M, headerH, ACCENT);
    drawText('TAX INVOICE', M + 12, y - 11, { size: 12, font: fontBold, color: rgb(1, 1, 1) });
    drawText(
      'Original for Recipient',
      M + 12,
      y - 22,
      { size: 6.5, color: rgb(0.92, 0.9, 0.98) },
    );
    const invNo = formatInvoiceNo(order.orderNumber);
    const invNoLabel = `Invoice # ${invNo}`;
    const invNoLabelW = fontBold.widthOfTextAtSize(invNoLabel, 9);
    drawText(invNoLabel, PAGE_W - M - 12 - invNoLabelW, y - 11, {
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    const invDateStr = this.fmtOrderDate(order.createdAt);
    const invDateW = font.widthOfTextAtSize(`Dated ${invDateStr}`, 7);
    drawText(`Dated ${invDateStr}`, PAGE_W - M - 12 - invDateW, y - 22, {
      size: 7,
      color: rgb(0.92, 0.9, 0.98),
    });
    y -= headerH + 10;

    // ── Invoice meta strip (light tinted band) ─────────────────────────
    const metaH = 52;
    drawFilledRect(M, y - metaH, PAGE_W - 2 * M, metaH, ACCENT_SOFT, ACCENT);

    const metaPadX = 12;
    const qrSizeInv = 30;
    const metaContentW = PAGE_W - 2 * M - qrSizeInv - 20;
    const metaCol1 = M + metaPadX;
    const metaCol2 = M + metaContentW * 0.36;
    const metaCol3 = M + metaContentW * 0.66;

    const drawMeta = (
      x: number,
      label: string,
      value: string,
      yTop: number,
      maxW?: number,
    ) => {
      drawText(label.toUpperCase(), x, yTop, { size: 6, color: MUTED, font: fontBold });
      drawText(value, x, yTop - 10, { size: 7.5, font: fontBold, maxWidth: maxW });
    };

    const metaColW = metaContentW * 0.30;
    drawMeta(metaCol1, 'Order ID', order.orderNumber, y - 8, metaColW);
    drawMeta(metaCol2, 'Order Date', this.fmtOrderDate(order.createdAt), y - 8, metaColW);
    drawMeta(metaCol3, 'Payment', prepaid ? 'Prepaid' : 'COD', y - 8, metaColW);

    drawMeta(metaCol1, 'Seller GSTIN', seller.gstNumber || 'N/A', y - 28, metaColW);
    drawMeta(metaCol2, 'Seller PAN', seller.panNumber || 'N/A', y - 28, metaColW);
    drawMeta(
      metaCol3,
      'Place of Supply',
      addr ? `${addr.state} (${this.stateCode(addr.state)})` : '—',
      y - 28,
      metaColW,
    );

    try {
      const qrInv = await QRCode.toBuffer(
        JSON.stringify({ order: order.orderNumber, invoice: invNo, total: order.total }),
        { type: 'png', width: 110, margin: 0 },
      );
      const qri = await pdf.embedPng(qrInv);
      page.drawImage(qri, {
        x: PAGE_W - M - qrSizeInv - 6,
        y: y - metaH + (metaH - qrSizeInv) / 2,
        width: qrSizeInv,
        height: qrSizeInv,
      });
    } catch {
      /* optional */
    }

    y -= metaH + 8;

    // ── Party blocks: Sold By / Bill To / Ship To ─────────────────────
    const partyW = (PAGE_W - 2 * M - 8) / 3;
    const partyH = 78;
    const partyHeaderH = 14;
    const partyGap = 4;
    const partyCols = [M, M + partyW + partyGap, M + (partyW + partyGap) * 2];
    const partyTitles = ['Sold By', 'Bill To', 'Ship To'];

    // shaded title bar + outline for each block
    partyCols.forEach((px, idx) => {
      drawFilledRect(px, y - partyH, partyW, partyH, rgb(1, 1, 1), BORDER);
      drawFilledRect(px, y - partyHeaderH, partyW, partyHeaderH, ACCENT_SOFT, BORDER);
      drawText(partyTitles[idx].toUpperCase(), px + 8, y - partyHeaderH + 4, {
        size: 7,
        font: fontBold,
        color: ACCENT,
      });
    });

    // Sold By
    const soldStartY = y - partyHeaderH - 10;
    let psy = soldStartY;
    drawText(seller.storeName.toUpperCase(), partyCols[0] + 8, psy, {
      size: 7.5,
      font: fontBold,
      maxWidth: partyW - 16,
    });
    psy -= 10;
    const sellerAddrLines = [
      seller.businessAddress,
      seller.businessCity,
      [seller.businessState, seller.businessPincode].filter(Boolean).join(' - '),
      seller.gstNumber ? `GSTIN: ${seller.gstNumber}` : '',
    ].filter(Boolean);
    for (const line of sellerAddrLines) {
      for (const wl of wrapText(safeStr(line), font, 6, partyW - 16)) {
        drawText(wl, partyCols[0] + 8, psy, { size: 6, color: MUTED, maxWidth: partyW - 16 });
        psy -= 7.5;
        if (psy < y - partyH + 4) break;
      }
      if (psy < y - partyH + 4) break;
    }

    // Bill To
    const billToStartY = y - partyHeaderH - 10;
    let pby = billToStartY;
    const billName = addr?.fullName || order.user?.name || 'Customer';
    drawText(billName, partyCols[1] + 8, pby, {
      size: 7.5,
      font: fontBold,
      maxWidth: partyW - 16,
    });
    pby -= 10;
    const billLines = addr
      ? [
          addr.addressLine1,
          addr.addressLine2,
          addr.city,
          `${addr.state} - ${addr.pincode}`,
          addr.phone ? `Ph: ${addr.phone}` : '',
        ].filter(Boolean)
      : ['Address on file'];
    for (const line of billLines) {
      for (const wl of wrapText(safeStr(line), font, 6, partyW - 16)) {
        drawText(wl, partyCols[1] + 8, pby, { size: 6, color: MUTED, maxWidth: partyW - 16 });
        pby -= 7.5;
        if (pby < y - partyH + 4) break;
      }
      if (pby < y - partyH + 4) break;
    }

    // Ship To
    const shipToStartY = y - partyHeaderH - 10;
    let pshy = shipToStartY;
    if (addr) {
      drawText(addr.fullName, partyCols[2] + 8, pshy, {
        size: 7.5,
        font: fontBold,
        maxWidth: partyW - 16,
      });
      pshy -= 10;
      const shipToLines = [
        addr.addressLine1,
        addr.addressLine2,
        addr.city,
        `${addr.state} - ${addr.pincode}`,
        addr.phone ? `Ph: ${addr.phone}` : '',
      ].filter(Boolean);
      for (const line of shipToLines) {
        for (const wl of wrapText(safeStr(line), font, 6, partyW - 16)) {
          drawText(wl, partyCols[2] + 8, pshy, { size: 6, color: MUTED, maxWidth: partyW - 16 });
          pshy -= 7.5;
          if (pshy < y - partyH + 4) break;
        }
        if (pshy < y - partyH + 4) break;
      }
    } else {
      drawText('Same as billing', partyCols[2] + 8, pshy, { size: 7, color: MUTED });
    }

    y -= partyH + 10;

    // ── GST line items table ──────────────────────────────────────────
    const tableL = M;
    const tableR = PAGE_W - M;
    const tableW = tableR - tableL;

    // Column proportions tuned for clarity (sum = 1.0).
    const colWidths = {
      p: tableW * 0.32,   // Product
      d: tableW * 0.16,   // HSN / GST
      q: tableW * 0.05,   // Qty
      g: tableW * 0.10,   // Gross amount
      di: tableW * 0.08,  // Discount
      tx: tableW * 0.10,  // Taxable value
      ig: tableW * 0.08,  // IGST
      ce: tableW * 0.05,  // CESS
      to: tableW * 0.06,  // Total
    };
    const colX = {
      p: tableL,
      d: tableL + colWidths.p,
      q: tableL + colWidths.p + colWidths.d,
      g: tableL + colWidths.p + colWidths.d + colWidths.q,
      di: tableL + colWidths.p + colWidths.d + colWidths.q + colWidths.g,
      tx: tableL + colWidths.p + colWidths.d + colWidths.q + colWidths.g + colWidths.di,
      ig: tableL + colWidths.p + colWidths.d + colWidths.q + colWidths.g + colWidths.di + colWidths.tx,
      ce: tableL + colWidths.p + colWidths.d + colWidths.q + colWidths.g + colWidths.di + colWidths.tx + colWidths.ig,
      to: tableL + colWidths.p + colWidths.d + colWidths.q + colWidths.g + colWidths.di + colWidths.tx + colWidths.ig + colWidths.ce,
    };

    // Right-aligned helper for numeric cells.
    const drawTextRight = (
      t: string,
      rightX: number,
      yPos: number,
      opts?: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> },
    ) => {
      const f = opts?.font ?? font;
      const s = opts?.size ?? 7;
      const w = f.widthOfTextAtSize(t, s);
      drawText(t, rightX - w, yPos, opts);
    };

    const subtotal = toNum(order.subtotal);
    const discRatio = subtotal > 0 ? toNum(order.discount) / subtotal : 0;

    // Header row
    const tHeaderH = 20;
    drawFilledRect(tableL, y - tHeaderH, tableW, tHeaderH, TABLE_HDR_BG, ACCENT);
    const headerYTop = y - 8;
    const padCell = 5;
    drawText('Product', colX.p + padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });
    drawText('HSN / GST', colX.d + padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });
    drawTextRight('Qty', colX.q + colWidths.q - padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });
    drawTextRight('Gross (Rs.)', colX.g + colWidths.g - padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });
    drawTextRight('Discount', colX.di + colWidths.di - padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });
    drawTextRight('Taxable', colX.tx + colWidths.tx - padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });
    drawTextRight('IGST', colX.ig + colWidths.ig - padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });
    drawTextRight('CESS', colX.ce + colWidths.ce - padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });
    drawTextRight('Total', colX.to + colWidths.to - padCell, headerYTop, { size: 7, font: fontBold, color: ACCENT });

    y -= tHeaderH;

    let totalQty = 0;
    let runningTaxable = 0;
    let runningIgst = 0;

    for (let i = 0; i < sellerItems.length; i++) {
      const item = sellerItems[i];
      const itemPrice = toNum(item.price);
      const itemQty = toNum(item.quantity);
      const gstRate = toNum(item.gstRate) || 18;
      // `item.price` is GST-inclusive — back-out taxable + IGST for the columns.
      const grossAmount = itemPrice * itemQty;
      const itemDiscount = grossAmount * discRatio;
      const lineTot = grossAmount - itemDiscount;
      const igst = gstAmountFromInclusive(lineTot, gstRate);
      const taxableValue = lineTot - igst;
      const cess = 0;
      totalQty += itemQty;
      runningTaxable += taxableValue;
      runningIgst += igst;

      const rowH = 26;
      // Alternating row tint for readability
      if (i % 2 === 1) {
        drawFilledRect(tableL, y - rowH, tableW, rowH, ROW_ALT);
      }
      // Border around the row
      page.drawRectangle({
        x: tableL,
        y: y - rowH,
        width: tableW,
        height: rowH,
        borderColor: BORDER,
        borderWidth: 0.4,
      });

      const pname = wrapText(safeStr(item.productName), font, 7, colWidths.p - padCell * 2);
      let py = y - 9;
      for (const pl of pname.slice(0, 2)) {
        drawText(pl, colX.p + padCell, py, { size: 7, maxWidth: colWidths.p - padCell * 2 });
        py -= 9;
      }
      if (item.product?.sku) {
        drawText(`SKU ${item.product.sku}`, colX.p + padCell, py, { size: 5.5, color: MUTED });
      }

      const hsn = item.hsnCode || '—';
      drawText(`HSN ${hsn}`, colX.d + padCell, y - 11, { size: 6.5 });
      drawText(`GST @ ${gstRate}%`, colX.d + padCell, y - 19, { size: 6, color: MUTED });

      const cellMidY = y - rowH / 2 - 2;
      drawTextRight(String(itemQty), colX.q + colWidths.q - padCell, cellMidY, { size: 8 });
      drawTextRight(grossAmount.toFixed(2), colX.g + colWidths.g - padCell, cellMidY, { size: 7.5 });
      drawTextRight(
        itemDiscount > 0.01 ? `-${itemDiscount.toFixed(2)}` : '—',
        colX.di + colWidths.di - padCell,
        cellMidY,
        { size: 7.5, color: itemDiscount > 0.01 ? rgb(0.7, 0.25, 0.25) : MUTED },
      );
      drawTextRight(taxableValue.toFixed(2), colX.tx + colWidths.tx - padCell, cellMidY, { size: 7.5 });
      drawTextRight(igst.toFixed(2), colX.ig + colWidths.ig - padCell, cellMidY, { size: 7.5 });
      drawTextRight(cess.toFixed(2), colX.ce + colWidths.ce - padCell, cellMidY, { size: 7.5, color: MUTED });
      drawTextRight(lineTot.toFixed(2), colX.to + colWidths.to - padCell, cellMidY, {
        size: 8,
        font: fontBold,
      });

      y -= rowH;
      if (y < M + 110) break;
    }

    const shipShare =
      subtotal > 0
        ? sellerItems.reduce((s, i) => s + toNum(i.price) * toNum(i.quantity), 0) / subtotal
        : 1;
    const shipAmt = toNum(order.shipping) * shipShare;
    if (shipAmt > 0.01 && y > M + 90) {
      const rowH = 18;
      page.drawRectangle({
        x: tableL,
        y: y - rowH,
        width: tableW,
        height: rowH,
        borderColor: BORDER,
        borderWidth: 0.4,
      });
      const cellMidY = y - rowH / 2 - 2;
      drawText('Shipping & Handling', colX.p + padCell, cellMidY, { size: 7, color: MUTED });
      drawTextRight('1', colX.q + colWidths.q - padCell, cellMidY, { size: 7.5 });
      drawTextRight(shipAmt.toFixed(2), colX.g + colWidths.g - padCell, cellMidY, { size: 7.5 });
      drawTextRight('—', colX.di + colWidths.di - padCell, cellMidY, { size: 7.5, color: MUTED });
      drawTextRight(shipAmt.toFixed(2), colX.tx + colWidths.tx - padCell, cellMidY, { size: 7.5 });
      drawTextRight('0.00', colX.ig + colWidths.ig - padCell, cellMidY, { size: 7.5, color: MUTED });
      drawTextRight('0.00', colX.ce + colWidths.ce - padCell, cellMidY, { size: 7.5, color: MUTED });
      drawTextRight(shipAmt.toFixed(2), colX.to + colWidths.to - padCell, cellMidY, {
        size: 8,
        font: fontBold,
      });
      runningTaxable += shipAmt;
      y -= rowH;
    }

    y -= 12;

    // ── Totals summary box (right-aligned amounts, like a real invoice)
    const totalsW = 220;
    const totalsX = PAGE_W - M - totalsW;
    const totalsRows: { label: string; value: string; bold?: boolean; muted?: boolean }[] = [
      { label: `Total quantity (${totalQty} items)`, value: totalQty.toFixed(0), muted: true },
      { label: 'Taxable value', value: runningTaxable.toFixed(2) },
      { label: 'IGST', value: runningIgst.toFixed(2) },
      { label: 'Discount', value: toNum(order.discount).toFixed(2) },
      { label: 'Round off', value: '0.00', muted: true },
    ];

    const totalsRowH = 14;
    let totY = y;
    for (const row of totalsRows) {
      drawText(row.label, totalsX, totY, { size: 7, color: row.muted ? MUTED : BLACK });
      drawTextRight(`Rs. ${row.value}`, PAGE_W - M, totY, {
        size: 7,
        color: row.muted ? MUTED : BLACK,
        font: row.bold ? fontBold : font,
      });
      totY -= totalsRowH;
    }

    // Grand total bar
    const grandTotal = toNum(order.total).toFixed(2);
    const grandH = 22;
    drawFilledRect(totalsX, totY - grandH + 4, totalsW, grandH, ACCENT);
    drawText('GRAND TOTAL', totalsX + 8, totY - grandH + 11, {
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    drawTextRight(`Rs. ${grandTotal}`, PAGE_W - M - 8, totY - grandH + 11, {
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    drawText('All values are in Indian Rupees (INR)', M, totY - 6, { size: 6, color: MUTED });

    y = totY - grandH - 8;

    // ── Footer: legal note + signature block ──────────────────────────
    drawText('E. & O.E.', M, y, { size: 7, color: MUTED });
    drawText(
      'This is a system-generated invoice and does not require a physical seal.',
      M,
      y - 9,
      { size: 6, color: MUTED },
    );
    const ob = `Ordered through ${settings.companyName}`;
    drawText(ob, (PAGE_W - font.widthOfTextAtSize(ob, 8)) / 2, y, {
      size: 8,
      color: ACCENT,
      font: fontBold,
    });

    // Authorised signature (seller) — anchored to the bottom-right corner
    if (settings.showSellerSignature) {
      const sigBoxW = 130;
      const sigBoxH = 50;
      const sigBoxX = PAGE_W - M - sigBoxW;
      const sigBoxY = M + 6;
      page.drawRectangle({
        x: sigBoxX,
        y: sigBoxY,
        width: sigBoxW,
        height: sigBoxH,
        borderColor: BORDER,
        borderWidth: 0.5,
      });
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
            const sw = 80;
            const sh = 26;
            page.drawImage(sigImg, {
              x: sigBoxX + (sigBoxW - sw) / 2,
              y: sigBoxY + 16,
              width: sw,
              height: sh,
            });
          }
        } catch {
          /* */
        }
      }
      drawText('Authorised Signatory', sigBoxX + 4, sigBoxY + 10, { size: 6, color: MUTED });
      const storeUpper = seller.storeName.toUpperCase();
      const storeW = fontBold.widthOfTextAtSize(storeUpper, 7);
      drawText(
        storeUpper.length > 22 ? storeUpper.slice(0, 22) + '…' : storeUpper,
        sigBoxX + (sigBoxW - Math.min(storeW, sigBoxW - 8)) / 2,
        sigBoxY + 2,
        { size: 7, font: fontBold },
      );
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

  /**
   * Pick the human-readable carrier label that appears at the top of
   * the shipping slip. We prefer the actual carrier the order is moving
   * with so the rider sees "Delhivery" / "XpressBees" / "Ekart" etc.
   *
   * Inputs we may see in `Shipment.courierProvider`:
   *   - "Xelnova Courier · Delhivery Express"  (Xelnova-managed)
   *   - "Delhivery"                            (direct provider)
   *   - "XpressBees", "Ekart", "ShipRocket"    (direct provider)
   *   - "Self Ship"                            (manual)
   *   - null / "" / "Xelgo" (legacy)           → fall back to settings
   */
  private resolveLogisticsLabel(
    shipmentCourierProvider: string | null,
    fallbackName: string,
  ): string {
    const raw = (shipmentCourierProvider ?? '').trim();
    if (!raw || /^xelgo$/i.test(raw)) {
      return fallbackName || 'Xelnova';
    }

    // "Xelnova Courier · Delhivery Express" → "Delhivery Express"
    if (raw.toLowerCase().startsWith('xelnova courier')) {
      const parts = raw.split(/[·|]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) return parts[parts.length - 1];
      return raw;
    }

    return raw;
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
      logisticsName: 'Xelgo',
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
