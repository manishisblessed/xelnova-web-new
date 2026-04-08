import { IsString, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnDto {
  @ApiProperty({ description: 'Order number to return' })
  @IsString()
  orderNumber: string;

  @ApiProperty({ description: 'Reason for return' })
  @IsString()
  reason: string;
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
