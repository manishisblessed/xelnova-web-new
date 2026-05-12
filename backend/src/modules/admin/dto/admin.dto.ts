import { Role } from '@prisma/client';
import { IsString, IsOptional, IsNumber, IsBoolean, Min, IsArray, IsEnum, Allow } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Shared pagination ───
export class PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortOrder?: string;
}

// ─── Product management ───
export class AdminProductQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seller?: string;
}

export class AdminUpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTrending?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFlashDeal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() flashDealEndsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ description: 'Reason for rejection (required when status is REJECTED)' })
  @IsOptional() @IsString() rejectionReason?: string;
  @ApiPropertyOptional({
    description:
      'Independent reason for rejecting only the product images (without rejecting the listing). ' +
      'Pass an empty string to clear.',
  })
  @IsOptional() @IsString() imageRejectionReason?: string;
  @ApiPropertyOptional({ description: 'Commission % charged on this listing (set on approval).' })
  @IsOptional() commissionRate?: number;
  @ApiPropertyOptional({ description: 'Curated bestseller rank (1 = top). null/0 to clear.' })
  @IsOptional() bestSellersRank?: number | null;
  @ApiPropertyOptional({
    description:
      'Whether this listing is eligible for replacement after delivery. ' +
      'Admin-controlled — sellers cannot self-declare replacement eligibility.',
  })
  @IsOptional() @IsBoolean() isReplaceable?: boolean;
  @ApiPropertyOptional({
    description:
      'Replacement window in days after delivery. Only applied when isReplaceable = true. ' +
      'Currently expected to be one of 2 / 5 / 7; pass null to clear.',
  })
  @IsOptional() replacementWindow?: number | null;
  @ApiPropertyOptional({
    enum: [
      'NON_RETURNABLE',
      'EASY_RETURN_3_DAYS',
      'EASY_RETURN_7_DAYS',
      'REPLACEMENT_ONLY',
      'RETURN_PLUS_REPLACEMENT',
    ],
    description: 'Canonical return policy preset; when set, overrides return/replacement flags for this update.',
  })
  @IsOptional() @IsString() returnPolicyPreset?: string;
  @ApiPropertyOptional({ description: 'Return window in days when preset is RETURN_PLUS_REPLACEMENT (default 7).' })
  @IsOptional() returnWindowDays?: number | null;
  @ApiPropertyOptional({ description: 'Structured warranty value (use with warrantyDurationUnit).' })
  @IsOptional() warrantyDurationValue?: number | null;
  @ApiPropertyOptional({ enum: ['DAYS', 'MONTHS', 'YEARS'] })
  @IsOptional() @IsString() warrantyDurationUnit?: string | null;
}

export class AdminApproveProductDto {
  @ApiPropertyOptional({ description: 'Commission % charged on this listing.' })
  @IsOptional() commissionRate?: number;
  @ApiPropertyOptional({ description: 'Curated bestseller rank (1 = top). Optional.' })
  @IsOptional() bestSellersRank?: number | null;
  @ApiPropertyOptional({ description: 'Whether the product is eligible for replacement after delivery.' })
  @IsOptional() @IsBoolean() isReplaceable?: boolean;
  @ApiPropertyOptional({ description: 'Replacement window in days (2 / 5 / 7) when eligible.' })
  @IsOptional() replacementWindow?: number | null;
  @ApiPropertyOptional({
    enum: [
      'NON_RETURNABLE',
      'EASY_RETURN_3_DAYS',
      'EASY_RETURN_7_DAYS',
      'REPLACEMENT_ONLY',
      'RETURN_PLUS_REPLACEMENT',
    ],
  })
  @IsOptional() @IsString() returnPolicyPreset?: string;
  @ApiPropertyOptional()
  @IsOptional() returnWindowDays?: number | null;
  @ApiPropertyOptional()
  @IsOptional() warrantyDurationValue?: number | null;
  @ApiPropertyOptional({ enum: ['DAYS', 'MONTHS', 'YEARS'] })
  @IsOptional() @IsString() warrantyDurationUnit?: string | null;
}

// ─── Order management ───
export class AdminOrderQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
}

export class AdminUpdateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatus?: string;
}

export class AdminUpdateShipmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() awbNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() courierProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackingUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shipmentStatus?: string;
}

// ─── Seller management ───
export class AdminSellerQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() verified?: string;
}

export class AdminUpdateSellerDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() verified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBanned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() banReason?: string;
}

// ─── Customer management ───
export class AdminCustomerQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}

export class AdminUpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBanned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() banReason?: string;
}

// ─── Category CRUD ───
export class CreateCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
}

// ─── Brand CRUD ───
export class CreateBrandDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;
  @ApiPropertyOptional({ description: 'Brand authorisation certificate URL.' })
  @IsOptional() @IsString() authorizationCertificate?: string;
}

