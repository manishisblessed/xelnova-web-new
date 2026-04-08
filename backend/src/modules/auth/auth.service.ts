import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { sendFortiusOtpSms } from '../../common/helpers/fortius-sms.helper';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/auth.dto';
import { LoggingService } from '../logging/logging.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private otpStore: Map<string, { otp: string; expiresAt: number; attempts: number }> =
    new Map();
  private verifiedPhones: Map<string, number> = new Map();
  private static readonly MAX_OTP_ATTEMPTS = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    email = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.loggingService.logActivity({
        type: 'AUTH',
        action: 'LOGIN_FAILED',
        message: `Failed login attempt for email: ${email}`,
        ipAddress,
        userAgent,
        status: 'failed',
        meta: { reason: 'User not found', email },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isBanned) {
      await this.loggingService.logActivity({
        type: 'AUTH',
        action: 'LOGIN_BLOCKED',
        message: `Banned user attempted login: ${email}`,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        userAgent,
        status: 'blocked',
        meta: { reason: user.banReason },
      });
      throw new UnauthorizedException('Your account has been suspended');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.loggingService.logActivity({
        type: 'AUTH',
        action: 'LOGIN_FAILED',
        message: `Invalid password for user: ${email}`,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        userAgent,
        status: 'failed',
        meta: { reason: 'Invalid password' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.role === 'SELLER') {
      await this.ensureSellerProfileForSellerUser(user.id, user.name, user.email, user.phone ?? undefined);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { authProvider: 'EMAIL' },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    await this.loggingService.logUserLogin(user.id, user.role, ipAddress || '', userAgent || '');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.loggingService.createUserSession(user.id, tokens.accessToken, ipAddress || '', userAgent || '', expiresAt);

    const hasSellerProfile = await this.userHasSellerProfile(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        authProvider: 'EMAIL' as const,
      },
      ...tokens,
      hasSellerProfile,
    };
  }

  async register(dto: RegisterDto & { role?: Role }, ipAddress?: string, userAgent?: string) {
    dto.email = dto.email.trim().toLowerCase();
    dto.name = dto.name.trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) {
        throw new ConflictException('Phone number already registered');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const role = dto.role || 'CUSTOMER';

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone || null,
        password: hashedPassword,
        avatar: null,
        role,
        authProvider: 'EMAIL',
      },
    });

    if (user.role === 'SELLER') {
      await this.ensureSellerProfileForSellerUser(user.id, user.name, user.email, user.phone ?? undefined);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    await this.loggingService.logUserRegistration(user.id, user.role, ipAddress || '', userAgent || '');

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        authProvider: 'EMAIL' as const,
      },
      ...tokens,
    };
  }

  async sendOtp(phone: string) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    await sendFortiusOtpSms(phone, otp);
    this.otpStore.set(phone, { otp, expiresAt, attempts: 0 });

    return {
      message: `OTP sent to ${phone}`,
      ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string) {
    const stored = this.otpStore.get(phone);
    if (!stored) {
      throw new BadRequestException('No OTP was sent to this number');
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(phone);
      throw new BadRequestException('OTP has expired');
    }

    if (stored.otp !== otp) {
      stored.attempts += 1;
      if (stored.attempts >= AuthService.MAX_OTP_ATTEMPTS) {
        this.otpStore.delete(phone);
        throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
      }
      throw new BadRequestException('Invalid OTP');
    }

    this.otpStore.delete(phone);

    // Build all plausible phone variants so we can find the user regardless
    // of whether the DB stores "+919090702705" or "9090702705".
    const phoneVariants = this.getPhoneVariants(phone);

    let user = await this.prisma.user.findFirst({
      where: { phone: { in: phoneVariants } },
    });

    // If no user found by phone on User table, check SellerProfile phone and link it
    if (!user) {
      const sellerProfile = await this.prisma.sellerProfile.findFirst({
        where: { phone: { in: phoneVariants } },
        include: { user: true },
      });

      if (sellerProfile?.user) {
        user = await this.prisma.user.update({
          where: { id: sellerProfile.user.id },
          data: { phone, phoneVerified: true },
        });
      }
    }

    if (!user) {
      this.verifiedPhones.set(phone, Date.now() + 10 * 60 * 1000);
      return { isNewUser: true, phone };
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { authProvider: 'PHONE' },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    const hasSellerProfile = await this.userHasSellerProfile(user.id);

    return {
      isNewUser: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        authProvider: 'PHONE' as const,
      },
      ...tokens,
      hasSellerProfile,
    };
  }

  async completePhoneRegistration(phone: string, name: string, email: string) {
    email = email.trim().toLowerCase();
    name = name.trim();

    const expiresAt = this.verifiedPhones.get(phone);
    if (!expiresAt || Date.now() > expiresAt) {
      this.verifiedPhones.delete(phone);
      throw new BadRequestException('Phone not verified or verification expired. Please verify OTP again.');
    }
    this.verifiedPhones.delete(phone);

    const phoneVariants = this.getPhoneVariants(phone);
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone: { in: phoneVariants } },
    });
    if (existingPhone) {
      throw new ConflictException('An account with this phone number already exists');
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email } });

    if (existingEmail) {
      // Account exists (e.g. registered via Google) — link the verified phone and log them in
      if (existingEmail.isBanned) {
        throw new UnauthorizedException('Your account has been suspended');
      }

      const user = await this.prisma.user.update({
        where: { id: existingEmail.id },
        data: { phone, phoneVerified: true },
      });

      if (user.role === 'SELLER') {
        await this.ensureSellerProfileForSellerUser(user.id, user.name, user.email, phone);
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.saveRefreshToken(user.id, tokens.refreshToken);
      const hasSellerProfile = await this.userHasSellerProfile(user.id);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          authProvider: user.authProvider,
        },
        ...tokens,
        hasSellerProfile,
      };
    }

    const tempPassword = await bcrypt.hash(
      Math.random().toString(36).slice(-12),
      10,
    );
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: tempPassword,
        avatar: null,
        role: 'CUSTOMER',
        phoneVerified: true,
        authProvider: 'PHONE',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        authProvider: 'PHONE' as const,
      },
      ...tokens,
      hasSellerProfile: false,
    };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );
    await this.saveRefreshToken(stored.user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string, userId?: string, userRole?: Role, ipAddress?: string, userAgent?: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });

    if (userId) {
      await this.loggingService.logUserLogout(userId, userRole || 'CUSTOMER', ipAddress || '', userAgent || '');
    }
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }, role: Role = 'CUSTOMER', ipAddress?: string, userAgent?: string) {
    googleUser.email = googleUser.email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    const isNewUser = !user;

    if (!user) {
      const tempPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-16) + googleUser.googleId,
        10,
      );

      user = await this.prisma.user.create({
        data: {
          name: googleUser.name,
          email: googleUser.email,
          password: tempPassword,
          avatar: googleUser.avatar || null,
          role,
          emailVerified: true,
          authProvider: 'GOOGLE',
        },
      });

      await this.loggingService.logActivity({
        type: 'AUTH',
        action: 'GOOGLE_REGISTER',
        message: `New user registered via Google: ${googleUser.email}`,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        userAgent,
        meta: { provider: 'google', isNewUser: true },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          avatar: user.avatar ? undefined : googleUser.avatar,
          emailVerified: true,
          authProvider: 'GOOGLE',
        },
      });
    }

    if (role === 'SELLER') {
      if (user.role === 'ADMIN') {
        throw new UnauthorizedException(
          'This account is an administrator. Use the Admin app to sign in.',
        );
      }
      if (user.role === 'CUSTOMER') {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: 'SELLER' },
        });
      }
    }

    if (user.role === 'SELLER') {
      await this.ensureSellerProfileForSellerUser(user.id, user.name, user.email, user.phone ?? undefined);
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    await this.loggingService.logActivity({
      type: 'AUTH',
      action: 'GOOGLE_LOGIN',
      message: `User logged in via Google: ${googleUser.email}`,
      userId: user.id,
      userRole: user.role,
      ipAddress,
      userAgent,
      meta: { provider: 'google', isNewUser },
    });

    await this.loggingService.logUserLogin(user.id, user.role, ipAddress || '', userAgent || '');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.loggingService.createUserSession(user.id, tokens.accessToken, ipAddress || '', userAgent || '', expiresAt);

    const hasSellerProfile = await this.userHasSellerProfile(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        authProvider: 'GOOGLE' as const,
      },
      ...tokens,
      isNewUser,
      hasSellerProfile,
    };
  }

  private async userHasSellerProfile(userId: string): Promise<boolean> {
    const p = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return !!p;
  }

  /** Every SELLER user must have a SellerProfile row (admin /seller list uses this table). */
  private async ensureSellerProfileForSellerUser(userId: string, name: string, email?: string, phone?: string): Promise<void> {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (existing) return;

    // Check if an orphaned seller profile exists for this email (e.g. customer
    // was deleted then re-registered). Re-link it to the new user.
    if (email) {
      const orphaned = await this.prisma.sellerProfile.findUnique({ where: { email } });
      if (orphaned) {
        await this.prisma.sellerProfile.update({
          where: { id: orphaned.id },
          data: { userId },
        });
        return;
      }
    }

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 40);
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug || 'seller'}-${uniqueSuffix}`;

    await this.prisma.sellerProfile.create({
      data: {
        userId,
        email,
        phone,
        storeName: `${name}'s Store`,
        slug,
        onboardingStatus: 'EMAIL_VERIFIED',
        onboardingStep: 2,
      },
    });
  }

  /**
   * Given a phone string like "+919090702705" or "9090702705", returns all
   * plausible stored variants so lookups succeed regardless of format.
   */
  private getPhoneVariants(phone: string): string[] {
    const digits = phone.replace(/\D/g, '');
    const variants = new Set<string>();
    variants.add(phone);

    if (digits.startsWith('91') && digits.length === 12) {
      variants.add(`+${digits}`);       // +919090702705
      variants.add(digits);              // 919090702705
      variants.add(digits.slice(2));     // 9090702705
    } else if (digits.length === 10) {
      variants.add(digits);              // 9090702705
      variants.add(`+91${digits}`);      // +919090702705
      variants.add(`91${digits}`);       // 919090702705
    }

    return Array.from(variants);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    await this.emailService.sendPasswordReset(user.email, user.name, token);

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password has been reset successfully' };
  }
}
