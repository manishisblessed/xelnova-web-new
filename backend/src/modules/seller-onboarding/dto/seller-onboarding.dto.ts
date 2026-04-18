import { IsString, IsEmail, IsOptional, IsBoolean, MinLength, MaxLength, Matches, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SellerOnboardingSendOtpDto {
  @ApiProperty({ description: 'Email or phone number' })
  @IsString()
  identifier: string;

  @ApiProperty({ enum: ['EMAIL', 'PHONE'] })
  @IsEnum(['EMAIL', 'PHONE'])
  type: 'EMAIL' | 'PHONE';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  purpose?: string;
}

export class SellerOnboardingVerifyOtpDto {
  @ApiProperty()
  @IsString()
  identifier: string;

  @ApiProperty({ enum: ['EMAIL', 'PHONE'] })
  @IsEnum(['EMAIL', 'PHONE'])
  type: 'EMAIL' | 'PHONE';

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}

// Step 1: Account Creation (unchanged)
export class Step1AccountDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Email OTP verification token' })
  @IsString()
  emailVerificationToken: string;

  @ApiProperty({ description: 'Phone OTP verification token' })
  @IsString()
  phoneVerificationToken: string;

  @ApiProperty({ description: 'Captcha session token' })
  @IsString()
  captchaToken: string;
}

// Step 2: Business Verification (GST + Aadhaar + PAN + Store + Category)
export class Step2BusinessVerificationDto {
  @ApiPropertyOptional({ description: '15-digit GST number' })
  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, { message: 'Invalid GSTIN format' })
  gstNumber?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  sellsNonGstProducts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  gstVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  gstVerifiedData?: any;

  @ApiPropertyOptional({ description: 'PAN number' })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  panNumber?: string;

  @ApiPropertyOptional({ description: 'Name as on PAN card' })
  @IsString()
  @IsOptional()
  panName?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  panVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  panVerifiedData?: any;

  @ApiPropertyOptional({ description: 'Aadhaar number (last 4 digits stored)' })
  @IsString()
  @IsOptional()
  aadhaarNumber?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  aadhaarVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  aadhaarVerifiedData?: any;

  @ApiProperty({ description: 'Store name' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  storeName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessType?: string;

  @ApiProperty({ description: '"all" or "choose"' })
  @IsString()
  categorySelectionType: string;

  @ApiPropertyOptional({ description: 'Selected category values (when type is "choose")' })
  @IsArray()
  @IsOptional()
  selectedCategories?: string[];

  @ApiPropertyOptional({ description: 'Business address from GST data' })
  @IsString()
  @IsOptional()
  businessAddress?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessCity?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessState?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessPincode?: string;
}

// Step 3: Final Setup (Signature + Shipping + Bank)
export class Step3FinalSetupDto {
  @ApiPropertyOptional({ description: 'Cloudinary URL of signature image' })
  @IsString()
  @IsOptional()
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'Base64 data of drawn signature' })
  @IsString()
  @IsOptional()
  signatureData?: string;

  @ApiProperty({ enum: ['easy_ship', 'self_ship'] })
  @IsString()
  shippingMethod: string;

  @ApiProperty()
  @IsBoolean()
  offerFreeDelivery: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  deliveryCharge1to3Days?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  deliveryCharge3PlusDays?: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  accountHolderName: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[0-9]{9,18}$/, { message: 'Invalid bank account number' })
  accountNumber: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code' })
  ifscCode: string;

  @ApiPropertyOptional({ description: 'Skip bank re-verification (dev/testing only)' })
  @IsBoolean()
  @IsOptional()
  skipBankVerification?: boolean;

  @ApiPropertyOptional({ description: 'Pre-verified bank data from frontend penny-drop' })
  @IsOptional()
  bankVerifiedData?: Record<string, any>;
}

export class AdminReviewDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsString()
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AdminVerifySignatureDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'] })
  @IsString()
  decision: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Comment for signature verification/rejection' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class GenerateCaptchaDto {
  @ApiPropertyOptional({ enum: ['ROCK_COUNT', 'NUMBER_MATCH'] })
  @IsString()
  @IsOptional()
  type?: string;
}

export class VerifyCaptchaDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  answer: string;
}
