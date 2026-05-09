import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingMode, ShipmentStatus } from '@prisma/client';

export class ShipOrderDto {
  @ApiProperty({ enum: ShippingMode })
  @IsEnum(ShippingMode)
  shippingMode: ShippingMode;

  @ApiPropertyOptional({ description: 'Carrier name (for SELF_SHIP)' })
  @IsString()
  @IsOptional()
  carrierName?: string;

  @ApiPropertyOptional({ description: 'AWB number (for SELF_SHIP)' })
  @IsString()
  @IsOptional()
  awbNumber?: string;

  @ApiPropertyOptional({ description: 'Package weight in kg' })
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  weight?: number;

  @ApiPropertyOptional({ description: 'Package dimensions e.g. "30x20x15"' })
  @IsString()
  @IsOptional()
  dimensions?: string;

  // ─── Pickup scheduling (Delhivery / integrated couriers) ───
  // Per Delhivery's documented flow, manifest creation and pickup
  // request are TWO separate API calls. We let the seller decide the
  // pickup date/time in the same UI flow as booking — but only call
  // the pickup API if these fields are supplied. Otherwise the
  // shipment sits at BOOKED until the seller schedules separately.

  @ApiPropertyOptional({ description: 'Pickup date in IST (YYYY-MM-DD).' })
  @IsString()
  @IsOptional()
  pickupDate?: string;

  @ApiPropertyOptional({ description: 'Pickup time in IST (HH:mm or HH:mm:ss).' })
  @IsString()
  @IsOptional()
  pickupTime?: string;

  @ApiPropertyOptional({ description: 'Number of packages in this pickup batch (defaults to 1).' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  expectedPackageCount?: number;

  @ApiPropertyOptional({
    description:
      'Which seller pickup location this shipment is dispatched from. ' +
      'Omit to use the seller\'s default pickup location.',
  })
  @IsString()
  @IsOptional()
  pickupLocationId?: string;

  /**
   * When `shippingMode` is `XELNOVA_COURIER` ("Ship via Xelgo"), pass the carrier
   * the seller picked from the serviceability carousel (matches `carrierBackend`
   * on each Xelgo rate row). Routes booking to Delhivery / XpressBees / etc.
   * instead of blindly using admin `platformLogistics.xelnovaBackend`.
   */
  @ApiPropertyOptional({
    enum: ['DELHIVERY', 'SHIPROCKET', 'XPRESSBEES', 'EKART'],
    description:
      'Active platform courier credential set to book this Xelgo shipment with.',
  })
  @IsOptional()
  @IsIn(['DELHIVERY', 'SHIPROCKET', 'XPRESSBEES', 'EKART'])
  platformCourier?: 'DELHIVERY' | 'SHIPROCKET' | 'XPRESSBEES' | 'EKART';
}

// ─── Pickup Locations (multi-warehouse) ───

export class CreatePickupLocationDto {
  @ApiProperty({ description: 'Human label, e.g. "Main warehouse", "Returns hub".' })
  @IsString()
  label: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiProperty({ description: '10-digit Indian mobile, sent to the courier as the pickup contact.' })
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsString()
  addressLine: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiPropertyOptional({ default: 'India' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: '6-digit pincode' })
  @IsString()
  pincode: string;

  @ApiPropertyOptional({
    description:
      'Mark this location as the seller\'s default. Auto-true when this is the very first location for the seller.',
  })
  @IsBoolean()
  @IsOptional()
  makeDefault?: boolean;
}

export class UpdatePickupLocationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressLine?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pincode?: string;
}

export class UpdateAwbDto {
  @ApiProperty()
  @IsString()
  awbNumber: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  carrierName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  trackingUrl?: string;
}

export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remark?: string;
}

export class SaveCourierConfigDto {
  @ApiProperty({ enum: ['DELHIVERY', 'SHIPROCKET', 'XPRESSBEES', 'EKART'] })
  @IsEnum(ShippingMode)
  provider: ShippingMode;

  @ApiProperty()
  @IsString()
  apiKey: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiPropertyOptional({ description: 'Account email/ID for the courier' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCourierConfigDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
