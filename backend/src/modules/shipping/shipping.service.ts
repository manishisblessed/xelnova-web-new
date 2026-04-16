import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import {
  ShippingMode,
  ShipmentStatus,
  OrderStatus,
  SellerCourierConfig,
} from '@prisma/client';
import { CourierProvider, ShipmentDetails } from './providers/courier-provider.interface';
import { DelhiveryProvider } from './providers/delhivery.provider';
import { ShipRocketProvider } from './providers/shiprocket.provider';
import { XpressBeesProvider } from './providers/xpressbees.provider';
import { EkartProvider } from './providers/ekart.provider';
import { XelnovaCourierProvider } from './providers/xelnova-courier.provider';
import {
  DEFAULT_PLATFORM_LOGISTICS,
  PlatformLogisticsSettings,
} from '../../common/platform-logistics';
import * as crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly providers: Map<ShippingMode, CourierProvider>;
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
    delhivery: DelhiveryProvider,
    shiprocket: ShipRocketProvider,
    xpressbees: XpressBeesProvider,
    ekart: EkartProvider,
    private readonly xelnovaCourier: XelnovaCourierProvider,
  ) {
    this.providers = new Map<ShippingMode, CourierProvider>([
      [ShippingMode.DELHIVERY, delhivery],
      [ShippingMode.SHIPROCKET, shiprocket],
      [ShippingMode.XPRESSBEES, xpressbees],
      [ShippingMode.EKART, ekart],
      [ShippingMode.XELNOVA_COURIER, this.xelnovaCourier],
    ]);

    const secret = this.config.get<string>('ENCRYPTION_SECRET') || 'xelnova-default-encryption-key-32b';
    this.encryptionKey = crypto.scryptSync(secret, 'salt', 32);
  }

  // ─── Encryption helpers ───

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(text: string): string {
    const [ivHex, encrypted] = text.split(':');
    if (!ivHex || !encrypted) return text;
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return text;
    }
  }

  // ─── Platform logistics (Xelnova → Delhivery default) ───

  private async getMergedPlatformLogistics(): Promise<PlatformLogisticsSettings> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const payload =
      row?.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : {};
    const pl = payload.platformLogistics;
    const p = pl && typeof pl === 'object' ? (pl as Partial<PlatformLogisticsSettings>) : {};
    return {
      ...DEFAULT_PLATFORM_LOGISTICS,
      ...p,
      delhivery: {
        ...DEFAULT_PLATFORM_LOGISTICS.delhivery,
        ...p.delhivery,
      },
    };
  }

  private async resolveDelhiveryForXelnova(): Promise<
    { mode: 'delhivery'; config: SellerCourierConfig } | { mode: 'stub' }
  > {
    const pl = await this.getMergedPlatformLogistics();
    const backend = pl.xelnovaBackend || 'delhivery';

    const envToken =
      this.config.get<string>('DELHIVERY_API_TOKEN')?.trim() ||
      this.config.get<string>('DELHIVERY_TOKEN')?.trim() ||
      '';
    const envClient = this.config.get<string>('DELHIVERY_CLIENT_NAME')?.trim() || '';
    const envWh = this.config.get<string>('DELHIVERY_WAREHOUSE_NAME')?.trim() || '';

    let apiKey = envToken;
    const dbTok = pl.delhivery?.apiTokenEnc;
    if (dbTok?.trim()) {
      try {
        apiKey = this.decrypt(dbTok);
      } catch {
        apiKey = dbTok;
      }
    }

    const clientName = pl.delhivery?.clientName?.trim() || envClient;
    const warehouseName = pl.delhivery?.warehouseName?.trim() || envWh;

    const envDelhiveryEnv = this.config.get<string>('DELHIVERY_ENV')?.trim().toLowerCase();
    const delhiveryEnvironment =
      pl.delhivery?.environment === 'staging' || pl.delhivery?.environment === 'production'
        ? pl.delhivery.environment
        : envDelhiveryEnv === 'staging'
          ? 'staging'
          : 'production';

    const sellerGstin =
      pl.delhivery?.sellerGstin?.trim() ||
      this.config.get<string>('DELHIVERY_SELLER_GSTIN')?.trim() ||
      '';
    const shippingModeRaw =
      pl.delhivery?.shippingMode?.trim() ||
      this.config.get<string>('DELHIVERY_SHIPPING_MODE')?.trim() ||
      'Surface';
    const delhiveryShippingMode =
      shippingModeRaw.toLowerCase() === 'express' ? 'Express' : 'Surface';

    if (backend === 'stub') {
      return { mode: 'stub' };
    }
    if (!apiKey || !clientName || !warehouseName) {
      this.logger.warn(
        'Xelnova→Delhivery: incomplete credentials (token, client name, warehouse). Falling back to stub AWB.',
      );
      return { mode: 'stub' };
    }

    const synthetic = {
      id: 'platform-delhivery',
      sellerId: 'platform',
      provider: ShippingMode.DELHIVERY,
      apiKey,
      apiSecret: null,
      accountId: clientName,
      warehouseId: warehouseName,
      isActive: true,
      metadata: {
        delhiveryEnvironment,
        sellerGstin,
        delhiveryShippingMode,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as SellerCourierConfig;

    return { mode: 'delhivery', config: synthetic };
  }

  sanitizePlatformLogisticsForResponse(
    raw: PlatformLogisticsSettings | undefined,
  ): PlatformLogisticsSettings & {
    delhivery?: PlatformLogisticsSettings['delhivery'] & { apiTokenHint?: string };
  } {
    const pl = {
      ...DEFAULT_PLATFORM_LOGISTICS,
      ...raw,
      delhivery: { ...DEFAULT_PLATFORM_LOGISTICS.delhivery, ...raw?.delhivery },
    };
    const envToken = this.config.get('DELHIVERY_API_TOKEN')?.trim();
    const parts: string[] = [];
    if (envToken) parts.push('Server env has DELHIVERY_API_TOKEN');
    const enc = pl.delhivery?.apiTokenEnc;
    if (enc) {
      try {
        const d = this.decrypt(enc);
        if (d && d.length > 4) parts.push(`Saved API token ends with ${d.slice(-4)}`);
        else parts.push('Saved API token in database');
      } catch {
        parts.push('Saved API token in database');
      }
    }
    if (parts.length === 0) parts.push('No token yet — paste Live API Token below or set DELHIVERY_API_TOKEN on the server');

    const { apiTokenEnc: _omit, ...delWithoutSecret } = pl.delhivery || {};
    return {
      ...pl,
      delhivery: {
        ...delWithoutSecret,
        environment: pl.delhivery?.environment ?? 'production',
        sellerGstin: pl.delhivery?.sellerGstin ?? '',
        shippingMode: pl.delhivery?.shippingMode ?? 'Surface',
        apiTokenHint: parts.join(' · '),
      },
    };
  }

  preparePlatformLogisticsSave(
    current: PlatformLogisticsSettings | undefined,
    incoming: Partial<PlatformLogisticsSettings> & {
      delhivery?: Partial<NonNullable<PlatformLogisticsSettings['delhivery']>> & { apiToken?: string };
    },
  ): PlatformLogisticsSettings {
    const cur = {
      ...DEFAULT_PLATFORM_LOGISTICS,
      ...current,
      delhivery: { ...DEFAULT_PLATFORM_LOGISTICS.delhivery, ...current?.delhivery },
    };
    const incDel = incoming.delhivery || {};
    const plainTok = (incDel as { apiToken?: string }).apiToken;
    const { apiToken: _dropTok, ...incDelSafe } = incDel as { apiToken?: string };

    const next: PlatformLogisticsSettings = {
      ...cur,
      ...incoming,
      delhivery: {
        ...cur.delhivery,
        ...incDelSafe,
      },
    };

    if (plainTok !== undefined && String(plainTok).trim()) {
      next.delhivery!.apiTokenEnc = this.encrypt(String(plainTok).trim());
    }
    return next;
  }

  // ─── Seller profile helper ───

  private async getSellerProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');
    return profile;
  }

  private async ensureOrderBelongsToSeller(orderId: string, sellerId: string) {
    const productIds = (
      await this.prisma.product.findMany({
        where: { sellerId },
        select: { id: true },
      })
    ).map((p) => p.id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shippingAddress: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const hasSellerItems = order.items.some((item) =>
      productIds.includes(item.productId),
    );
    if (!hasSellerItems) {
      throw new ForbiddenException('This order does not contain your products');
    }

    return order;
  }

  // ─── Ship Order ───

  async shipOrder(
    userId: string,
    orderId: string,
    dto: {
      shippingMode: ShippingMode;
      carrierName?: string;
      awbNumber?: string;
      weight?: number;
      dimensions?: string;
    },
  ) {
    const seller = await this.getSellerProfile(userId);
    const order = await this.ensureOrderBelongsToSeller(orderId, seller.id);

    // Check if shipment already exists
    const existing = await this.prisma.shipment.findUnique({
      where: { orderId },
    });
    if (existing) {
      throw new BadRequestException('Shipment already exists for this order');
    }

    // Validate order status
    if (!['CONFIRMED', 'PROCESSING'].includes(order.status)) {
      throw new BadRequestException(
        `Order must be in CONFIRMED or PROCESSING status to ship. Current: ${order.status}`,
      );
    }

    const { shippingMode } = dto;

    if (shippingMode === ShippingMode.SELF_SHIP) {
      return this.createSelfShipment(order, seller, dto);
    }

    // For courier-based shipping
    return this.createCourierShipment(order, seller, shippingMode, dto);
  }

  private async createSelfShipment(
    order: any,
    seller: any,
    dto: { carrierName?: string; awbNumber?: string },
  ) {
    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        sellerId: seller.id,
        shippingMode: ShippingMode.SELF_SHIP,
        courierProvider: dto.carrierName || 'Self Ship',
        awbNumber: dto.awbNumber || null,
        shipmentStatus: dto.awbNumber
          ? ShipmentStatus.BOOKED
          : ShipmentStatus.PENDING,
        statusHistory: dto.awbNumber
          ? [
              {
                status: 'BOOKED',
                timestamp: new Date().toISOString(),
                remark: 'Shipment booked by seller (self-ship)',
              },
            ]
          : [],
      },
    });

    // Update order status to SHIPPED if AWB provided
    if (dto.awbNumber) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.SHIPPED },
      });

      // Send shipped notification to customer
      this.notificationService
        .notifyOrderShipped(
          order.userId,
          order.orderNumber,
          dto.carrierName || 'Seller Courier',
          `https://xelnova.in/track/${order.orderNumber}`,
        )
        .catch((err) =>
          this.logger.warn(`Failed to send shipped notification for ${order.orderNumber}: ${err.message}`),
        );
    }

    return shipment;
  }

  private async createCourierShipment(
    order: any,
    seller: any,
    shippingMode: ShippingMode,
    dto: { weight?: number; dimensions?: string },
  ) {
    let provider = this.providers.get(shippingMode);
    if (!provider) {
      throw new BadRequestException(`Unsupported shipping mode: ${shippingMode}`);
    }

    let courierConfig: SellerCourierConfig | null = null;
    let usedDelhiveryForXelnova = false;

    if (shippingMode === ShippingMode.XELNOVA_COURIER) {
      const resolved = await this.resolveDelhiveryForXelnova();
      if (resolved.mode === 'delhivery') {
        provider = this.providers.get(ShippingMode.DELHIVERY)!;
        courierConfig = resolved.config;
        usedDelhiveryForXelnova = true;
      } else {
        provider = this.xelnovaCourier;
        courierConfig = null;
      }
    } else {
      courierConfig = await this.prisma.sellerCourierConfig.findUnique({
        where: { sellerId_provider: { sellerId: seller.id, provider: shippingMode } },
      });
      if (!courierConfig) {
        throw new BadRequestException(
          `No ${shippingMode} API configuration found. Please add your API keys in Shipping Settings.`,
        );
      }
      courierConfig = {
        ...courierConfig,
        apiKey: this.decrypt(courierConfig.apiKey),
        apiSecret: courierConfig.apiSecret
          ? this.decrypt(courierConfig.apiSecret)
          : null,
      };
    }

    // Build shipment details
    const addr = order.shippingAddress;
    if (!addr) {
      throw new BadRequestException('Order has no shipping address');
    }

    const shipmentDetails: ShipmentDetails = {
      weight: dto.weight,
      dimensions: dto.dimensions,
      pickupPincode: seller.businessPincode || '',
      deliveryPincode: addr.pincode,
      deliveryAddress: {
        fullName: addr.fullName,
        phone: addr.phone,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 || undefined,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
      },
      sellerAddress: {
        address: seller.businessAddress || '',
        city: seller.businessCity || '',
        state: seller.businessState || '',
        pincode: seller.businessPincode || '',
        phone: seller.phone || '',
        name: seller.storeName,
      },
      orderNumber: order.orderNumber,
      orderId: order.id,
      items: order.items.map((item: any) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: order.total,
      paymentMethod: order.paymentMethod || undefined,
      isCod:
        order.paymentMethod?.toLowerCase() === 'cod' ||
        order.paymentMethod?.toLowerCase() === 'cash_on_delivery',
    };

    const result = await provider.createShipment(
      courierConfig as SellerCourierConfig,
      shipmentDetails,
    );

    let pickupAt = result.pickupScheduledAt;
    let carrierLine = result.displayCourierLine || provider.providerName;
    if (usedDelhiveryForXelnova) {
      carrierLine = 'Xelnova · Delhivery';
      pickupAt = pickupAt ?? this.xelnovaCourier.getNextPickupDate();
    }
    const bookedAtIso = new Date().toISOString();
    let bookRemark = `Shipment booked via ${carrierLine}`;
    if (pickupAt) {
      bookRemark += `. Pickup scheduled: ${pickupAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`;
    }

    // Create shipment record
    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        sellerId: seller.id,
        shippingMode,
        courierProvider: carrierLine,
        awbNumber: result.awbNumber,
        trackingUrl: result.trackingUrl,
        shipmentStatus: ShipmentStatus.BOOKED,
        courierOrderId: result.courierOrderId,
        labelUrl: result.labelUrl,
        pickupDate: pickupAt ?? null,
        weight: dto.weight,
        dimensions: dto.dimensions,
        courierCharges: result.charges,
        statusHistory: [
          {
            status: 'BOOKED',
            timestamp: bookedAtIso,
            remark: bookRemark,
          },
        ],
      },
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.SHIPPED },
    });

    // Send shipped notification to customer
    this.notificationService
      .notifyOrderShipped(
        order.userId,
        order.orderNumber,
        carrierLine,
        result.trackingUrl || `https://xelnova.in/track/${order.orderNumber}`,
      )
      .catch((err) =>
        this.logger.warn(`Failed to send shipped notification for ${order.orderNumber}: ${err.message}`),
      );

    return shipment;
  }

  // ─── Manual AWB Update (Self-Ship) ───

  async updateAwb(
    userId: string,
    orderId: string,
    dto: { awbNumber: string; carrierName?: string; trackingUrl?: string },
  ) {
    const seller = await this.getSellerProfile(userId);
    await this.ensureOrderBelongsToSeller(orderId, seller.id);

    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.shippingMode !== ShippingMode.SELF_SHIP) {
      throw new BadRequestException('AWB can only be manually updated for self-ship orders');
    }

    const history = (shipment.statusHistory as any[]) || [];
    history.push({
      status: 'AWB_UPDATED',
      timestamp: new Date().toISOString(),
      remark: `AWB updated to ${dto.awbNumber}`,
    });

    const updated = await this.prisma.shipment.update({
      where: { orderId },
      data: {
        awbNumber: dto.awbNumber,
        courierProvider: dto.carrierName || shipment.courierProvider,
        trackingUrl: dto.trackingUrl || shipment.trackingUrl,
        shipmentStatus:
          shipment.shipmentStatus === ShipmentStatus.PENDING
            ? ShipmentStatus.BOOKED
            : shipment.shipmentStatus,
        statusHistory: history,
      },
    });

    // If order wasn't shipped yet, mark it
    if (shipment.shipmentStatus === ShipmentStatus.PENDING) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.SHIPPED },
      });
    }

    return updated;
  }

  // ─── Manual Status Update (Self-Ship) ───

  async updateShipmentStatus(
    userId: string,
    orderId: string,
    dto: { status: ShipmentStatus; location?: string; remark?: string },
  ) {
    const seller = await this.getSellerProfile(userId);
    await this.ensureOrderBelongsToSeller(orderId, seller.id);

    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (shipment.shippingMode !== ShippingMode.SELF_SHIP) {
      throw new BadRequestException(
        'Status can only be manually updated for self-ship orders',
      );
    }

    const history = (shipment.statusHistory as any[]) || [];
    history.push({
      status: dto.status,
      timestamp: new Date().toISOString(),
      location: dto.location,
      remark: dto.remark || `Status updated to ${dto.status}`,
    });

    const updated = await this.prisma.shipment.update({
      where: { orderId },
      data: {
        shipmentStatus: dto.status,
        deliveredAt:
          dto.status === ShipmentStatus.DELIVERED ? new Date() : undefined,
        statusHistory: history,
      },
    });

    // Sync order status
    await this.syncOrderStatus(orderId, dto.status);

    return updated;
  }

  // ─── Get Shipment ───

  async getShipment(userId: string, orderId: string) {
    const seller = await this.getSellerProfile(userId);
    await this.ensureOrderBelongsToSeller(orderId, seller.id);

    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
    });
    if (!shipment) throw new NotFoundException('Shipment not found for this order');

    return shipment;
  }

  // ─── Live Track ───

  async liveTrack(userId: string, orderId: string) {
    const seller = await this.getSellerProfile(userId);
    await this.ensureOrderBelongsToSeller(orderId, seller.id);

    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (!shipment.awbNumber) {
      throw new BadRequestException('No AWB number assigned yet');
    }

    if (shipment.shippingMode === ShippingMode.SELF_SHIP) {
      return {
        status: shipment.shipmentStatus,
        statusHistory: shipment.statusHistory,
      };
    }

    if (shipment.shippingMode === ShippingMode.XELNOVA_COURIER) {
      const resolved = await this.resolveDelhiveryForXelnova();
      if (resolved.mode === 'delhivery' && resolved.config) {
        const del = this.providers.get(ShippingMode.DELHIVERY)!;
        const tracking = await del.trackShipment(shipment.awbNumber, resolved.config);
        if (tracking.status && tracking.status !== 'UNKNOWN') {
          const mappedStatus = tracking.status as ShipmentStatus;
          if (Object.values(ShipmentStatus).includes(mappedStatus) && mappedStatus !== shipment.shipmentStatus) {
            await this.prisma.shipment.update({
              where: { orderId },
              data: {
                shipmentStatus: mappedStatus,
                statusHistory: tracking.statusHistory as object[],
                deliveredAt:
                  mappedStatus === ShipmentStatus.DELIVERED ? new Date() : undefined,
              },
            });
            await this.syncOrderStatus(orderId, mappedStatus);
          }
        }
        return tracking;
      }
      return {
        status: shipment.shipmentStatus,
        statusHistory: shipment.statusHistory,
      };
    }

    const provider = this.providers.get(shipment.shippingMode);
    if (!provider) {
      throw new BadRequestException('Provider not available');
    }

    let courierConfig = await this.prisma.sellerCourierConfig.findUnique({
      where: {
        sellerId_provider: {
          sellerId: shipment.sellerId,
          provider: shipment.shippingMode,
        },
      },
    });

    if (!courierConfig) {
      throw new BadRequestException('Courier config not found');
    }

    courierConfig = {
      ...courierConfig,
      apiKey: this.decrypt(courierConfig.apiKey),
      apiSecret: courierConfig.apiSecret
        ? this.decrypt(courierConfig.apiSecret)
        : null,
    };

    const tracking = await provider.trackShipment(
      shipment.awbNumber,
      courierConfig,
    );

    // Update local shipment with latest status
    if (tracking.status && tracking.status !== 'UNKNOWN') {
      const mappedStatus = tracking.status as ShipmentStatus;
      if (
        Object.values(ShipmentStatus).includes(mappedStatus) &&
        mappedStatus !== shipment.shipmentStatus
      ) {
        await this.prisma.shipment.update({
          where: { orderId },
          data: {
            shipmentStatus: mappedStatus,
            statusHistory: tracking.statusHistory,
            deliveredAt:
              mappedStatus === ShipmentStatus.DELIVERED ? new Date() : undefined,
          },
        });
        await this.syncOrderStatus(orderId, mappedStatus);
      }
    }

    return tracking;
  }

  // ─── Cancel Shipment ───

  async cancelShipment(userId: string, orderId: string) {
    const seller = await this.getSellerProfile(userId);
    await this.ensureOrderBelongsToSeller(orderId, seller.id);

    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');

    const terminalStatuses: ShipmentStatus[] = [
      ShipmentStatus.DELIVERED,
      ShipmentStatus.RTO_DELIVERED,
      ShipmentStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(shipment.shipmentStatus)) {
      throw new BadRequestException(
        `Cannot cancel shipment in ${shipment.shipmentStatus} status`,
      );
    }

    // For self-ship, just update locally
    if (shipment.shippingMode === ShippingMode.SELF_SHIP) {
      return this.cancelShipmentLocally(shipment);
    }

    if (shipment.shippingMode === ShippingMode.XELNOVA_COURIER) {
      const resolved = await this.resolveDelhiveryForXelnova();
      if (resolved.mode === 'delhivery' && resolved.config && shipment.awbNumber) {
        const del = this.providers.get(ShippingMode.DELHIVERY)!;
        const result = await del.cancelShipment(shipment.awbNumber, resolved.config);
        if (result.success) await this.cancelShipmentLocally(shipment);
        return result;
      }
      const r = await this.xelnovaCourier.cancelShipment(shipment.awbNumber || '', null);
      if (r.success) await this.cancelShipmentLocally(shipment);
      return r;
    }

    const provider = this.providers.get(shipment.shippingMode);
    if (!provider) {
      return this.cancelShipmentLocally(shipment);
    }

    const courierConfig = await this.prisma.sellerCourierConfig.findUnique({
      where: {
        sellerId_provider: {
          sellerId: shipment.sellerId,
          provider: shipment.shippingMode,
        },
      },
    });
    if (!courierConfig) {
      return this.cancelShipmentLocally(shipment);
    }

    const decrypted = {
      ...courierConfig,
      apiKey: this.decrypt(courierConfig.apiKey),
      apiSecret: courierConfig.apiSecret ? this.decrypt(courierConfig.apiSecret) : null,
    };

    const result = await provider.cancelShipment(shipment.awbNumber || '', decrypted);

    if (result.success) {
      await this.cancelShipmentLocally(shipment);
    }

    return result;
  }

  private async cancelShipmentLocally(shipment: any) {
    const history = (shipment.statusHistory as any[]) || [];
    history.push({
      status: 'CANCELLED',
      timestamp: new Date().toISOString(),
      remark: 'Shipment cancelled',
    });

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        shipmentStatus: ShipmentStatus.CANCELLED,
        statusHistory: history,
      },
    });

    await this.prisma.order.update({
      where: { id: shipment.orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    return { success: true, message: 'Shipment cancelled' };
  }

  // ─── Serviceability Check ───

  async checkServiceability(userId: string, orderId: string) {
    const seller = await this.getSellerProfile(userId);
    const order = await this.ensureOrderBelongsToSeller(orderId, seller.id);

    const addr = order.shippingAddress;
    if (!addr) {
      throw new BadRequestException('Order has no shipping address');
    }

    const pickupPincode = seller.businessPincode || '';
    const deliveryPincode = addr.pincode;

    const results: Record<string, any> = {};

    // Check Xelnova Courier (always available)
    results['XELNOVA_COURIER'] = {
      serviceable: true,
      estimatedDays: 5,
      provider: 'Xelnova Courier',
    };

    // Check each configured courier
    const configs = await this.prisma.sellerCourierConfig.findMany({
      where: { sellerId: seller.id, isActive: true },
    });

    for (const cfg of configs) {
      const provider = this.providers.get(cfg.provider);
      if (!provider) continue;

      try {
        const decryptedConfig = {
          ...cfg,
          apiKey: this.decrypt(cfg.apiKey),
          apiSecret: cfg.apiSecret ? this.decrypt(cfg.apiSecret) : null,
        };
        const result = await provider.checkServiceability(
          pickupPincode,
          deliveryPincode,
          decryptedConfig,
        );
        results[cfg.provider] = {
          ...result,
          provider: provider.providerName,
        };
      } catch (err) {
        this.logger.warn(
          `Serviceability check failed for ${cfg.provider}: ${err}`,
        );
        results[cfg.provider] = {
          serviceable: false,
          provider: provider.providerName,
          error: 'Check failed',
        };
      }
    }

    return results;
  }

  // ─── Courier Config CRUD ───

  async getCourierConfigs(userId: string) {
    const seller = await this.getSellerProfile(userId);
    const configs = await this.prisma.sellerCourierConfig.findMany({
      where: { sellerId: seller.id },
    });

    return configs.map((c) => ({
      ...c,
      apiKey: '••••' + this.decrypt(c.apiKey).slice(-4),
      apiSecret: c.apiSecret
        ? '••••' + this.decrypt(c.apiSecret).slice(-4)
        : null,
    }));
  }

  async saveCourierConfig(
    userId: string,
    dto: {
      provider: ShippingMode;
      apiKey: string;
      apiSecret?: string;
      accountId?: string;
      warehouseId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const seller = await this.getSellerProfile(userId);

    const validProviders: ShippingMode[] = [
      ShippingMode.DELHIVERY,
      ShippingMode.SHIPROCKET,
      ShippingMode.XPRESSBEES,
      ShippingMode.EKART,
    ];
    if (!validProviders.includes(dto.provider)) {
      throw new BadRequestException(
        'Invalid provider. Must be DELHIVERY, SHIPROCKET, XPRESSBEES, or EKART',
      );
    }

    const existing = await this.prisma.sellerCourierConfig.findUnique({
      where: {
        sellerId_provider: { sellerId: seller.id, provider: dto.provider },
      },
    });

    const keepExistingKey = dto.apiKey === '__KEEP_EXISTING__' || !dto.apiKey;
    const encryptedKey =
      keepExistingKey && existing
        ? existing.apiKey
        : this.encrypt(dto.apiKey || '');
    const encryptedSecret = dto.apiSecret
      ? this.encrypt(dto.apiSecret)
      : existing?.apiSecret ?? null;

    return this.prisma.sellerCourierConfig.upsert({
      where: {
        sellerId_provider: { sellerId: seller.id, provider: dto.provider },
      },
      create: {
        sellerId: seller.id,
        provider: dto.provider,
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
        accountId: dto.accountId || null,
        warehouseId: dto.warehouseId || null,
        metadata: dto.metadata || {},
      },
      update: {
        ...(keepExistingKey ? {} : { apiKey: encryptedKey }),
        ...(dto.apiSecret ? { apiSecret: encryptedSecret } : {}),
        ...(dto.accountId !== undefined ? { accountId: dto.accountId || null } : {}),
        ...(dto.warehouseId !== undefined
          ? { warehouseId: dto.warehouseId || null }
          : {}),
        metadata: dto.metadata || existing?.metadata || {},
        isActive: true,
      },
    });
  }

  async updateCourierConfig(
    userId: string,
    provider: ShippingMode,
    dto: {
      apiKey?: string;
      apiSecret?: string;
      accountId?: string;
      isActive?: boolean;
      warehouseId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const seller = await this.getSellerProfile(userId);

    const existing = await this.prisma.sellerCourierConfig.findUnique({
      where: {
        sellerId_provider: { sellerId: seller.id, provider },
      },
    });
    if (!existing) throw new NotFoundException('Courier config not found');

    const updateData: any = {};
    if (dto.apiKey) updateData.apiKey = this.encrypt(dto.apiKey);
    if (dto.apiSecret) updateData.apiSecret = this.encrypt(dto.apiSecret);
    if (dto.accountId !== undefined) updateData.accountId = dto.accountId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.warehouseId !== undefined) updateData.warehouseId = dto.warehouseId;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

    return this.prisma.sellerCourierConfig.update({
      where: {
        sellerId_provider: { sellerId: seller.id, provider },
      },
      data: updateData,
    });
  }

  async deleteCourierConfig(userId: string, provider: ShippingMode) {
    const seller = await this.getSellerProfile(userId);

    const existing = await this.prisma.sellerCourierConfig.findUnique({
      where: {
        sellerId_provider: { sellerId: seller.id, provider },
      },
    });
    if (!existing) throw new NotFoundException('Courier config not found');

    await this.prisma.sellerCourierConfig.delete({
      where: {
        sellerId_provider: { sellerId: seller.id, provider },
      },
    });

    return { message: 'Courier config deleted' };
  }

  // ─── Order Status Sync ───

  async syncOrderStatus(orderId: string, shipmentStatus: ShipmentStatus) {
    const statusMap: Partial<Record<ShipmentStatus, OrderStatus>> = {
      [ShipmentStatus.BOOKED]: OrderStatus.SHIPPED,
      [ShipmentStatus.PICKUP_SCHEDULED]: OrderStatus.SHIPPED,
      [ShipmentStatus.PICKED_UP]: OrderStatus.SHIPPED,
      [ShipmentStatus.IN_TRANSIT]: OrderStatus.SHIPPED,
      [ShipmentStatus.OUT_FOR_DELIVERY]: OrderStatus.SHIPPED,
      [ShipmentStatus.DELIVERED]: OrderStatus.DELIVERED,
      [ShipmentStatus.CANCELLED]: OrderStatus.CANCELLED,
      [ShipmentStatus.RTO_INITIATED]: OrderStatus.RETURNED,
      [ShipmentStatus.RTO_DELIVERED]: OrderStatus.RETURNED,
    };

    const orderStatus = statusMap[shipmentStatus];
    if (orderStatus) {
      const order = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: orderStatus },
        include: { shipment: true },
      });

      // Send customer notifications based on shipment status
      this.sendStatusNotification(order, shipmentStatus).catch((err) =>
        this.logger.warn(`Failed to send status notification for order ${orderId}: ${err.message}`),
      );
    }
  }

  private async sendStatusNotification(
    order: { id: string; userId: string; orderNumber: string; shipment?: { courierProvider: string | null; trackingUrl: string | null } | null },
    shipmentStatus: ShipmentStatus,
  ) {
    const courier = order.shipment?.courierProvider || 'Xelnova Courier';
    const trackingUrl = order.shipment?.trackingUrl || `https://xelnova.in/track/${order.orderNumber}`;

    switch (shipmentStatus) {
      case ShipmentStatus.BOOKED:
      case ShipmentStatus.PICKED_UP:
        await this.notificationService.notifyOrderShipped(
          order.userId,
          order.orderNumber,
          courier,
          trackingUrl,
        );
        break;

      case ShipmentStatus.OUT_FOR_DELIVERY:
        await this.notificationService.logNotification({
          userId: order.userId,
          channel: 'in_app',
          type: 'ORDER_OUT_FOR_DELIVERY',
          title: 'Out for Delivery',
          body: `Your order #${order.orderNumber} is out for delivery today!`,
          data: { orderNumber: order.orderNumber },
        });
        break;

      case ShipmentStatus.DELIVERED:
        await this.notificationService.notifyOrderDelivered(order.userId, order.orderNumber);
        break;

      default:
        break;
    }
  }

  // ─── Webhook Processing ───

  async processWebhook(
    provider: ShippingMode,
    payload: any,
  ): Promise<{ processed: boolean; message: string }> {
    try {
      let awbNumber: string | undefined;
      let status: string | undefined;
      let location: string | undefined;
      let remark: string | undefined;
      let timestamp: string | undefined;

      switch (provider) {
        case ShippingMode.DELHIVERY:
          awbNumber = payload.Waybill || payload.waybill;
          status = this.mapWebhookStatus(
            provider,
            payload.Status?.Status || payload.status || '',
          );
          location =
            payload.Status?.StatusLocation || payload.location || '';
          remark =
            payload.Status?.Instructions || payload.remark || '';
          timestamp = payload.StatusDateTime || new Date().toISOString();
          break;

        case ShippingMode.SHIPROCKET:
          awbNumber =
            payload.awb || payload.awb_code || payload.tracking_number || '';
          status = this.mapWebhookStatus(
            provider,
            payload.current_status || payload.status || payload.shipment_status || '',
          );
          location = payload.scans?.[0]?.location || '';
          remark =
            payload.current_status || payload.status || '';
          timestamp =
            payload.current_timestamp || payload.scans?.[0]?.date || new Date().toISOString();
          break;

        case ShippingMode.XPRESSBEES:
          awbNumber = payload.AWBNumber || payload.awb;
          status = this.mapWebhookStatus(
            provider,
            payload.XBStatus || payload.status || '',
          );
          location = payload.Location || '';
          remark = payload.StatusRemark || '';
          timestamp = payload.StatusDate || new Date().toISOString();
          break;

        case ShippingMode.EKART:
          awbNumber = payload.id || payload.tracking_id;
          status = this.mapWebhookStatus(
            provider,
            payload.status || '',
          );
          location = payload.location || '';
          remark = payload.desc || '';
          timestamp = payload.ctime
            ? new Date(payload.ctime).toISOString()
            : new Date().toISOString();
          break;

        default:
          return { processed: false, message: 'Unknown provider' };
      }

      if (!awbNumber) {
        return { processed: false, message: 'No AWB number in payload' };
      }

      const shipment = await this.prisma.shipment.findFirst({
        where: { awbNumber },
      });

      if (!shipment) {
        this.logger.warn(
          `Webhook: No shipment found for AWB ${awbNumber}`,
        );
        return { processed: false, message: 'Shipment not found' };
      }

      if (!status || !Object.values(ShipmentStatus).includes(status as ShipmentStatus)) {
        return { processed: false, message: `Unknown status: ${status}` };
      }

      const history = (shipment.statusHistory as any[]) || [];
      history.push({ status, timestamp, location, remark });

      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          shipmentStatus: status as ShipmentStatus,
          statusHistory: history,
          deliveredAt:
            status === ShipmentStatus.DELIVERED ? new Date() : undefined,
        },
      });

      await this.syncOrderStatus(shipment.orderId, status as ShipmentStatus);

      return { processed: true, message: `Status updated to ${status}` };
    } catch (err) {
      this.logger.error(`Webhook processing error: ${err}`);
      return { processed: false, message: 'Processing error' };
    }
  }

  private mapWebhookStatus(provider: ShippingMode, rawStatus: string): string {
    const normalized = rawStatus.toLowerCase();

    if (normalized.includes('delivered') && !normalized.includes('out for'))
      return ShipmentStatus.DELIVERED;
    if (normalized.includes('out for delivery'))
      return ShipmentStatus.OUT_FOR_DELIVERY;
    if (normalized.includes('in transit') || normalized.includes('intransit'))
      return ShipmentStatus.IN_TRANSIT;
    if (normalized.includes('picked up') || normalized.includes('pickup done'))
      return ShipmentStatus.PICKED_UP;
    if (
      normalized.includes('pickup scheduled') ||
      normalized.includes('pickup generated')
    )
      return ShipmentStatus.PICKUP_SCHEDULED;
    if (
      normalized.includes('manifested') ||
      normalized.includes('booked') ||
      normalized.includes('order placed') ||
      normalized.includes('pickup pending')
    )
      return ShipmentStatus.BOOKED;
    if (normalized.includes('rto delivered'))
      return ShipmentStatus.RTO_DELIVERED;
    if (normalized.includes('rto initiated') || normalized.includes('rto requested') || normalized.includes('rto in transit'))
      return ShipmentStatus.RTO_INITIATED;
    if (normalized.includes('cancel') || normalized.includes('lost') || normalized.includes('damaged'))
      return ShipmentStatus.CANCELLED;

    // Provider-specific numeric codes (ShipRocket status IDs)
    if (provider === ShippingMode.SHIPROCKET) {
      const codeMap: Record<string, string> = {
        '1': ShipmentStatus.BOOKED,
        '2': ShipmentStatus.PICKED_UP,
        '3': ShipmentStatus.IN_TRANSIT,
        '4': ShipmentStatus.IN_TRANSIT,
        '5': ShipmentStatus.OUT_FOR_DELIVERY,
        '6': ShipmentStatus.DELIVERED,
        '7': ShipmentStatus.CANCELLED,
        '8': ShipmentStatus.RTO_INITIATED,
        '9': ShipmentStatus.PICKED_UP,
        '10': ShipmentStatus.RTO_DELIVERED,
        '17': ShipmentStatus.OUT_FOR_DELIVERY,
        '18': ShipmentStatus.IN_TRANSIT,
        '19': ShipmentStatus.OUT_FOR_DELIVERY,
        '20': ShipmentStatus.IN_TRANSIT,
      };
      if (codeMap[rawStatus]) return codeMap[rawStatus];
    }

    return ShipmentStatus.IN_TRANSIT;
  }

  async calculateShippingRate(subtotal: number): Promise<{ shipping: number; freeShippingMin: number }> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const payload = (row?.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, any>;
    const shippingConfig = payload.shipping as Record<string, any> | undefined;
    const freeShippingMin = Number(shippingConfig?.freeShippingMin ?? 499);
    const defaultRate = Number(shippingConfig?.defaultRate ?? 49);

    if (subtotal >= freeShippingMin) {
      return { shipping: 0, freeShippingMin };
    }
    return { shipping: defaultRate, freeShippingMin };
  }
}
