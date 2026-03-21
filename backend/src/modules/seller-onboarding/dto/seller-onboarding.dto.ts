import { IsString, IsEmail, IsOptional, IsBoolean, MinLength, MaxLength, Matches, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
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

export class VerifyOtpDto {
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

export class Step2TaxDetailsDto {
  @ApiPropertyOptional({ description: '15 digit GST number' })
  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, { message: 'Invalid GSTIN format' })
  gstNumber?: string;

  @ApiPropertyOptional({ description: 'Seller only sells non-GST categories like Books' })
  @IsBoolean()
  @IsOptional()
  sellsNonGstProducts?: boolean;

  @ApiProperty({ description: '10 digit PAN number' })
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  panNumber: string;

  @ApiProperty({ description: 'Name as on PAN card' })
  @IsString()
  @MinLength(2)
  panName: string;
}

export class Step3StoreDetailsDto {
  @ApiProperty()
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessCategory?: string;
}

export class Step4AddressDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Invalid pincode' })
  pincode: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  address: string;
}

export class Step5ShippingDto {
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
}

export class Step6BankDetailsDto {
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
}

export class CompleteOnboardingDto {
  @ApiProperty()
  @IsBoolean()
  agreeToTerms: boolean;
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
