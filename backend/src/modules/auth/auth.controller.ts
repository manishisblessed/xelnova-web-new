import { Controller, Post, Body, HttpCode, HttpStatus, Req, Headers, Get, UseGuards, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly frontendUrls: Record<string, string> = {
    customer: process.env.FRONTEND_URL || 'http://localhost:3000',
    seller: process.env.SELLER_URL || 'http://localhost:3003',
    admin: process.env.ADMIN_URL || 'http://localhost:3002',
  };

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '';
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ipAddress = this.getClientIp(req);
    const result = await this.authService.login(dto.email, dto.password, ipAddress, userAgent);
    return successResponse(result, 'Login successful');
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(
    @Body() dto: RegisterDto & { role?: Role },
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ipAddress = this.getClientIp(req);
    const result = await this.authService.register(dto, ipAddress, userAgent);
    return successResponse(result, 'Registration successful');
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number' })
  async sendOtp(@Body() dto: SendOtpDto) {
    const result = await this.authService.sendOtp(dto.phone);
    return successResponse(result, 'OTP sent successfully');
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(dto.phone, dto.otp);
    return successResponse(result, 'OTP verified successfully');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(dto.refreshToken);
    return successResponse(tokens, 'Tokens refreshed successfully');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: Role,
  ) {
    const ipAddress = this.getClientIp(req);
    await this.authService.logout(dto.refreshToken, userId, userRole, ipAddress, userAgent);
    return successResponse(null, 'Logged out successfully');
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth(
    @Query('role') role: string,
    @Query('redirect') redirect: string,
    @Req() req: Request,
  ) {
    // Store role and redirect in session/state for callback
    // This is handled by passport
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent: string,
    @Query('state') state: string,
  ) {
    const ipAddress = this.getClientIp(req);
    const googleUser = req.user as {
      googleId: string;
      email: string;
      name: string;
      avatar?: string;
    };

    // Parse state to get role and redirect URL
    let role: Role = 'CUSTOMER';
    let redirectUrl = this.frontendUrls.customer;
    
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.role === 'seller') {
          role = 'SELLER';
          redirectUrl = this.frontendUrls.seller;
        } else if (stateData.role === 'admin') {
          role = 'ADMIN';
          redirectUrl = this.frontendUrls.admin;
        }
        if (stateData.redirect) {
          redirectUrl = stateData.redirect;
        }
      } catch {
        // Use defaults
      }
    }

    try {
      const result = await this.authService.googleLogin(googleUser, role, ipAddress, userAgent);
      
      // Redirect to frontend with tokens
      const params = new URLSearchParams({
        token: result.accessToken,
        refreshToken: result.refreshToken,
        isNewUser: String(result.isNewUser),
      });
      
      res.redirect(`${redirectUrl}/auth/callback?${params.toString()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      res.redirect(`${redirectUrl}/login?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google ID token (for frontend SDK)' })
  async googleTokenLogin(
    @Body() body: { idToken: string; role?: string },
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ipAddress = this.getClientIp(req);
    
    // Verify the Google ID token
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    try {
      const ticket = await client.verifyIdToken({
        idToken: body.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Invalid token payload');
      }

      const googleUser = {
        googleId: payload.sub || '',
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture,
      };

      let role: Role = 'CUSTOMER';
      if (body.role === 'seller') role = 'SELLER';
      else if (body.role === 'admin') role = 'ADMIN';

      const result = await this.authService.googleLogin(googleUser, role, ipAddress, userAgent);
      return successResponse(result, 'Google login successful');
    } catch (error) {
      throw new Error('Invalid Google token');
    }
  }
}
