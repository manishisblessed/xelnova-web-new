import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
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
