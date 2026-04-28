import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, Min, IsEnum, Allow, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) price: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) compareAtPrice?: number;
  @ApiProperty() @IsString() categoryId: string;
  @ApiProperty() @IsString() @IsNotEmpty() brand: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) highlights?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @Allow() variants?: any;
  @ApiPropertyOptional() @IsOptional() @Allow() specifications?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDescription?: string;
  @ApiProperty() @IsString() @IsNotEmpty() hsnCode: string;
  @ApiProperty() @IsNumber() @Type(() => Number) gstRate: number;
  @ApiPropertyOptional({ description: 'Seller uploaded brand authorization certificate URL' })
  @IsOptional() @IsString() brandAuthorizationCertificate?: string;
  @ApiPropertyOptional({
    description:
      'Extra document URLs (distributor letter, etc.) when listing as an authorized dealer for a brand another seller registered',
  })
  @IsOptional() @IsArray() @IsString({ each: true }) brandAuthAdditionalDocumentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) lowStockThreshold?: number;
  @ApiPropertyOptional({ description: 'Weight in kg' }) @IsOptional() @IsNumber() @Type(() => Number) weight?: number;
  @ApiPropertyOptional({ description: 'Dimensions in LxWxH cm format (e.g., 30x20x15)' }) @IsOptional() @IsString() dimensions?: string;
  
  // Return/Cancellation/Replacement policies
  @ApiPropertyOptional({ description: 'Can be cancelled before shipping' }) @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) isCancellable?: boolean;
  @ApiPropertyOptional({ description: 'Can be returned after delivery' }) @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) isReturnable?: boolean;
  @ApiPropertyOptional({ description: 'Can be replaced/exchanged' }) @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) isReplaceable?: boolean;
  @ApiPropertyOptional({ description: 'Return window in days after delivery' }) @IsOptional() @IsNumber() @Type(() => Number) returnWindow?: number;
  @ApiPropertyOptional({ description: 'Cancellation window in hours (0 = until shipped)' }) @IsOptional() @IsNumber() @Type(() => Number) cancellationWindow?: number;

  // Amazon-style product information
  @ApiPropertyOptional({ description: 'Features and specifications as key-value pairs' }) @IsOptional() @Allow() featuresAndSpecs?: any;
  @ApiPropertyOptional({ description: 'Materials and care instructions as key-value pairs' }) @IsOptional() @Allow() materialsAndCare?: any;
  @ApiPropertyOptional({ description: 'Item details as key-value pairs' }) @IsOptional() @Allow() itemDetails?: any;
  @ApiPropertyOptional({ description: 'Additional details as key-value pairs' }) @IsOptional() @Allow() additionalDetails?: any;
  @ApiPropertyOptional({ description: 'Detailed product description' }) @IsOptional() @IsString() productDescription?: string;
  @ApiPropertyOptional({ description: 'Safety and product resources information' }) @IsOptional() @IsString() safetyInfo?: string;
  @ApiPropertyOptional({ description: 'Regulatory information (BIS, certifications)' }) @IsOptional() @IsString() regulatoryInfo?: string;
  @ApiPropertyOptional({ description: 'Warranty information' }) @IsOptional() @IsString() warrantyInfo?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) compareAtPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) highlights?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @Allow() variants?: any;
  @ApiPropertyOptional() @IsOptional() @Allow() specifications?: any;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() hsnCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) gstRate?: number;
  @ApiPropertyOptional({ description: 'Seller uploaded brand authorization certificate URL' })
  @IsOptional() @IsString() brandAuthorizationCertificate?: string;
  @ApiPropertyOptional({
    description: 'Extra document URLs when listing as an authorized dealer for a brand another seller registered',
  })
  @IsOptional() @IsArray() @IsString({ each: true }) brandAuthAdditionalDocumentUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) lowStockThreshold?: number;
  @ApiPropertyOptional({ description: 'Weight in kg' }) @IsOptional() @IsNumber() @Type(() => Number) weight?: number;
  @ApiPropertyOptional({ description: 'Dimensions in LxWxH cm format (e.g., 30x20x15)' }) @IsOptional() @IsString() dimensions?: string;
  
  // Return/Cancellation/Replacement policies
  @ApiPropertyOptional({ description: 'Can be cancelled before shipping' }) @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) isCancellable?: boolean;
  @ApiPropertyOptional({ description: 'Can be returned after delivery' }) @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) isReturnable?: boolean;
  @ApiPropertyOptional({ description: 'Can be replaced/exchanged' }) @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) isReplaceable?: boolean;
  @ApiPropertyOptional({ description: 'Return window in days after delivery' }) @IsOptional() @IsNumber() @Type(() => Number) returnWindow?: number;
  @ApiPropertyOptional({ description: 'Cancellation window in hours (0 = until shipped)' }) @IsOptional() @IsNumber() @Type(() => Number) cancellationWindow?: number;

  // Amazon-style product information
  @ApiPropertyOptional({ description: 'Features and specifications as key-value pairs' }) @IsOptional() @Allow() featuresAndSpecs?: any;
  @ApiPropertyOptional({ description: 'Materials and care instructions as key-value pairs' }) @IsOptional() @Allow() materialsAndCare?: any;
  @ApiPropertyOptional({ description: 'Item details as key-value pairs' }) @IsOptional() @Allow() itemDetails?: any;
  @ApiPropertyOptional({ description: 'Additional details as key-value pairs' }) @IsOptional() @Allow() additionalDetails?: any;
  @ApiPropertyOptional({ description: 'Detailed product description' }) @IsOptional() @IsString() productDescription?: string;
  @ApiPropertyOptional({ description: 'Safety and product resources information' }) @IsOptional() @IsString() safetyInfo?: string;
  @ApiPropertyOptional({ description: 'Regulatory information (BIS, certifications)' }) @IsOptional() @IsString() regulatoryInfo?: string;
  @ApiPropertyOptional({ description: 'Warranty information' }) @IsOptional() @IsString() warrantyInfo?: string;
}

