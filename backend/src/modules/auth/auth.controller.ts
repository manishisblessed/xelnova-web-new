import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { successResponse, errorResponse } from '../../common/helpers/response.helper';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() body: { email: string; password: string }) {
    const result = this.authService.login(body.email, body.password);
    if ('error' in result) {
      return errorResponse(result.error as string);
    }
    return successResponse(result, 'Login successful');
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  register(
    @Body() body: { name: string; email: string; phone: string; password: string },
  ) {
    const result = this.authService.register(
      body.name,
      body.email,
      body.phone,
      body.password,
    );
    if ('error' in result) {
      return errorResponse(result.error as string);
    }
    return successResponse(result, 'Registration successful');
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to phone number' })
  sendOtp(@Body() body: { phone: string }) {
    const result = this.authService.sendOtp(body.phone);
    return successResponse(result, 'OTP sent successfully');
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and login' })
  verifyOtp(@Body() body: { phone: string; otp: string }) {
    const result = this.authService.verifyOtp(body.phone, body.otp);
    if ('error' in result) {
      return errorResponse(result.error as string);
    }
    return successResponse(result, 'OTP verified successfully');
  }
}
