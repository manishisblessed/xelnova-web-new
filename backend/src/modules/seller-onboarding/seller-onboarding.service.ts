import {
  Injectable,
  HttpException,
  HttpStatus,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sendFortiusOtpSms } from '../../common/helpers/fortius-sms.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  Step1AccountDto,
  Step2BusinessVerificationDto,
  Step3FinalSetupDto,
  SellerOnboardingSendOtpDto,
  SellerOnboardingVerifyOtpDto,
  AdminReviewDto,
} from './dto/seller-onboarding.dto';

@Injectable()
export class SellerOnboardingService {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
  ) {}

  // ========== OTP Services ==========

  async sendOtp(dto: SellerOnboardingSendOtpDto, ipAddress?: string) {
    const { identifier, type, purpose = 'REGISTRATION' } = dto;

    const recentOtps = await this.prisma.otpVerification.count({
      where: {
        identifier,
        type,
        verified: false,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentOtps >= 1) {
      throw new HttpException('Please wait 60 seconds before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpVerification.updateMany({
      where: { identifier, type, verified: false },
      data: { expiresAt: new Date() },
    });

    const record = await this.prisma.otpVerification.create({
      data: {
        identifier,
        type,
        otp,
        purpose,
        expiresAt,
        ipAddress,
      },
    });

    try {
      if (type === 'EMAIL') {
        await this.sendEmailOtp(identifier, otp);
      } else {
        await sendFortiusOtpSms(identifier, otp);
      }
    } catch (err) {
      await this.prisma.otpVerification.delete({ where: { id: record.id } }).catch(() => undefined);
      throw err;
    }

    const isDev = process.env.NODE_ENV !== 'production';
    let devOtp: string | undefined;
    if (isDev) {
      const resendMissing = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_xxxxx';
      const fortiusMissing = !process.env.FORTIUS_API_KEY?.trim();
      if (type === 'EMAIL' && resendMissing) devOtp = otp;
      if (type === 'PHONE' && fortiusMissing) devOtp = otp;
    }

    return {
      expiresIn: 600,
      ...(devOtp ? { devOtp } : {}),
    };
  }

  async verifyOtp(dto: SellerOnboardingVerifyOtpDto) {
    const { identifier, type, otp } = dto;

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        identifier,
        type,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new HttpException('OTP expired or not found', HttpStatus.BAD_REQUEST);
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new HttpException('Too many failed attempts. Please request a new OTP', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (otpRecord.otp !== otp) {
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true, verifiedAt: new Date() },
    });

    const verificationToken = uuidv4();

    return {
      success: true,
      message: 'OTP verified successfully',
      verificationToken,
    };
  }

  private async sendEmailOtp(email: string, otp: string) {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey || resendApiKey === 're_xxxxx') {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM on the backend.',
        );
      }
      console.log(`[DEV] Email OTP for ${email}: ${otp}`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Xelnova <noreply@xelnova.in>',
        to: email,
        subject: 'Verify your email - Xelnova Seller',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">Xelnova Seller Verification</h2>
              <p>Your OTP for email verification is:</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${otp}</span>
              </div>
              <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
            </div>
          `,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(`Email send failed (${response.status}): ${body.slice(0, 300)}`);
    }
  }

  // ========== Captcha Services ==========

  async generateCaptcha(type: string = 'RECAPTCHA') {
    if (type === 'RECAPTCHA') {
      const siteKey = process.env.RECAPTCHA_SITE_KEY;
      if (!siteKey) {
        throw new HttpException('reCAPTCHA is not configured. Set RECAPTCHA_SITE_KEY on the backend.', HttpStatus.SERVICE_UNAVAILABLE);
      }
      return { type: 'RECAPTCHA', siteKey };
    }

    const sessionId = uuidv4();
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const answer = (a + b).toString();

    await this.prisma.captchaSession.create({
      data: {
        sessionId,
        puzzleType: 'MATH',
        answer,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return {
      type: 'MATH',
      sessionId,
      puzzle: { instruction: `What is ${a} + ${b}?`, display: `${a} + ${b} = ?` },
      expiresIn: 300,
    };
  }

  async verifyCaptcha(sessionId: string, answer: string) {
    if (sessionId === 'recaptcha') {
      return this.verifyRecaptchaToken(answer);
    }

    const session = await this.prisma.captchaSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new HttpException('Captcha session not found', HttpStatus.BAD_REQUEST);
    }

    if (session.expiresAt < new Date()) {
      throw new HttpException('Captcha expired', HttpStatus.BAD_REQUEST);
    }

    if (session.solved) {
      throw new HttpException('Captcha already solved', HttpStatus.BAD_REQUEST);
    }

    if (session.attempts >= session.maxAttempts) {
      throw new HttpException('Too many failed attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (session.answer !== answer) {
      await this.prisma.captchaSession.update({
        where: { sessionId },
        data: { attempts: { increment: 1 } },
      });
      throw new HttpException('Incorrect answer. Try again.', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.captchaSession.update({
      where: { sessionId },
      data: { solved: true, solvedAt: new Date() },
    });

    const captchaToken = uuidv4();
    return { success: true, captchaToken };
  }

  private async verifyRecaptchaToken(token: string) {
    const projectId = process.env.RECAPTCHA_PROJECT_ID;
    const apiKey = process.env.RECAPTCHA_API_KEY;
    const siteKey = process.env.RECAPTCHA_SITE_KEY;

    const missing: string[] = [];
    if (!projectId) missing.push('RECAPTCHA_PROJECT_ID');
    if (!apiKey) missing.push('RECAPTCHA_API_KEY');
    if (!siteKey) missing.push('RECAPTCHA_SITE_KEY');

    if (missing.length > 0) {
      console.error(`[reCAPTCHA] Missing env vars: ${missing.join(', ')}`);
      throw new HttpException(
        'Security verification is temporarily unavailable. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: { token, siteKey, expectedAction: 'REGISTER' },
        }),
      });
    } catch (err) {
      console.error('[reCAPTCHA] Network error calling Google API:', err);
      throw new HttpException(
        'Security verification service is unreachable. Please try again later.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = await res.json();

    if (!res.ok) {
      console.error('[reCAPTCHA] Google API error:', JSON.stringify(data));
      throw new HttpException(
        'Security verification failed. Please try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!data.tokenProperties?.valid) {
      const reason = data.tokenProperties?.invalidReason || 'UNKNOWN';
      console.warn(`[reCAPTCHA] Token invalid: ${reason}`);
      throw new HttpException('Verification failed. Please try again.', HttpStatus.BAD_REQUEST);
    }

    const score = data.riskAnalysis?.score ?? 0;
    if (score < 0.3) {
      console.warn(`[reCAPTCHA] Score too low: ${score}`);
      throw new HttpException('Verification failed. Please try again.', HttpStatus.BAD_REQUEST);
    }

    const captchaToken = uuidv4();
    return { success: true, captchaToken };
  }

  // ========== Step 1: Account Creation ==========

  async createSellerAccount(dto: Step1AccountDto, ipAddress?: string, userAgent?: string) {
    dto.email = dto.email.trim().toLowerCase();
    dto.fullName = dto.fullName.trim();
    dto.phone = dto.phone.trim();

    const existingSeller = await this.prisma.sellerProfile.findUnique({
      where: { email: dto.email },
    });

    if (existingSeller) {
      const completedStatuses = ['APPROVED', 'UNDER_REVIEW', 'DOCUMENTS_SUBMITTED'];

      if (completedStatuses.includes(existingSeller.onboardingStatus)) {
        throw new HttpException(
          'A seller account with this email has already completed registration. Please log in instead.',
          HttpStatus.CONFLICT,
        );
      }

      const hashedPassword = await bcrypt.hash(dto.password, 12);
      const user = await this.findOrCreateUser(dto, hashedPassword, ipAddress);

      const resumeStep = Math.max(existingSeller.onboardingStep ?? 2, 2);

      await this.prisma.sellerProfile.update({
        where: { id: existingSeller.id },
        data: {
          userId: user.id,
          email: dto.email,
          phone: dto.phone,
          storeName: existingSeller.storeName || dto.fullName + "'s Store",
          onboardingStatus: resumeStep >= 3 ? existingSeller.onboardingStatus : 'EMAIL_VERIFIED',
          onboardingStep: resumeStep,
        },
      });

      return {
        success: true,
        message: resumeStep > 2 ? 'Resuming registration' : 'Seller registration reset',
        userId: user.id,
        sellerId: existingSeller.id,
        nextStep: resumeStep,
      };
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.findOrCreateUser(dto, hashedPassword, ipAddress);

    const slug = this.generateSlug(dto.fullName);
    const sellerProfile = await this.prisma.sellerProfile.create({
      data: {
        userId: user.id,
        email: dto.email,
        phone: dto.phone,
        storeName: dto.fullName + "'s Store",
        slug,
        onboardingStatus: 'EMAIL_VERIFIED',
        onboardingStep: 2,
      },
    });

    return {
      success: true,
      message: 'Account created successfully',
      userId: user.id,
      sellerId: sellerProfile.id,
      nextStep: 2,
    };
  }

  private async findOrCreateUser(
    dto: Step1AccountDto,
    hashedPassword: string,
    ipAddress?: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: dto.fullName,
          password: hashedPassword,
          role: 'SELLER',
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      });
      return existingUser;
    }

    return this.prisma.user.create({
      data: {
        name: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        role: 'SELLER',
        emailVerified: true,
        phoneVerified: true,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });
  }

  // ========== Step 2: Business Verification ==========

  async updateBusinessVerification(sellerId: string, dto: Step2BusinessVerificationDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    let gstVerified = dto.gstVerified || false;
    let gstVerifiedData: any = dto.gstVerifiedData || null;

    if (dto.gstNumber && !dto.sellsNonGstProducts && !gstVerified) {
      try {
        const gstData = await this.verificationService.verifyGSTIN(dto.gstNumber, seller.userId ?? undefined);
        gstVerified = true;
        gstVerifiedData = gstData;
      } catch (error) {
        throw new HttpException(`GST verification failed: ${error.message}`, HttpStatus.BAD_REQUEST);
      }
    }

    const slug = this.generateSlug(dto.storeName);
    const existingSlug = await this.prisma.sellerProfile.findFirst({
      where: { slug, id: { not: sellerId } },
    });
    if (existingSlug) {
      throw new HttpException('Store name already taken', HttpStatus.CONFLICT);
    }

    // Mask Aadhaar for storage (keep last 4 digits)
    let maskedAadhaar: string | undefined;
    if (dto.aadhaarNumber) {
      const cleaned = dto.aadhaarNumber.replace(/\s/g, '');
      maskedAadhaar = 'XXXX-XXXX-' + cleaned.slice(-4);
    }

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        gstNumber: dto.gstNumber,
        gstVerified,
        gstVerifiedAt: gstVerified ? new Date() : null,
        gstVerifiedData: gstVerifiedData as any,
        sellsNonGstProducts: dto.sellsNonGstProducts || false,
        panNumber: dto.panNumber,
        panName: dto.panName,
        panVerified: dto.panVerified || false,
        panVerifiedAt: dto.panVerified ? new Date() : null,
        panVerifiedData: dto.panVerifiedData || undefined,
        aadhaarNumber: maskedAadhaar,
        aadhaarVerified: dto.aadhaarVerified || false,
        aadhaarVerifiedAt: dto.aadhaarVerified ? new Date() : null,
        aadhaarVerifiedData: dto.aadhaarVerifiedData || undefined,
        storeName: dto.storeName,
        slug,
        description: dto.description,
        businessType: dto.businessType,
        categorySelectionType: dto.categorySelectionType,
        selectedCategories: dto.selectedCategories || [],
        businessAddress: dto.businessAddress,
        businessCity: dto.businessCity,
        businessState: dto.businessState,
        businessPincode: dto.businessPincode,
        location: dto.businessCity && dto.businessState
          ? `${dto.businessCity}, ${dto.businessState}`
          : undefined,
        onboardingStep: 3,
      },
    });

    return {
      success: true,
      message: 'Business verification details updated',
      gstVerified,
      slug,
      nextStep: 3,
    };
  }

  // ========== Step 3: Final Setup ==========

  async updateFinalSetup(sellerId: string, dto: Step3FinalSetupDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: { user: true },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    // Verify bank account (skip if already verified on frontend)
    let bankData: any;
    if (dto.skipBankVerification && dto.bankVerifiedData) {
      bankData = dto.bankVerifiedData;
    } else {
      try {
        bankData = await this.verificationService.verifyBankAccount(
          dto.accountNumber,
          dto.ifscCode,
          seller.userId ?? undefined,
        );
      } catch (error) {
        throw new HttpException(
          `Bank account verification failed: ${error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        signatureUrl: dto.signatureUrl,
        signatureData: dto.signatureData,
        shippingMethod: dto.shippingMethod,
        offerFreeDelivery: dto.offerFreeDelivery,
        deliveryCharge1to3Days: dto.deliveryCharge1to3Days,
        deliveryCharge3PlusDays: dto.deliveryCharge3PlusDays,
        bankAccountName: dto.accountHolderName,
        bankAccountNumber: dto.accountNumber,
        bankIfscCode: dto.ifscCode,
        bankVerified: true,
        bankVerifiedAt: new Date(),
        bankVerifiedData: bankData as any,
        bankVerifiedName: bankData?.nameAtBank || dto.accountHolderName,
        bankName: bankData?.bankName || '',
        bankBranch: bankData?.branch || '',
        onboardingStatus: 'DOCUMENTS_SUBMITTED',
        onboardingStep: 4,
      },
    });

    return {
      success: true,
      message: 'Bank account verified — ₹1 credited to account',
      bankName: bankData?.bankName,
      branch: bankData?.branch,
      city: bankData?.city,
      nameAtBank: bankData?.nameAtBank || dto.accountHolderName,
    };
  }

  // ========== Submit for Review ==========

  async submitForReview(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: { documents: true },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    const missingFields: string[] = [];
    if (!seller.storeName) missingFields.push('storeName');
    if (!seller.bankAccountNumber) missingFields.push('bankAccountNumber');
    if (!seller.signatureUrl && !seller.signatureData) missingFields.push('signature');

    if (missingFields.length > 0) {
      throw new HttpException(`Missing required fields: ${missingFields.join(', ')}`, HttpStatus.BAD_REQUEST);
    }

    if (!seller.gstVerified && !seller.sellsNonGstProducts) {
      throw new HttpException('GST verification required', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        onboardingStatus: 'UNDER_REVIEW',
      },
    });

    return {
      success: true,
      message: 'Application submitted for review',
      status: 'UNDER_REVIEW',
    };
  }

  // ========== Document Upload ==========

  async ensureSellerExists(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: { id: true },
    });
    if (!seller) {
      throw new HttpException('Seller not found. Please restart registration from Step 1.', HttpStatus.NOT_FOUND);
    }
    return seller;
  }

  async uploadDocument(
    sellerId: string,
    type: string,
    fileUrl: string,
    fileName: string,
    fileSize?: number,
    mimeType?: string,
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    const existingDoc = await this.prisma.sellerDocument.findFirst({
      where: { sellerId, type: type as any },
    });

    if (existingDoc) {
      await this.prisma.sellerDocument.update({
        where: { id: existingDoc.id },
        data: {
          fileUrl,
          fileName,
          fileSize,
          mimeType,
          verified: false,
          verifiedAt: null,
        },
      });
    } else {
      await this.prisma.sellerDocument.create({
        data: {
          sellerId,
          type: type as any,
          fileUrl,
          fileName,
          fileSize,
          mimeType,
        },
      });
    }

    const updateData: any = {};
    if (type === 'PAN_CARD') updateData.panDocumentUrl = fileUrl;
    if (type === 'MASKED_AADHAAR') updateData.maskedAadhaarUrl = fileUrl;
    if (type === 'GST_CERTIFICATE') updateData.gstCertificateUrl = fileUrl;
    if (type === 'CANCELLED_CHEQUE') updateData.cancelledChequeUrl = fileUrl;
    if (type === 'SIGNATURE') updateData.signatureUrl = fileUrl;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.sellerProfile.update({
        where: { id: sellerId },
        data: updateData,
      });
    }

    return {
      success: true,
      message: 'Document uploaded successfully',
      type,
    };
  }

  // ========== Admin Functions ==========

  async getPendingReviews(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [sellers, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where: { onboardingStatus: 'UNDER_REVIEW' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
          documents: true,
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.sellerProfile.count({
        where: { onboardingStatus: 'UNDER_REVIEW' },
      }),
    ]);

    return {
      sellers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reviewSeller(sellerId: string, adminId: string, dto: AdminReviewDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: { user: true },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    if (seller.onboardingStatus !== 'UNDER_REVIEW') {
      throw new HttpException('Seller is not under review', HttpStatus.BAD_REQUEST);
    }

    const updateData: any = {
      reviewedBy: adminId,
      reviewedAt: new Date(),
    };

    if (dto.commissionRate !== undefined && dto.commissionRate !== null) {
      updateData.commissionRate = dto.commissionRate;
    }

    if (dto.decision === 'APPROVED') {
      updateData.onboardingStatus = 'APPROVED';
      updateData.verified = true;
      updateData.onboardingCompletedAt = new Date();
    } else {
      updateData.onboardingStatus = 'REJECTED';
      updateData.rejectionReason = dto.rejectionReason;
    }

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: updateData,
    });

    if (dto.decision === 'APPROVED' && seller.userId) {
      await this.prisma.wallet.upsert({
        where: { ownerId_ownerType: { ownerId: seller.userId, ownerType: 'SELLER' } },
        create: { ownerId: seller.userId, ownerType: 'SELLER', balance: 0 },
        update: {},
      });
    }

    return {
      success: true,
      message: `Seller ${dto.decision.toLowerCase()}`,
      status: updateData.onboardingStatus,
    };
  }

  async verifySignature(sellerId: string, adminId: string, decision: 'VERIFIED' | 'REJECTED', comment?: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    if (!seller.signatureUrl && !seller.signatureData) {
      throw new HttpException('No signature found for this seller', HttpStatus.BAD_REQUEST);
    }

    const updateData: any = {
      signatureVerifiedBy: adminId,
    };

    if (decision === 'VERIFIED') {
      updateData.signatureVerified = true;
      updateData.signatureVerifiedAt = new Date();
      updateData.signatureRejectionNote = null;
    } else {
      updateData.signatureVerified = false;
      updateData.signatureVerifiedAt = null;
      updateData.signatureRejectionNote = comment || 'Signature rejected by admin';
    }

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: updateData,
    });

    return {
      success: true,
      message: `Signature ${decision.toLowerCase()}`,
      signatureVerified: decision === 'VERIFIED',
    };
  }

  async getSellerOnboardingStatus(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, emailVerified: true, phoneVerified: true } },
        documents: true,
      },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    return {
      ...seller,
      completedSteps: this.getCompletedSteps(seller),
    };
  }

  private getCompletedSteps(seller: any) {
    const steps: number[] = [];

    if (seller.user?.emailVerified && seller.user?.phoneVerified) steps.push(1);
    if (seller.panNumber && (seller.gstVerified || seller.sellsNonGstProducts)) steps.push(2);
    if (seller.bankVerified && (seller.signatureUrl || seller.signatureData)) steps.push(3);

    return steps;
  }

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 40);

    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${uniqueSuffix}`;
  }

  async getProgressByEmail(email: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        onboardingStep: true,
        onboardingStatus: true,
        storeName: true,
        gstVerified: true,
        sellsNonGstProducts: true,
      },
    });

    if (!seller) {
      return { found: false };
    }

    const completedStatuses = ['APPROVED', 'UNDER_REVIEW', 'DOCUMENTS_SUBMITTED'];
    if (completedStatuses.includes(seller.onboardingStatus)) {
      return { found: true, complete: true, status: seller.onboardingStatus };
    }

    return {
      found: true,
      complete: false,
      sellerId: seller.id,
      onboardingStep: seller.onboardingStep,
      onboardingStatus: seller.onboardingStatus,
      storeName: seller.storeName,
    };
  }

  async getOnboardingStats() {
    const counts = await this.prisma.sellerProfile.groupBy({
      by: ['onboardingStatus'],
      _count: { id: true },
    });

    const result: Record<string, number> = {
      PENDING_VERIFICATION: 0,
      EMAIL_VERIFIED: 0,
      PHONE_VERIFIED: 0,
      DOCUMENTS_SUBMITTED: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    for (const row of counts) {
      result[row.onboardingStatus] = row._count.id;
    }

    return result;
  }

  async getAllSellers(filters: {
    status?: string;
    verified?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, verified, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.onboardingStatus = status;
    if (verified !== undefined) where.verified = verified;
    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
          documents: { select: { id: true, type: true, fileName: true, fileUrl: true, verified: true, verifiedAt: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    return {
      sellers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
