import { Controller, Get, Post, Body, Query, Param, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, MinLength, IsOptional, IsEnum } from 'class-validator';
import { VerificationService } from './verification.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class PennyDropDto {
  @ApiProperty({ example: '39470006171', description: 'Bank account number (9-18 digits)' })
  @IsString()
  @Matches(/^[0-9]{9,18}$/, { message: 'Account number must be 9-18 digits' })
  accountNumber: string;

  @ApiProperty({ example: 'SBIN0001266', description: '11-character IFSC code' })
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  ifscCode: string;
}

class SellerBankVerifyDto {
  @ApiProperty({ description: 'Seller profile ID' })
  @IsString()
  sellerId: string;

  @ApiProperty({ example: '39470006171', description: 'Bank account number' })
  @IsString()
  @Matches(/^[0-9]{9,18}$/, { message: 'Account number must be 9-18 digits' })
  accountNumber: string;

  @ApiProperty({ example: 'SBIN0001266', description: 'IFSC code' })
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  ifscCode: string;
}

class SellerGstVerifyDto {
  @ApiProperty({ description: 'Seller profile ID' })
  @IsString()
  sellerId: string;

  @ApiProperty({ example: '29AABCU9603R1ZM', description: 'GSTIN number' })
  @IsString()
  @MinLength(15)
  gstin: string;
}

class DigilockerCreateUrlDto {
  @ApiPropertyOptional({ description: 'Unique order ID for the verification request' })
  @IsString()
  @IsOptional()
  orderId?: string;
}

class DigilockerGetDocumentDto {
  @ApiProperty({ description: 'Verification ID from create URL response' })
  @IsString()
  verificationId: string;

  @ApiProperty({ description: 'Reference ID from create URL response' })
  @IsString()
  referenceId: string;

  @ApiProperty({ description: 'Order ID used in create URL request' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: ['AADHAAR', 'PAN'], description: 'Document type to fetch' })
  @IsEnum(['AADHAAR', 'PAN'])
  documentType: 'AADHAAR' | 'PAN';
}

