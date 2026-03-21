import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('ifsc/:code')
  async verifyIFSC(@Param('code') code: string, @CurrentUser('id') userId?: string) {
    const data = await this.verificationService.verifyIFSC(code, userId);
    return {
      success: true,
      data,
      message: 'IFSC code verified successfully',
    };
  }

  @Get('gstin/:gstin')
  async verifyGSTIN(@Param('gstin') gstin: string, @CurrentUser('id') userId?: string) {
    const data = await this.verificationService.verifyGSTIN(gstin, userId);
    return {
      success: true,
      data,
      message: 'GSTIN verified successfully',
    };
  }

  @Get('pan/:pan')
  async validatePAN(@Param('pan') pan: string) {
    const result = await this.verificationService.validatePAN(pan);
    return {
      success: true,
      data: result,
      message: result.valid ? 'PAN format is valid' : 'Invalid PAN format',
    };
  }

  @Post('seller/bank')
  @Auth('SELLER')
  async verifySellerBank(
    @Body() body: { sellerId: string; ifscCode: string },
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.verificationService.updateSellerBankVerification(
      body.sellerId,
      body.ifscCode,
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
  async verifySellerGST(
    @Body() body: { sellerId: string; gstin: string },
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.verificationService.updateSellerGSTVerification(
      body.sellerId,
      body.gstin,
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
