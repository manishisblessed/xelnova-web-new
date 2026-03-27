import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
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
  Step2TaxDetailsDto,
  Step3StoreDetailsDto,
  Step4AddressDto,
  Step5ShippingDto,
  Step6BankDetailsDto,
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

    // Rate limiting: only count unverified OTPs sent in the last 60 seconds
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

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs
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

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true, verifiedAt: new Date() },
    });

    // Generate verification token
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
        from: process.env.EMAIL_FROM || 'Xelnova <noreply@xelnova.com>',
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
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      throw new HttpException('reCAPTCHA is not configured. Set RECAPTCHA_SECRET_KEY on the backend.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await res.json();

    if (!data.success) {
      throw new HttpException('reCAPTCHA verification failed. Please try again.', HttpStatus.BAD_REQUEST);
    }

    const captchaToken = uuidv4();
    return { success: true, captchaToken };
  }

  // ========== Onboarding Steps ==========

  async createSellerAccount(dto: Step1AccountDto, ipAddress?: string, userAgent?: string) {
    dto.email = dto.email.trim().toLowerCase();
    dto.fullName = dto.fullName.trim();
    dto.phone = dto.phone.trim();

    // Check for an existing SellerProfile by email (independent of User)
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

      // Early-stage seller profile exists — allow re-registration (user has
      // re-verified email/phone via OTP in this flow, so reset the profile).
      const hashedPassword = await bcrypt.hash(dto.password, 12);
      const user = await this.findOrCreateUser(dto, hashedPassword, ipAddress);

      await this.prisma.sellerProfile.update({
        where: { id: existingSeller.id },
        data: {
          userId: user.id,
          email: dto.email,
          phone: dto.phone,
          storeName: dto.fullName + "'s Store",
          onboardingStatus: 'EMAIL_VERIFIED',
          onboardingStep: 2,
        },
      });

      return {
        success: true,
        message: 'Seller registration reset',
        userId: user.id,
        sellerId: existingSeller.id,
        nextStep: 2,
      };
    }

    // No existing seller profile — create fresh
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

  /**
   * Finds an existing User by email or creates a new one. Updates role to
   * SELLER and refreshes login metadata in both cases.
   */
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

  async updateTaxDetails(sellerId: string, dto: Step2TaxDetailsDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    let gstVerified = false;
    let gstVerifiedData: any = null;

    // Verify GST if provided
    if (dto.gstNumber && !dto.sellsNonGstProducts) {
      try {
        const gstData = await this.verificationService.verifyGSTIN(dto.gstNumber, seller.userId ?? undefined);
        gstVerified = true;
        gstVerifiedData = gstData;
      } catch (error) {
        throw new HttpException(`GST verification failed: ${error.message}`, HttpStatus.BAD_REQUEST);
      }
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
        onboardingStep: 3,
      },
    });

    return {
      success: true,
      message: 'Tax details updated',
      gstVerified,
      nextStep: 3,
    };
  }

  async updateStoreDetails(sellerId: string, dto: Step3StoreDetailsDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    const slug = this.generateSlug(dto.storeName);

    // Check if slug is unique
    const existingSlug = await this.prisma.sellerProfile.findFirst({
      where: { slug, id: { not: sellerId } },
    });

    if (existingSlug) {
      throw new HttpException('Store name already taken', HttpStatus.CONFLICT);
    }

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        storeName: dto.storeName,
        slug,
        description: dto.description,
        businessType: dto.businessType,
        businessCategory: dto.businessCategory,
        onboardingStep: 4,
      },
    });

    return {
      success: true,
      message: 'Store details updated',
      slug,
      nextStep: 4,
    };
  }

  async updateAddress(sellerId: string, dto: Step4AddressDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        businessPincode: dto.pincode,
        businessCity: dto.city,
        businessState: dto.state,
        businessAddress: dto.address,
        location: `${dto.city}, ${dto.state}`,
        onboardingStep: 5,
      },
    });

    return {
      success: true,
      message: 'Address updated',
      nextStep: 5,
    };
  }

  async updateShippingPreferences(sellerId: string, dto: Step5ShippingDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        shippingMethod: dto.shippingMethod,
        offerFreeDelivery: dto.offerFreeDelivery,
        deliveryCharge1to3Days: dto.deliveryCharge1to3Days,
        deliveryCharge3PlusDays: dto.deliveryCharge3PlusDays,
        onboardingStep: 6,
      },
    });

    return {
      success: true,
      message: 'Shipping preferences updated',
      nextStep: 6,
    };
  }

  async updateBankDetails(sellerId: string, dto: Step6BankDetailsDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: { user: true },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    let bankData;
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

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        bankAccountName: dto.accountHolderName,
        bankAccountNumber: dto.accountNumber,
        bankIfscCode: dto.ifscCode,
        bankVerified: true,
        bankVerifiedAt: new Date(),
        bankVerifiedData: bankData as any,
        bankVerifiedName: bankData.nameAtBank,
        bankName: bankData.bankName || '',
        bankBranch: bankData.branch || '',
        onboardingStatus: 'DOCUMENTS_SUBMITTED',
        onboardingStep: 7,
      },
    });

    return {
      success: true,
      message: 'Bank account verified — ₹1 credited to account',
      bankName: bankData.bankName,
      branch: bankData.branch,
      city: bankData.city,
      nameAtBank: bankData.nameAtBank,
    };
  }

  async submitForReview(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: { documents: true },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    // Validate all required fields
    const missingFields: string[] = [];
    if (!seller.storeName) missingFields.push('storeName');
    if (!seller.panNumber) missingFields.push('panNumber');
    if (!seller.bankAccountNumber) missingFields.push('bankAccountNumber');
    if (!seller.businessAddress) missingFields.push('businessAddress');
    if (!seller.businessCity) missingFields.push('businessCity');
    if (!seller.businessState) missingFields.push('businessState');
    if (!seller.businessPincode) missingFields.push('businessPincode');

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

    // Upsert document
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

    // TODO: Send notification email to seller

    return {
      success: true,
      message: `Seller ${dto.decision.toLowerCase()}`,
      status: updateData.onboardingStatus,
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
    if (seller.storeName && seller.slug) steps.push(3);
    if (seller.businessAddress && seller.businessCity && seller.businessPincode) steps.push(4);
    if (seller.shippingMethod) steps.push(5);
    if (seller.bankVerified) steps.push(6);
    
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
