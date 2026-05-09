import { IsString, IsOptional, IsNumber, Min, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnDto {
  @ApiProperty({ description: 'Order number to return or replace' })
  @IsString()
  orderNumber: string;

  @ApiPropertyOptional({ enum: ['RETURN', 'REPLACEMENT'], default: 'RETURN' })
  @IsOptional()
  @IsIn(['RETURN', 'REPLACEMENT'])
  kind?: 'RETURN' | 'REPLACEMENT';

  @ApiPropertyOptional({
    description: 'Structured reason code (e.g. DEFECTIVE). Falls back to OTHER when omitted.',
  })
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional({ description: 'Legacy / human-readable reason (used when reasonCode is generic)' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'PICKED_UP', 'REFUNDED'] })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiPropertyOptional({ description: 'Refund amount (defaults to order total)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

export class ReversePickupDto {
  @ApiProperty({ description: 'Courier provider for reverse pickup' })
  @IsString()
  courier: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  awb?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupDate?: string;
}
