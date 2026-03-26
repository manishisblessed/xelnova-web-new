import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
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
