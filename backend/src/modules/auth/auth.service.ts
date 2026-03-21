import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/auth.dto';
import { LoggingService } from '../logging/logging.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private otpStore: Map<string, { otp: string; expiresAt: number }> =
    new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
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

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

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
      },
      ...tokens,
    };
  }

  async register(dto: RegisterDto & { role?: Role }, ipAddress?: string, userAgent?: string) {
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
        avatar: '/images/users/default.jpg',
        role,
      },
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
      },
      ...tokens,
    };
  }

  async sendOtp(phone: string) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    this.otpStore.set(phone, { otp, expiresAt });

    // TODO: Integrate real SMS provider (Twilio, MSG91, etc.)
    return { message: `OTP sent to ${phone}`, otp }; // Remove otp from response in production
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
      throw new BadRequestException('Invalid OTP');
    }

    this.otpStore.delete(phone);

    let user = await this.prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      const tempPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-12),
        10,
      );
      user = await this.prisma.user.create({
        data: {
          name: 'User',
          email: `${phone.replace(/\D/g, '')}@temp.xelnova.in`,
          phone,
          password: tempPassword,
          avatar: '/images/users/default.jpg',
          role: 'CUSTOMER',
          phoneVerified: true,
        },
      });
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
      },
      ...tokens,
      isNewUser,
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
          avatar: googleUser.avatar || '/images/users/default.jpg',
          role,
          emailVerified: true,
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
      if (!user.avatar || user.avatar === '/images/users/default.jpg') {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { 
            avatar: googleUser.avatar,
            emailVerified: true,
          },
        });
      }
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

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
      },
      ...tokens,
      isNewUser,
    };
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
}
