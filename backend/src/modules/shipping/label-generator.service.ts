import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as bwipjs from 'bwip-js';

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
}

const A5_WIDTH = 420; // ~148mm
const A5_HEIGHT = 595; // ~210mm
const MARGIN = 28;
const LINE_HEIGHT = 14;
const SECTION_GAP = 10;

@Injectable()
export class LabelGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generateShippingLabel(orderId: string, sellerId: string): Promise<Buffer> {
    const seller = await this.prisma.sellerProfile.findFirst({
      where: { userId: sellerId },
      select: {
        id: true,
        storeName: true,
        location: true,
        gstNumber: true,
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
        items: { include: { product: { select: { name: true, images: true } } } },
        shippingAddress: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const hasSellerProducts = order.items.some((item) => sellerProductIds.includes(item.productId));
    if (!hasSellerProducts) throw new ForbiddenException('Order has none of your products');

    const sellerItems = order.items.filter((item) => sellerProductIds.includes(item.productId));

    const settings = await this.loadLabelConfig();

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([A5_WIDTH, A5_HEIGHT]);
    const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = A5_HEIGHT - MARGIN;
    const left = MARGIN;
    const right = A5_WIDTH - MARGIN;
    const contentWidth = right - left;

    const drawLine = (yPos: number) => {
      page.drawLine({
        start: { x: left, y: yPos },
        end: { x: right, y: yPos },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    };

    const drawText = (
      text: string,
      x: number,
      yPos: number,
      opts: { size?: number; font?: typeof helvetica; color?: ReturnType<typeof rgb>; maxWidth?: number } = {},
    ) => {
      const font = opts.font ?? helvetica;
      const size = opts.size ?? 9;
      const color = opts.color ?? rgb(0, 0, 0);
      let displayText = text;

      if (opts.maxWidth) {
        while (font.widthOfTextAtSize(displayText, size) > opts.maxWidth && displayText.length > 3) {
          displayText = displayText.slice(0, -4) + '...';
        }
      }

      page.drawText(displayText, { x, y: yPos, size, font, color });
    };

    // ─── Company Header ───
    if (settings.companyLogo) {
      try {
        const logoRes = await fetch(settings.companyLogo);
        const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
        const isJpg =
          settings.companyLogo.includes('.jpg') ||
          settings.companyLogo.includes('.jpeg') ||
          settings.companyLogo.includes('f_jpg');
        const logoImage = isJpg
          ? await pdf.embedJpg(logoBytes)
          : await pdf.embedPng(logoBytes);
        const logoDims = logoImage.scale(Math.min(40 / logoImage.height, 100 / logoImage.width));
        page.drawImage(logoImage, { x: left, y: y - logoDims.height, width: logoDims.width, height: logoDims.height });
        drawText(settings.companyName, left + logoDims.width + 8, y - 12, { size: 14, font: helveticaBold });
        if (settings.companyAddress) {
          drawText(settings.companyAddress, left + logoDims.width + 8, y - 26, { size: 7, maxWidth: contentWidth - logoDims.width - 16 });
        }
        const metaParts: string[] = [];
        if (settings.companyPhone) metaParts.push(`Ph: ${settings.companyPhone}`);
        if (settings.companyGstin) metaParts.push(`GSTIN: ${settings.companyGstin}`);
        if (metaParts.length) {
          drawText(metaParts.join(' | '), left + logoDims.width + 8, y - 36, { size: 7, color: rgb(0.3, 0.3, 0.3) });
        }
        y -= Math.max(logoDims.height, 40) + 4;
      } catch {
        drawText(settings.companyName, left, y - 12, { size: 14, font: helveticaBold });
        y -= 18;
      }
    } else {
      drawText(settings.companyName, left, y - 12, { size: 14, font: helveticaBold });
      if (settings.companyAddress) {
        drawText(settings.companyAddress, left, y - 24, { size: 7, maxWidth: contentWidth });
      }
      const metaParts: string[] = [];
      if (settings.companyPhone) metaParts.push(`Ph: ${settings.companyPhone}`);
      if (settings.companyGstin) metaParts.push(`GSTIN: ${settings.companyGstin}`);
      if (metaParts.length) {
        drawText(metaParts.join(' | '), left, y - 34, { size: 7, color: rgb(0.3, 0.3, 0.3) });
      }
      y -= 40;
    }

    if (settings.tagline) {
      drawText(`"${settings.tagline}"`, left, y, { size: 7, color: rgb(0.4, 0.4, 0.4) });
      y -= LINE_HEIGHT;
    }

    drawLine(y);
    y -= SECTION_GAP;

    // ─── Ship To + Order Info ───
    drawText('SHIP TO:', left, y, { size: 10, font: helveticaBold });
    drawText(`ORDER #${order.orderNumber}`, right - helveticaBold.widthOfTextAtSize(`ORDER #${order.orderNumber}`, 9), y, { size: 9, font: helveticaBold });
    y -= LINE_HEIGHT + 2;

    const addr = order.shippingAddress;
    if (addr) {
      drawText(addr.fullName, left, y, { size: 10, font: helveticaBold });
      y -= LINE_HEIGHT;
      drawText(addr.addressLine1, left, y, { size: 9 });
      y -= LINE_HEIGHT;
      if (addr.addressLine2) {
        drawText(addr.addressLine2, left, y, { size: 9 });
        y -= LINE_HEIGHT;
      }
      drawText(`${addr.city}, ${addr.state} - ${addr.pincode}`, left, y, { size: 9, font: helveticaBold });
      y -= LINE_HEIGHT;
      drawText(`Phone: ${addr.phone}`, left, y, { size: 9 });
    } else {
      const userName = order.user?.name || 'Customer';
      drawText(userName, left, y, { size: 10, font: helveticaBold });
      y -= LINE_HEIGHT;
      drawText('Address not available', left, y, { size: 9, color: rgb(0.5, 0.5, 0.5) });
    }

    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const rightCol = right - 130;
    let rightY = y + (addr ? LINE_HEIGHT * 3 : LINE_HEIGHT);
    drawText(`Date: ${orderDate}`, rightCol, rightY, { size: 8 });
    rightY -= LINE_HEIGHT;
    drawText(`Payment: ${order.paymentMethod || 'N/A'}`, rightCol, rightY, { size: 8 });

    y -= LINE_HEIGHT + SECTION_GAP;
    drawLine(y);
    y -= SECTION_GAP;

    // ─── Items Table ───
    drawText('ITEMS', left, y, { size: 10, font: helveticaBold });
    y -= LINE_HEIGHT + 2;

    for (let i = 0; i < sellerItems.length; i++) {
      const item = sellerItems[i];
      const variantStr = item.variant ? ` (${item.variant})` : '';
      const itemText = `${i + 1}. ${item.productName}${variantStr} x${item.quantity}`;
      const priceText = `Rs.${(item.price * item.quantity).toFixed(2)}`;
      drawText(itemText, left + 4, y, { size: 8, maxWidth: contentWidth - 70 });
      drawText(priceText, right - helvetica.widthOfTextAtSize(priceText, 8), y, { size: 8 });
      y -= LINE_HEIGHT;

      if (y < MARGIN + 120) break; // leave space for footer sections
    }

    y -= 2;
    page.drawLine({
      start: { x: left, y: y + 4 },
      end: { x: right, y: y + 4 },
      thickness: 0.3,
      color: rgb(0.8, 0.8, 0.8),
    });

    const sellerSubtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const summaryText = `Subtotal: Rs.${sellerSubtotal.toFixed(2)}  |  Order Total: Rs.${order.total.toFixed(2)}`;
    drawText(summaryText, left + 4, y - 4, { size: 8, font: helveticaBold });
    y -= LINE_HEIGHT + SECTION_GAP;

    drawLine(y);
    y -= SECTION_GAP;

    // ─── Seller + Signature ───
    const colMid = left + contentWidth / 2;
    drawText('FROM (Seller):', left, y, { size: 9, font: helveticaBold });
    y -= LINE_HEIGHT;
    drawText(seller.storeName, left, y, { size: 9 });
    y -= LINE_HEIGHT;
    const sellerMeta: string[] = [];
    if (seller.location) sellerMeta.push(seller.location);
    if (seller.gstNumber) sellerMeta.push(`GST: ${seller.gstNumber}`);
    if (sellerMeta.length) {
      drawText(sellerMeta.join(' | '), left, y, { size: 7, color: rgb(0.3, 0.3, 0.3) });
    }

    if (settings.showSellerSignature) {
      const sigY = y + LINE_HEIGHT * 2;
      drawText('SIGNATURE:', colMid + 8, sigY, { size: 9, font: helveticaBold });

      // Seller signature is mandatory during onboarding, so it should always exist
      const signatureSource = seller.signatureUrl || seller.signatureData;

      if (signatureSource) {
        try {
          let signatureBytes: Uint8Array;

          if (seller.signatureData && seller.signatureData.startsWith('data:')) {
            const base64Data = seller.signatureData.split(',')[1];
            signatureBytes = Uint8Array.from(Buffer.from(base64Data, 'base64'));
          } else if (seller.signatureUrl) {
            const sigRes = await fetch(seller.signatureUrl);
            signatureBytes = new Uint8Array(await sigRes.arrayBuffer());
          }

          if (signatureBytes!) {
            const isPng =
              signatureSource.includes('.png') ||
              signatureSource.includes('image/png') ||
              signatureSource.includes('f_png');
            const signatureImage = isPng
              ? await pdf.embedPng(signatureBytes)
              : await pdf.embedJpg(signatureBytes);

            const maxSigWidth = right - colMid - 16;
            const maxSigHeight = LINE_HEIGHT * 2.2;
            const sigScale = Math.min(maxSigWidth / signatureImage.width, maxSigHeight / signatureImage.height, 1);
            const sigDims = { width: signatureImage.width * sigScale, height: signatureImage.height * sigScale };

            page.drawImage(signatureImage, {
              x: colMid + 8,
              y: sigY - LINE_HEIGHT - sigDims.height + 4,
              width: sigDims.width,
              height: sigDims.height,
            });
          }
        } catch (err) {
          // Signature failed to load - log but don't break the label
          console.warn(`Failed to embed seller signature for seller ${seller.id}:`, err);
        }
      }

      drawText('Authorised Signatory', colMid + 8, sigY - LINE_HEIGHT * 3.2, { size: 6, color: rgb(0.5, 0.5, 0.5) });
    }

    y -= LINE_HEIGHT + SECTION_GAP;
    drawLine(y);
    y -= SECTION_GAP;

    // ─── Barcode + Footer ───
    if (settings.showBarcode) {
      try {
        const barcodePng = await bwipjs.toBuffer({
          bcid: 'code128',
          text: order.orderNumber,
          scale: 2,
          height: 12,
          includetext: true,
          textsize: 8,
        });
        const barcodeImage = await pdf.embedPng(barcodePng);
        const bcDims = barcodeImage.scale(Math.min(160 / barcodeImage.width, 1));
        page.drawImage(barcodeImage, { x: left, y: y - bcDims.height, width: bcDims.width, height: bcDims.height });

        if (settings.footerText) {
          drawText(settings.footerText, left + bcDims.width + 12, y - 8, {
            size: 7,
            color: rgb(0.4, 0.4, 0.4),
            maxWidth: contentWidth - bcDims.width - 20,
          });
        }
      } catch {
        drawText(order.orderNumber, left, y - 10, { size: 9, font: helveticaBold });
        if (settings.footerText) {
          drawText(settings.footerText, left + 130, y - 10, { size: 7, color: rgb(0.4, 0.4, 0.4) });
        }
      }
    } else if (settings.footerText) {
      drawText(settings.footerText, left, y - 8, { size: 7, color: rgb(0.4, 0.4, 0.4), maxWidth: contentWidth });
    }

    const pdfBytes = await pdf.save();
    return Buffer.from(pdfBytes);
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
    };
  }
}