class PanVerifyDto {
  @ApiProperty({ example: 'EKRPR1234F', description: '10-character PAN number' })
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  panNumber: string;
}

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('ifsc/:code')
  @ApiOperation({ summary: 'Verify IFSC code via Razorpay' })
  async verifyIFSC(@Param('code') code: string, @CurrentUser('id') userId?: string) {
    const data = await this.verificationService.verifyIFSC(code, userId);
    return {
      success: true,
      data,
      message: 'IFSC code verified successfully',
    };
  }

  @Get('gstin/:gstin')
  @ApiOperation({ summary: 'Verify GSTIN number' })
  async verifyGSTIN(@Param('gstin') gstin: string, @CurrentUser('id') userId?: string) {
    const data = await this.verificationService.verifyGSTIN(gstin, userId);
    return {
      success: true,
      data,
      message: 'GSTIN verified successfully',
    };
  }

  @Get('pan/:pan')
  @ApiOperation({ summary: 'Validate PAN format' })
  async validatePAN(@Param('pan') pan: string) {
    const result = await this.verificationService.validatePAN(pan);
    return {
      success: true,
      data: result,
      message: result.valid ? 'PAN format is valid' : 'Invalid PAN format',
    };
  }

  @Post('penny-drop')
  @ApiOperation({ summary: 'Verify bank account via Bank Verification Advance (₹1 credit + full details)' })
  async pennyDrop(
    @Body() dto: PennyDropDto,
    @CurrentUser('id') userId?: string,
  ) {
    const data = await this.verificationService.verifyBankAccount(
      dto.accountNumber,
      dto.ifscCode,
      userId,
    );
    return {
      success: true,
      data,
      message: 'Bank account verified successfully',
    };
  }

  @Post('seller/bank')
  @Auth('SELLER')
  @ApiOperation({ summary: 'Verify and update seller bank details via Penny Drop' })
  async verifySellerBank(
    @Body() dto: SellerBankVerifyDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.verificationService.updateSellerBankVerification(
      dto.sellerId,
      dto.accountNumber,
      dto.ifscCode,
      userId,
    );
    return {
      success: true,
      data,
      message: 'Bank details verified and updated successfully',
    };
  }

  @Post('seller/gst')
  @Auth('SELLER')
  @ApiOperation({ summary: 'Verify and update seller GSTIN' })
  async verifySellerGST(
    @Body() dto: SellerGstVerifyDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.verificationService.updateSellerGSTVerification(
      dto.sellerId,
      dto.gstin,
      userId,
    );
    return {
      success: true,
      data,
      message: 'GSTIN verified and updated successfully',
    };
  }

  // ========== Digilocker Aadhaar (eKYCHub) ==========

  @Post('aadhaar/digilocker/create-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Digilocker redirect URL for Aadhaar verification' })
  async createDigilockerAadhaarUrl(@Body() dto: DigilockerCreateUrlDto) {
    const data = await this.verificationService.createDigilockerAadhaarUrl(dto.orderId ?? '');
    return { success: true, data, message: 'Digilocker Aadhaar URL created' };
  }

  // ========== Digilocker PAN (eKYCHub) ==========

  @Post('pan/digilocker/create-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Digilocker redirect URL for PAN verification' })
  async createDigilockerPanUrl(@Body() dto: DigilockerCreateUrlDto) {
    const data = await this.verificationService.createDigilockerPanUrl(dto.orderId ?? '');
    return { success: true, data, message: 'Digilocker PAN URL created' };
  }

  // ========== Digilocker Get Document ==========

  @Post('digilocker/get-document')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch verified document from Digilocker after user completes verification' })
  async getDigilockerDocument(@Body() dto: DigilockerGetDocumentDto) {
    const data = await this.verificationService.getDigilockerDocument(
      dto.verificationId,
      dto.referenceId,
      dto.orderId,
      dto.documentType,
    );
    return { success: true, data, message: `${dto.documentType} verified successfully via Digilocker` };
  }

  // ========== PAN Verification (eKYCHub) ==========

  @Post('pan/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify PAN number via eKYCHub PAN 360' })
  async verifyPan(@Body() dto: PanVerifyDto) {
    const data = await this.verificationService.verifyPan360(dto.panNumber);
    return { success: true, data, message: 'PAN verified successfully' };
  }

  @Get('digilocker/callback')
  @ApiOperation({ summary: 'Digilocker redirect callback — auto-closes the popup window' })
  async digilockerCallback(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html><head><title>Verification Complete</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc}
.card{text-align:center;padding:2.5rem;border-radius:1rem;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06),0 8px 24px -4px rgba(0,0,0,.08);max-width:22rem;margin:1rem}
.icon{width:3.5rem;height:3.5rem;border-radius:50%;background:#ecfdf5;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
.icon svg{width:1.75rem;height:1.75rem;color:#16a34a}
h1{font-size:1.25rem;font-weight:700;color:#111827;margin-bottom:.5rem}
p{font-size:.875rem;color:#6b7280;line-height:1.5}
.spinner{display:inline-block;width:.75rem;height:.75rem;border:2px solid #d1d5db;border-top-color:#9ca3af;border-radius:50%;animation:spin .6s linear infinite;margin-right:.375rem;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.closing{margin-top:1rem;font-size:.75rem;color:#9ca3af}</style></head>
<body><div class="card">
<div class="icon"><svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>
<h1>Verification Complete</h1>
<p>Your Digilocker verification is done. This window will close automatically.</p>
<p class="closing"><span class="spinner"></span>Closing…</p>
</div>
<script>
(function(){
  try{if(window.opener){window.opener.postMessage({type:'digilocker-done'},'*')}}catch(e){}
  setTimeout(function(){try{window.close()}catch(e){}},1500);
  setTimeout(function(){document.querySelector('.closing').textContent='You can close this window.'},3000);
})();
</script>
</body></html>`);
  }

  @Get('logs')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get verification logs (Admin only)' })
  async getVerificationLogs(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.verificationService.getVerificationLogs({
      type,
      status,
      userId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return {
      success: true,
      ...data,
    };
  }
}
