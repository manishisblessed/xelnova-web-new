import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
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
  SendOtpDto,
  VerifyOtpDto,
  AdminReviewDto,
} from './dto/seller-onboarding.dto';

@Injectable()
export class SellerOnboardingService {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
  ) {}

  // ========== OTP Services ==========

  async sendOtp(dto: SendOtpDto, ipAddress?: string) {
    const { identifier, type, purpose = 'REGISTRATION' } = dto;

    // Rate limiting: Check recent OTPs
    const recentOtps = await this.prisma.otpVerification.count({
      where: {
        identifier,
        type,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) }, // Last 1 minute
      },
    });

    if (recentOtps >= 1) {
      throw new HttpException('Please wait before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs
    await this.prisma.otpVerification.updateMany({
      where: { identifier, type, verified: false },
      data: { expiresAt: new Date() },
    });

    // Save new OTP
    await this.prisma.otpVerification.create({
      data: {
        identifier,
        type,
        otp,
        purpose,
        expiresAt,
        ipAddress,
      },
    });

    // Send OTP via email or SMS
    if (type === 'EMAIL') {
      await this.sendEmailOtp(identifier, otp);
    } else {
      await this.sendSmsOtp(identifier, otp);
    }

    return {
      success: true,
      message: `OTP sent to ${type === 'EMAIL' ? 'email' : 'phone'}`,
      expiresIn: 600, // 10 minutes in seconds
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
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
    // Use Resend or your email service
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey || resendApiKey === 're_xxxxx') {
      console.log(`[DEV] Email OTP for ${email}: ${otp}`);
      return;
    }

    try {
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
        console.error('Failed to send email:', await response.text());
      }
    } catch (error) {
      console.error('Email sending error:', error);
    }
  }

  private async sendSmsOtp(phone: string, otp: string) {
    const apiKey = process.env.FORTIUS_API_KEY;
    const senderId = process.env.FORTIUS_SENDER_ID || 'XELN';
    const templateId = process.env.FORTIUS_OTP_TEMPLATE_ID;

    if (!apiKey) {
      console.log(`[DEV] SMS OTP for ${phone}: ${otp} (FORTIUS_API_KEY not set)`);
      return;
    }

    const number = phone.replace(/^\+91/, '').replace(/\D/g, '');
    const message = `${otp} is your Xelnova verification code. Valid for 10 minutes. Do not share this code with anyone.`;

    const params = new URLSearchParams({
      apikey: apiKey,
      senderid: senderId,
      number,
      message,
    });
    if (templateId) params.set('templateid', templateId);

    try {
      const res = await fetch(`https://smsfortius.work/V2/apikey.php?${params.toString()}`);
      const data = await res.json();

      if (data.code === '011') {
        console.log(`[SMS] OTP sent to ${number} | msgid: ${data.data?.messageid}`);
      } else {
        console.error(`[SMS] Failed for ${number}:`, data);
      }
    } catch (error) {
      console.error(`[SMS] Error sending to ${number}:`, error);
    }
  }

  // ========== Captcha Services ==========

  async generateCaptcha(type: string = 'ROCK_COUNT') {
    const sessionId = uuidv4();
    let puzzleData: any;
    let answer: string;

    if (type === 'ROCK_COUNT') {
      const count = Math.floor(Math.random() * 5) + 2; // 2-6 rocks
      answer = count.toString();
      puzzleData = {
        type: 'ROCK_COUNT',
        instruction: 'Match the number of rocks with the number on the left',
        images: this.generateRockImages(count),
        options: [count - 1, count, count + 1].filter(n => n > 0).sort(() => Math.random() - 0.5),
      };
    } else {
      const number = Math.floor(Math.random() * 9) + 1;
      answer = number.toString();
      puzzleData = {
        type: 'NUMBER_MATCH',
        instruction: 'Select the image that matches the number shown',
        targetNumber: number,
        options: this.generateNumberOptions(number),
      };
    }

    await this.prisma.captchaSession.create({
      data: {
        sessionId,
        puzzleType: type,
        answer,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    return {
      sessionId,
      puzzle: puzzleData,
      expiresIn: 300,
    };
  }

  async verifyCaptcha(sessionId: string, answer: string) {
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

    return {
      success: true,
      captchaToken,
    };
  }

  private generateRockImages(count: number) {
    // Returns placeholder image URLs - in production, use actual rock images
    return Array(count).fill(null).map((_, i) => ({
      id: i,
      url: `/api/captcha/rock-${i % 5}.png`,
    }));
  }

  private generateNumberOptions(target: number) {
    const options = [target];
    while (options.length < 4) {
      const num = Math.floor(Math.random() * 9) + 1;
      if (!options.includes(num)) options.push(num);
    }
    return options.sort(() => Math.random() - 0.5).map(n => ({
      value: n,
      imageUrl: `/api/captcha/number-${n}.png`,
    }));
  }

  // ========== Onboarding Steps ==========

  async createSellerAccount(dto: Step1AccountDto, ipAddress?: string, userAgent?: string) {
    // Verify email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existingUser) {
      throw new HttpException(
        existingUser.email === dto.email ? 'Email already registered' : 'Phone number already registered',
        HttpStatus.CONFLICT,
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user and seller profile in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
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

      const slug = this.generateSlug(dto.fullName);
      
      const sellerProfile = await tx.sellerProfile.create({
        data: {
          userId: user.id,
          storeName: dto.fullName + "'s Store",
          slug,
          onboardingStatus: 'EMAIL_VERIFIED',
          onboardingStep: 2,
        },
      });

      return { user, sellerProfile };
    });

    return {
      success: true,
      message: 'Account created successfully',
      userId: result.user.id,
      sellerId: result.sellerProfile.id,
      nextStep: 2,
    };
  }

  async updateTaxDetails(sellerId: string, dto: Step2TaxDetailsDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new HttpException('Seller not found', HttpStatus.NOT_FOUND);
    }

    let gstVerified = false;
    let gstVerifiedData = null;

    // Verify GST if provided
    if (dto.gstNumber && !dto.sellsNonGstProducts) {
      try {
        const gstData = await this.verificationService.verifyGSTIN(dto.gstNumber, seller.userId);
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

    // Verify IFSC
    let bankData;
    try {
      bankData = await this.verificationService.verifyIFSC(dto.ifscCode, seller.userId);
    } catch (error) {
      throw new HttpException(`IFSC verification failed: ${error.message}`, HttpStatus.BAD_REQUEST);
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
        bankName: bankData.BANK,
        bankBranch: bankData.BRANCH,
        onboardingStatus: 'DOCUMENTS_SUBMITTED',
        onboardingStep: 7,
      },
    });

    return {
      success: true,
      message: 'Bank details verified and saved',
      bankName: bankData.BANK,
      bankBranch: bankData.BRANCH,
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

    // Update seller profile with document URL
    const updateData: any = {};
    if (type === 'PAN_CARD') updateData.panDocumentUrl = fileUrl;
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
    const steps = [];
    
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
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
          documents: { select: { id: true, type: true, verified: true } },
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
