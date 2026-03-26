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

// ─── Seller management ───
export class AdminSellerQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() verified?: string;
}

export class AdminUpdateSellerDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() verified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) commissionRate?: number;
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
}

export class UpdateBrandDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
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
}

export class UpdatePayoutDto {
  @ApiProperty() @IsString() status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

// ─── Admin Roles ───
export class CreateRoleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() permissions?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() permissions?: string;
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
}

/** Passed from admin HTTP handlers for audit logging (Performance → Recent Activity). */
export interface AdminAuditContext {
  adminId: string;
  adminRole: Role;
  ipAddress: string;
  userAgent: string;
}
