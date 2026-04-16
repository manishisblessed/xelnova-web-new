import { Controller, Get, Post, Body, Patch, Param, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BusinessService } from './business.service';
import { AuthService } from '../auth/auth.service';
import { BusinessRegisterDto, BusinessLoginDto, UpdateOrganizationDto } from './dto/business.dto';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Business')
@Controller('business')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly authService: AuthService,
  ) {}

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '';
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a business buyer account and create an organization' })
  async register(
    @Body() dto: BusinessRegisterDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip = this.getClientIp(req);
    const result = await this.authService.registerBusinessAccount(dto, ip, userAgent);
    return successResponse(result, 'Business account created');
  }

  @Post('login')
  @ApiOperation({ summary: 'Login as a business buyer (platform Role BUSINESS only)' })
  async login(
    @Body() dto: BusinessLoginDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip = this.getClientIp(req);
    const result = await this.authService.loginBusiness(dto.email, dto.password, ip, userAgent);
    return successResponse(result, 'Login successful');
  }

  @Get('organizations')
  @Auth('BUSINESS')
  @ApiOperation({ summary: 'List organizations the current user belongs to' })
  async listOrgs(@CurrentUser('id') userId: string) {
    const data = await this.businessService.listOrganizationsForUser(userId);
    return successResponse(data, 'Organizations fetched');
  }

  @Get('organizations/:id')
  @Auth('BUSINESS')
  @ApiOperation({ summary: 'Get organization details (member only)' })
  async getOrg(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const data = await this.businessService.getOrganizationForUser(userId, id);
    return successResponse(data, 'Organization fetched');
  }

  @Patch('organizations/:id')
  @Auth('BUSINESS')
  @ApiOperation({ summary: 'Update organization (org admin only)' })
  async patchOrg(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const data = await this.businessService.updateOrganization(userId, id, dto);
    return successResponse(data, 'Organization updated');
  }
}