export class UpdateBrandDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() approved?: boolean;
  @ApiPropertyOptional({ description: 'Brand authorisation certificate URL.' })
  @IsOptional() @IsString() authorizationCertificate?: string;
  @ApiPropertyOptional({ description: 'Reason shown to the seller when the brand is rejected.' })
  @IsOptional() @IsString() rejectionReason?: string;
}

// ─── Banner CRUD ───
export class CreateBannerDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subtitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaLink?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bgColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number;
}

export class UpdateBannerDto extends CreateBannerDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Coupon CRUD ───
export class CreateCouponDto {
  @ApiProperty() @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() discountType: string;
  @ApiProperty() @IsNumber() @Type(() => Number) discountValue: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) usageLimit?: number;
  @ApiPropertyOptional({ description: 'Max times a single customer can use this coupon (null = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxRedemptionsPerUser?: number;
  @ApiPropertyOptional({ enum: ['global', 'category', 'seller'] }) @IsOptional() @IsString() scope?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sellerId?: string;
}

export class UpdateCouponDto extends CreateCouponDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Commission CRUD ───
export class CreateCommissionDto {
  @ApiProperty() @IsString() categorySlug: string;
  @ApiProperty() @IsNumber() @Type(() => Number) rate: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPercentage?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minOrder?: number;
}

export class UpdateCommissionDto extends CreateCommissionDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Payout management ───
export class AdminPayoutQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seller?: string;
  @ApiPropertyOptional({ description: 'Preset: today | monthly | custom' })
  @IsOptional() @IsString() period?: string;
  @ApiPropertyOptional({ description: 'ISO date (for custom period)' })
  @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional({ description: 'ISO date (for custom period)' })
  @IsOptional() @IsString() dateTo?: string;
}

export class UpdatePayoutDto {
  @ApiProperty() @IsString() status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

// ─── Admin Roles ───
export class CreateRoleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional({ description: 'Role description for documentation' })
  @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ description: 'Role level in hierarchy (SUPER_ADMIN, MANAGER, EDITOR, VIEWER)' })
  @IsOptional() @IsString() level?: string;
  @ApiPropertyOptional({ description: 'Structured permissions by section and action' })
  @IsOptional() @Allow() permissionsData?: Record<string, Record<string, boolean>>;
  @ApiPropertyOptional({ description: 'Legacy comma-separated permissions (deprecated)' })
  @IsOptional() @IsString() permissions?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ description: 'Role level in hierarchy' })
  @IsOptional() @IsString() level?: string;
  @ApiPropertyOptional({ description: 'Structured permissions by section and action' })
  @IsOptional() @Allow() permissionsData?: Record<string, Record<string, boolean>>;
  @ApiPropertyOptional({ description: 'Legacy comma-separated permissions (deprecated)' })
  @IsOptional() @IsString() permissions?: string;
}

/** Role template for quick role creation */
export interface RoleTemplateDto {
  id: string;
  name: string;
  description: string | null;
  level: string;
  permissionsData: Record<string, Record<string, boolean>>;
}

// ─── Sub-admin (admin user) management ───
export class CreateSubAdminDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() email: string;
  /** Optional initial password — generated if omitted. */
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
  /** AdminRole.id to grant. Required for sub-admins. */
  @ApiPropertyOptional() @IsOptional() @IsString() adminRoleId?: string;
}

export class UpdateSubAdminDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() adminRoleId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── CMS Page ───
export class CreatePageDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class UpdatePageDto extends CreatePageDto {}

// ─── Site settings (singleton JSON document) ───
export class AdminSiteSettingsDto {
  @ApiPropertyOptional()
  @Allow()
  general?: Record<string, unknown>;

  @ApiPropertyOptional()
  @Allow()
  tax?: Record<string, unknown>;

  @ApiPropertyOptional()
  @Allow()
  shipping?: Record<string, unknown>;

  @ApiPropertyOptional()
  @Allow()
  payment?: Record<string, unknown>;

  @ApiPropertyOptional()
  @Allow()
  notifications?: Record<string, unknown>;

  @ApiPropertyOptional()
  @Allow()
  shippingLabel?: Record<string, unknown>;

  @ApiPropertyOptional()
  @Allow()
  shippingRates?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Marketplace-wide return/cancel policy (applies to all products)' })
  @Allow()
  returnPolicy?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Preset keys and value lists for seller product info sections (Features & Specs, Materials & Care, etc.)',
  })
  @Allow()
  productAttributePresets?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Platform courier defaults (Xelnova→Delhivery Live token, client name, warehouse). Token saved encrypted.',
  })
  @Allow()
  platformLogistics?: Record<string, unknown>;
}

/** Passed from admin HTTP handlers for audit logging (Performance → Recent Activity). */
export interface AdminAuditContext {
  adminId: string;
  adminRole: Role;
  ipAddress: string;
  userAgent: string;
}
