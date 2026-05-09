import {
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variant?: string;
}

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  pincode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty()
  @IsString()
  type: string;
}

export class CheckoutQuoteDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  /** Captured at checkout for phone-only signups; updates the User record. */
  @ApiPropertyOptional({ description: 'Buyer name to save on the user profile if missing' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  /** Captured at checkout for phone-only signups; updates the User record. */
  @ApiPropertyOptional({ description: 'Buyer email to save on the user profile if missing' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  customerEmail?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ 
    description: 'Where to refund: WALLET (instant) or SOURCE (original payment method, 5-7 days)',
    enum: ['WALLET', 'SOURCE'],
    default: 'WALLET',
  })
  @IsOptional()
  @IsString()
  refundTo?: 'WALLET' | 'SOURCE';
}
