import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { SellerOnboardingService } from './seller-onboarding.service';
import { UploadService } from '../upload/upload.service';
import {
  SellerOnboardingSendOtpDto,
  SellerOnboardingVerifyOtpDto,
  Step1AccountDto,
  Step2BusinessVerificationDto,
  Step3FinalSetupDto,
  AdminReviewDto,
  AdminVerifySignatureDto,
  GenerateCaptchaDto,
  VerifyCaptchaDto,
} from './dto/seller-onboarding.dto';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Seller Onboarding')
@Controller('seller-onboarding')
export class SellerOnboardingController {
  constructor(
    private readonly onboardingService: SellerOnboardingService,
    private readonly uploadService: UploadService,
  ) {}

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '';
  }

  // ========== Public Endpoints (No Auth Required) ==========

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP for email or phone verification' })
  async sendOtp(@Body() dto: SellerOnboardingSendOtpDto, @Req() req: Request) {
    const result = await this.onboardingService.sendOtp(dto, this.getClientIp(req));
    return successResponse(result, 'OTP sent successfully');
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP' })
  async verifyOtp(@Body() dto: SellerOnboardingVerifyOtpDto) {
    const result = await this.onboardingService.verifyOtp(dto);
    return successResponse(result, 'OTP verified successfully');
  }

  @Post('captcha/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate puzzle captcha' })
  async generateCaptcha(@Body() dto: GenerateCaptchaDto) {
    const result = await this.onboardingService.generateCaptcha(dto.type);
    return successResponse(result, 'Captcha generated');
  }

  @Post('captcha/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify captcha answer' })
  async verifyCaptcha(@Body() dto: VerifyCaptchaDto) {
    const result = await this.onboardingService.verifyCaptcha(dto.sessionId, dto.answer);
    return successResponse(result, 'Captcha verified');
  }

  // ========== Step 1: Account Creation ==========

  @Post('register/step-1')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Step 1: Create seller account with verified email and phone' })
  async createAccount(
    @Body() dto: Step1AccountDto,
    @Req() req: Request,
  ) {
    const result = await this.onboardingService.createSellerAccount(
      dto,
      this.getClientIp(req),
      req.headers['user-agent'],
    );
    return successResponse(result, 'Account created successfully');
  }

  // ========== Step 2: Business Verification ==========

  @Put('step-2/:sellerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 2: Business verification (GST + Aadhaar + PAN + Store + Category)' })
  async updateBusinessVerification(
    @Param('sellerId') sellerId: string,
    @Body() dto: Step2BusinessVerificationDto,
  ) {
    const result = await this.onboardingService.updateBusinessVerification(sellerId, dto);
    return successResponse(result, 'Business verification details updated');
  }

  // ========== Step 3: Final Setup ==========

  @Put('step-3/:sellerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 3: Final setup (Signature + Shipping + Bank)' })
  async updateFinalSetup(
    @Param('sellerId') sellerId: string,
    @Body() dto: Step3FinalSetupDto,
  ) {
    const result = await this.onboardingService.updateFinalSetup(sellerId, dto);
    return successResponse(result, 'Final setup completed');
  }

  // ========== Document Upload ==========

  @Post('document/:sellerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload KYC document (Cloudinary)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['PAN_CARD', 'MASKED_AADHAAR', 'GST_CERTIFICATE', 'CANCELLED_CHEQUE', 'BUSINESS_LICENSE', 'ADDRESS_PROOF', 'IDENTITY_PROOF', 'SIGNATURE'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadDocument(
    @Param('sellerId') sellerId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    await this.onboardingService.ensureSellerExists(sellerId);

    const { url } = await this.uploadService.uploadImage(file, `xelnova/seller-docs/${sellerId}`);

    const result = await this.onboardingService.uploadDocument(
      sellerId,
      type,
      url,
      file.originalname,
      file.size,
      file.mimetype,
    );
    return successResponse({ ...result, fileUrl: url }, 'Document uploaded');
  }

  // ========== Submit for Review ==========

  @Post('submit/:sellerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit application for admin review' })
  async submitForReview(@Param('sellerId') sellerId: string) {
    const result = await this.onboardingService.submitForReview(sellerId);
    return successResponse(result, 'Application submitted for review');
  }

  @Get('status/:sellerId')
  @ApiOperation({ summary: 'Get seller onboarding status' })
  async getOnboardingStatus(@Param('sellerId') sellerId: string) {
    const result = await this.onboardingService.getSellerOnboardingStatus(sellerId);
    return successResponse(result, 'Onboarding status retrieved');
  }

  @Post('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check registration progress by email (public, for resume flow)' })
  async getProgressByEmail(@Body('email') email: string) {
    const result = await this.onboardingService.getProgressByEmail(email);
    return successResponse(result, 'Progress checked');
  }

  // ========== Admin Endpoints ==========

  @Get('admin/pending')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get sellers pending review (Admin only)' })
  async getPendingReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.onboardingService.getPendingReviews(
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
    return successResponse(result, 'Pending reviews retrieved');
  }

  @Get('admin/stats')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get onboarding status counts (Admin only)' })
  async getOnboardingStats() {
    return successResponse(await this.onboardingService.getOnboardingStats(), 'Stats retrieved');
  }

  @Get('admin/sellers')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get all sellers with filters (Admin only)' })
  async getAllSellers(
    @Query('status') status?: string,
    @Query('verified') verified?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.onboardingService.getAllSellers({
      status,
      verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      search,
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
    });
    return successResponse(result, 'Sellers retrieved');
  }

  @Post('admin/review/:sellerId')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review and approve/reject seller (Admin only)' })
  async reviewSeller(
    @Param('sellerId') sellerId: string,
    @Body() dto: AdminReviewDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.onboardingService.reviewSeller(sellerId, adminId, dto);
    return successResponse(result, `Seller ${dto.decision.toLowerCase()}`);
  }

  @Post('admin/verify-signature/:sellerId')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify or reject seller signature (Admin only)' })
  async verifySignature(
    @Param('sellerId') sellerId: string,
    @Body() dto: AdminVerifySignatureDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.onboardingService.verifySignature(
      sellerId,
      adminId,
      dto.decision,
      dto.comment,
    );
    return successResponse(result, `Signature ${dto.decision.toLowerCase()}`);
  }
}
