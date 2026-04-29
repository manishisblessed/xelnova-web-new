import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { sendFortiusOtpSms } from '../../common/helpers/fortius-sms.helper';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/auth.dto';
import type { BusinessRegisterDto } from '../business/dto/business.dto';
import { LoggingService } from '../logging/logging.service';
import { AccountUniquenessService } from '../../common/services/account-uniqueness.service';
import { Prisma, Role } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private static readonly MAX_OTP_ATTEMPTS = 5;

  /** Reused across requests — avoids constructing OAuth2Client + cold dynamic import per login. */
  private googleOAuthClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
    private readonly emailService: EmailService,
    private readonly accountUniqueness: AccountUniquenessService,
  ) {}

  async login(
    email: string,
    password: string,
    appRole: Role = 'CUSTOMER',
    ipAddress?: string,
    userAgent?: string,
  ) {
    email = email.trim().toLowerCase();
    // Look for the user inside the calling app's role bucket only —
    // a CUSTOMER row and a SELLER row may share the same email but are
    // entirely separate accounts (per-role uniqueness, see schema).
    const user = await this.prisma.user.findFirst({
      where: { email, role: appRole },
    });
    if (!user) {
      await this.loggingService.logActivity({
        type: 'AUTH',
        action: 'LOGIN_FAILED',
        message: `Failed login attempt for email: ${email} on app ${appRole}`,
        ipAddress,
        userAgent,
        status: 'failed',
        meta: { reason: 'User not found', email, appRole },
      });
      // If the email exists under a *different* role, give the operator a
      // human hint so they know to register a separate account here.
      const otherRoleHint = await this.describeOtherRoleAccount(email, appRole);
      throw new UnauthorizedException(otherRoleHint || 'Invalid email or password');
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
    const role: Role = dto.role || 'CUSTOMER';

    // Cross-role uniqueness: block new registrations if email/phone is already
    // used by ANY role (CUSTOMER, SELLER, BUSINESS, ADMIN). Existing accounts
    // created before this policy are grandfathered and continue to work.
    await this.accountUniqueness.assertEmailAvailable(dto.email);

    if (dto.phone) {
      await this.accountUniqueness.assertPhoneAvailable(dto.phone);
    }

    // Also check per-role uniqueness for clearer error messages
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, role },
    });
    if (existing) {
      throw new ConflictException(
        `An account with this email already exists for ${role.toLowerCase()}s`,
      );
    }

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findFirst({
        where: { phone: dto.phone, role },
      });
      if (phoneExists) {
        throw new ConflictException(
          `This phone number is already registered as a ${role.toLowerCase()}`,
        );
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

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

  async sendOtp(phone: string, appRole: Role = 'CUSTOMER') {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Identifier is namespaced by role so an OTP triggered from the seller
    // portal can never be consumed from the customer storefront (or vice
    // versa) — keeps the two accounts strictly separate.
    const identifier = `${appRole}:${phone}`;

    await this.prisma.otpVerification.deleteMany({
      where: { identifier, type: 'PHONE', purpose: 'LOGIN' },
    });

    await this.prisma.otpVerification.create({
      data: {
        identifier,
        type: 'PHONE',
        otp,
        purpose: 'LOGIN',
        expiresAt,
        maxAttempts: AuthService.MAX_OTP_ATTEMPTS,
      },
    });

    await sendFortiusOtpSms(phone, otp);

    return {
      message: `OTP sent to ${phone}`,
      ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string, appRole: Role = 'CUSTOMER') {
    const identifier = `${appRole}:${phone}`;
    const stored = await this.prisma.otpVerification.findFirst({
      where: { identifier, type: 'PHONE', purpose: 'LOGIN', verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!stored) {
      throw new BadRequestException('No OTP was sent to this number');
    }

    if (new Date() > stored.expiresAt) {
      await this.prisma.otpVerification.delete({ where: { id: stored.id } });
      throw new BadRequestException('OTP has expired');
    }

    if (stored.otp !== otp) {
      const newAttempts = stored.attempts + 1;
      if (newAttempts >= stored.maxAttempts) {
        await this.prisma.otpVerification.delete({ where: { id: stored.id } });
        throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
      }
      await this.prisma.otpVerification.update({
        where: { id: stored.id },
        data: { attempts: newAttempts },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otpVerification.update({
      where: { id: stored.id },
      data: { verified: true, verifiedAt: new Date() },
    });

    // Build all plausible phone variants so we can find the user regardless
    // of whether the DB stores "+919090702705" or "9090702705".
    const phoneVariants = this.getPhoneVariants(phone);

    // Look only inside the calling app's role bucket — a SELLER row sharing
    // this phone is a deliberately separate account and must NOT log the
    // customer storefront in (and vice versa).
    let user = await this.prisma.user.findFirst({
      where: { phone: { in: phoneVariants }, role: appRole },
    });

    // If no user matched in this role and we're on the seller app, allow
    // re-linking from a stray SellerProfile (legacy onboarding flow).
    if (!user && appRole === 'SELLER') {
      const sellerProfile = await this.prisma.sellerProfile.findFirst({
        where: { phone: { in: phoneVariants } },
        include: { user: true },
      });

      if (sellerProfile?.user && sellerProfile.user.role === 'SELLER') {
        user = await this.prisma.user.update({
          where: { id: sellerProfile.user.id },
          data: { phone, phoneVerified: true },
        });
      }
    }

    let createdNewPhoneUser = false;

    if (!user) {
      // Phone-only signup: auto-create user for CUSTOMER and SELLER roles.
      // CUSTOMER: email stays NULL until provided (e.g. at checkout).
      // SELLER: will be redirected to onboarding to complete profile (email, business details, etc.).
      // BUSINESS / ADMIN: require explicit registration / KYC, surface a clear error.
      if (appRole === 'BUSINESS' || appRole === 'ADMIN') {
        throw new BadRequestException(
          `No ${appRole.toLowerCase()} account is registered with this number.`,
        );
      }

      // Cross-role check: block if this phone is already used by another role
      const phoneAvailable = await this.accountUniqueness.isPhoneAvailableForNewAccount(phone);
      if (!phoneAvailable) {
        const phoneVariants = this.getPhoneVariants(phone);
        const existingAccount = await this.prisma.user.findFirst({
          where: { phone: { in: phoneVariants } },
          select: { role: true },
        });
        throw new ConflictException(
          `This phone number is already registered as a ${existingAccount?.role?.toLowerCase() || 'user'} on Xelnova. Each phone number can only be used for one account.`,
        );
      }

      const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-12), 10);
      try {
        user = await this.prisma.user.create({
          data: {
            name: '',
            email: null,
            phone,
            password: tempPassword,
            avatar: null,
            role: appRole,
            phoneVerified: true,
            authProvider: 'PHONE',
          },
        });
        createdNewPhoneUser = true;
      } catch (err: unknown) {
        const unique =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!unique) throw err;
        user = await this.prisma.user.findFirst({
          where: { phone: { in: phoneVariants }, role: appRole },
        });
        if (!user) throw err;
      }
    }

    if (!user) {
      throw new BadRequestException('Could not sign you in. Please try again.');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        authProvider: 'PHONE',
        phoneVerified: true,
        phone: user.phone ?? phone,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email ?? '', user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    const hasSellerProfile = await this.userHasSellerProfile(user.id);

    return {
      isNewUser: createdNewPhoneUser,
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

  async completePhoneRegistration(
    phone: string,
    name: string,
    email: string,
    appRole: Role = 'CUSTOMER',
  ) {
    email = email.trim().toLowerCase();
    name = name.trim();

    const identifier = `${appRole}:${phone}`;
    const verified = await this.prisma.otpVerification.findFirst({
      where: {
        identifier,
        type: 'PHONE',
        purpose: 'LOGIN',
        verified: true,
        expiresAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
      },
      orderBy: { verifiedAt: 'desc' },
    });
    if (!verified) {
      throw new BadRequestException('Phone not verified or verification expired. Please verify OTP again.');
    }
    await this.prisma.otpVerification.delete({ where: { id: verified.id } });

    // Cross-role uniqueness: block if email/phone already used by any role
    await this.accountUniqueness.assertEmailAvailable(email);
    await this.accountUniqueness.assertPhoneAvailable(phone);

    const phoneVariants = this.getPhoneVariants(phone);
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone: { in: phoneVariants }, role: appRole },
    });
    if (existingPhone) {
      throw new ConflictException(
        `An account with this phone number already exists for ${appRole.toLowerCase()}s`,
      );
    }

    const existingEmail = await this.prisma.user.findFirst({
      where: { email, role: appRole },
    });

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
        role: appRole,
        phoneVerified: true,
        authProvider: 'PHONE',
      },
    });

    if (user.role === 'SELLER') {
      await this.ensureSellerProfileForSellerUser(user.id, user.name, user.email, phone);
    }

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

  /** Verify Google ID token (Sign-In with Google credential JWT). */
  async verifyGoogleIdToken(idToken: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new UnauthorizedException('Google sign-in is not configured on the server');
    }
    if (!this.googleOAuthClient) {
      this.googleOAuthClient = new OAuth2Client(clientId);
    }
    const ticket = await this.googleOAuthClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      googleId: payload.sub || '',
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatar: payload.picture,
    };
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }, role: Role = 'CUSTOMER', ipAddress?: string, userAgent?: string) {
    googleUser.email = googleUser.email.trim().toLowerCase();

    // Look only inside the calling app's role bucket. A CUSTOMER row with
    // the same email is a deliberately separate account and must NOT be
    // promoted to SELLER (would silently merge two distinct personas).
    let user = await this.prisma.user.findFirst({
      where: { email: googleUser.email, role },
    });

    const isNewUser = !user;

    if (!user) {
      // Cross-role check: block new Google signups if email is used by another role
      await this.accountUniqueness.assertEmailAvailable(googleUser.email);

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
        message: `New user registered via Google: ${googleUser.email} (${role})`,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        userAgent,
        meta: { provider: 'google', isNewUser: true, role },
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

    if (user.role === 'SELLER') {
      await this.ensureSellerProfileForSellerUser(user.id, user.name, user.email, user.phone ?? undefined);
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const [tokens, hasSellerProfile] = await Promise.all([
      (async () => {
        const t = await this.generateTokens(user.id, user.email, user.role);
        await this.saveRefreshToken(user.id, t.refreshToken);
        return t;
      })(),
      this.userHasSellerProfile(user.id),
    ]);

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
  private async ensureSellerProfileForSellerUser(userId: string, name: string, email?: string | null, phone?: string): Promise<void> {
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
        email: email ?? null,
        phone,
        storeName: `${name || 'My'}'s Store`,
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

  private async generateTokens(userId: string, email: string | null, role: string) {
    const payload = { sub: userId, email: email ?? '', role };

    // Default access TTL bumped from 12h → 30d so dashboard users
    // (sellers / admins) aren't kicked out mid-workday. Production can
    // override via JWT_ACCESS_EXPIRES_IN env if a tighter policy is
    // required for customers later.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '30d'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '90d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Creates a `BUSINESS` platform user, an organization, and an `ORG_ADMIN` membership in one transaction.
   */
  async registerBusinessAccount(
    dto: BusinessRegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    dto.email = dto.email.trim().toLowerCase();
    dto.name = dto.name.trim();

    // Cross-role uniqueness: block if email is already used by any role
    await this.accountUniqueness.assertEmailAvailable(dto.email);

    // Also check per-role uniqueness for clearer error messages
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, role: 'BUSINESS' },
    });
    if (existing) {
      throw new ConflictException('A business account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { user, organization } = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: null,
          password: hashedPassword,
          avatar: null,
          role: 'BUSINESS',
          authProvider: 'EMAIL',
        },
      });
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName.trim(),
          legalName: dto.legalName?.trim() || null,
          gstin: dto.gstin?.trim() ? dto.gstin.trim().toUpperCase() : null,
        },
      });
      await tx.organizationMember.create({
        data: {
          userId: u.id,
          organizationId: org.id,
          role: 'ORG_ADMIN',
        },
      });
      return { user: u, organization: org };
    });

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
      organization: {
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName,
        gstin: organization.gstin,
      },
      ...tokens,
    };
  }

  /** Same as `login`, but only ever resolves the BUSINESS row for that email. */
  async loginBusiness(email: string, password: string, ipAddress?: string, userAgent?: string) {
    return this.login(email, password, 'BUSINESS', ipAddress, userAgent);
  }

  /**
   * Persist a refresh-token row whose lifetime mirrors the JWT itself
   * (`JWT_REFRESH_EXPIRES_IN`, default `90d`).
   *
   * Previously this was hard-coded to 7 days while the signed JWT was valid
   * for 90 days, so users were silently logged out every week — `/auth/refresh`
   * returned 401 (`Invalid or expired refresh token`) once the DB row expired,
   * which then cascaded into 401s on every other authenticated call (wallet,
   * notifications, orders, checkout/Pay Now, etc.).
   */
  private async saveRefreshToken(userId: string, token: string) {
    const ttl = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '90d');
    const ttlMs = AuthService.parseDurationToMs(ttl);
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  /**
   * Convert a `jsonwebtoken`-style duration string ("7d", "12h", "30m", "60s",
   * raw milliseconds, etc.) to milliseconds. Falls back to 90 days if the
   * value can't be parsed so we never accidentally save a session shorter than
   * the signed JWT.
   */
  private static parseDurationToMs(value: string | number): number {
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return NINETY_DAYS_MS;

    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);

    const match = /^(\d+)\s*(ms|s|m|h|d|w|y)$/i.exec(trimmed);
    if (!match) return NINETY_DAYS_MS;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const unitMs: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60_000,
      h: 60 * 60_000,
      d: 24 * 60 * 60_000,
      w: 7 * 24 * 60 * 60_000,
      y: 365 * 24 * 60 * 60_000,
    };
    return amount * (unitMs[unit] ?? 0) || NINETY_DAYS_MS;
  }

  async forgotPassword(email: string, appRole: Role = 'CUSTOMER') {
    const user = await this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), role: appRole },
    });
    if (!user) {
      // Don't reveal whether the email exists for this role
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    if (user.email) {
      await this.emailService.sendPasswordReset(user.email, user.name, token);
    }

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  /**
   * If a login fails on this app's role bucket but the email *does* exist
   * under another role, return a helpful message so the user knows they
   * need to register a separate account here instead of guessing the
   * password forever. Returns null when the email isn't registered at all
   * (so we keep the standard "Invalid email or password" message and don't
   * leak existence to attackers).
   */
  private async describeOtherRoleAccount(
    email: string,
    appRole: Role,
  ): Promise<string | null> {
    const other = await this.prisma.user.findFirst({
      where: { email, role: { not: appRole } },
      select: { role: true },
    });
    if (!other) return null;
    const otherRoleHuman: Record<Role, string> = {
      CUSTOMER: 'shopper',
      SELLER: 'seller',
      ADMIN: 'admin',
      BUSINESS: 'business buyer',
    };
    const thisRoleHuman: Record<Role, string> = {
      CUSTOMER: 'shopper',
      SELLER: 'seller',
      ADMIN: 'admin',
      BUSINESS: 'business buyer',
    };
    return (
      `This email is registered as a ${otherRoleHuman[other.role]} on Xelnova. ` +
      `It does not have a ${thisRoleHuman[appRole]} account here yet — please register a new ${thisRoleHuman[appRole]} account.`
    );
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