export class SellerProductQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortOrder?: string;
}

export class SellerOrderQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty() @IsString() status: string;
}

export class UpdateSellerProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() storeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() panNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aadhaarNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfscCode?: string;
  // Pickup / business address (testing observation #8) — sellers manage
  // their pickup location directly from the seller app instead of having
  // to update it inside each courier's portal.
  @ApiPropertyOptional() @IsOptional() @IsString() businessAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessState?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessPincode?: string;
  // Pickup contact number sent to the courier as the warehouse phone.
  // Sellers who signed up via Google (no User.phone on file) MUST be
  // able to set this here, otherwise every Xelgo / Delhivery booking
  // fails with "pickup address is incomplete".
  @ApiPropertyOptional({ description: 'Pickup contact / warehouse phone number sent to couriers' })
  @IsOptional() @IsString() phone?: string;
}

export class RevenueQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() period?: string; // 'day' | 'week' | 'month' | 'year'
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
}

export class ProposeBrandDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  /**
   * Brand authorisation / authenticity certificate URL. Required for any
   * seller who already has at least one proposed brand — the first brand
   * may be proposed without it (admin can ask for it before approval).
   */
  @ApiPropertyOptional({
    description: 'URL to an uploaded brand authorisation certificate (PDF / image).',
  })
  @IsOptional() @IsString() authorizationCertificate?: string;
}

// ─── Seller Coupon Management ───

export class CreateSellerCouponDto {
  @ApiProperty() @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ['PERCENTAGE', 'FLAT'] }) @IsString() discountType: string;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) discountValue: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) usageLimit?: number;
  @ApiPropertyOptional({ enum: ['seller', 'cart'], description: 'seller = applies to this seller\'s products only, cart = applies to entire cart' })
  @IsOptional() @IsString() scope?: string;
}

export class UpdateSellerCouponDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() discountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) discountValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) isActive?: boolean;
  @ApiPropertyOptional({ enum: ['seller', 'cart'] }) @IsOptional() @IsString() scope?: string;
}

export class SettlementQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
}
