import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { successResponse } from '../../common/helpers/response.helper';
import { NotificationService } from './notification.service';
import { WebPushService } from './web-push.service';
import { LoyaltyService } from './loyalty.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { FraudDetectionService } from './fraud-detection.service';
import { CodVerificationService } from './cod-verification.service';

// ─── Customer-facing endpoints ───

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly webPush: WebPushService,
  ) {}

  @Get('push/vapid-key')
  @ApiOperation({ summary: 'Get VAPID public key for push subscription' })
  async getVapidKey() {
    return successResponse({ key: this.webPush.getVapidPublicKey() }, 'VAPID key fetched');
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return successResponse(
      await this.notifications.getUserNotifications(userId, parseInt(page || '1'), parseInt(limit || '20')),
      'Notifications fetched',
    );
  }

  @Patch(':id/read')
  @Auth()
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.notifications.markAsRead(id, userId);
    return successResponse(null, 'Marked as read');
  }

  @Post('read-all')
  @Auth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    await this.notifications.markAllAsRead(userId);
    return successResponse(null, 'All marked as read');
  }

  @Post('push-token')
  @Auth()
  @ApiOperation({ summary: 'Register push notification token' })
  async registerToken(@CurrentUser('id') userId: string, @Body() body: { token: string; platform?: string }) {
    return successResponse(
      await this.notifications.registerPushToken(userId, body.token, body.platform),
      'Token registered',
    );
  }
}

// ─── Loyalty & Referral endpoints ───

@ApiTags('Loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('balance')
  @Auth()
  @ApiOperation({ summary: 'Get loyalty points balance' })
  async getBalance(@CurrentUser('id') userId: string) {
    return successResponse(await this.loyalty.getBalance(userId), 'Balance fetched');
  }

  @Get('ledger')
  @Auth()
  @ApiOperation({ summary: 'Get loyalty points history' })
  async getLedger(@CurrentUser('id') userId: string, @Query('page') page?: string) {
    return successResponse(await this.loyalty.getLedger(userId, parseInt(page || '1')), 'Ledger fetched');
  }

  @Post('redeem')
  @Auth()
  @ApiOperation({ summary: 'Redeem loyalty points for discount' })
  async redeem(@CurrentUser('id') userId: string, @Body() body: { points: number }) {
    return successResponse(await this.loyalty.redeemPoints(userId, body.points), 'Points redeemed');
  }

  @Get('referral')
  @Auth()
  @ApiOperation({ summary: 'Get or create referral code' })
  async getReferral(@CurrentUser('id') userId: string) {
    return successResponse(await this.loyalty.getOrCreateReferralCode(userId), 'Referral code fetched');
  }

  @Get('referral/stats')
  @Auth()
  @ApiOperation({ summary: 'Get referral stats' })
  async getReferralStats(@CurrentUser('id') userId: string) {
    return successResponse(await this.loyalty.getReferralStats(userId), 'Stats fetched');
  }

  @Post('referral/apply')
  @Auth()
  @ApiOperation({ summary: 'Apply a referral code' })
  async applyReferral(@CurrentUser('id') userId: string, @Body() body: { code: string }) {
    return successResponse(await this.loyalty.applyReferralCode(userId, body.code), 'Referral applied');
  }
}

// ─── COD Verification endpoints ───

@ApiTags('COD Verification')
@Controller('cod')
export class CodController {
  constructor(private readonly cod: CodVerificationService) {}

  @Post(':orderId/generate-otp')
  @Auth()
  @ApiOperation({ summary: 'Generate delivery OTP for COD order' })
  async generateOtp(@Param('orderId') orderId: string) {
    return successResponse(await this.cod.generateDeliveryOtp(orderId), 'OTP generated');
  }

  @Post(':orderId/verify-otp')
  @Auth()
  @ApiOperation({ summary: 'Verify delivery OTP for COD order' })
  async verifyOtp(@Param('orderId') orderId: string, @Body() body: { otp: string }) {
    return successResponse(await this.cod.verifyDeliveryOtp(orderId, body.otp), 'OTP verified');
  }

  @Get('risk/:userId')
  @Auth('ADMIN' as any)
  @ApiOperation({ summary: 'Assess COD risk for a user' })
  async assessRisk(@Param('userId') userId: string, @Query('amount') amount: string) {
    return successResponse(await this.cod.assessCodRisk(userId, parseFloat(amount || '0')), 'Risk assessed');
  }
}

// ─── Admin fraud / abandoned cart endpoints ───

@ApiTags('Admin Notifications')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly abandoned: AbandonedCartService,
    private readonly fraud: FraudDetectionService,
  ) {}

  @Get('abandoned-carts')
  @Auth('ADMIN' as any)
  @ApiOperation({ summary: 'Find abandoned carts' })
  async findAbandonedCarts(@Query('hours') hours?: string) {
    return successResponse(await this.abandoned.findAbandonedCarts(parseInt(hours || '24')), 'Abandoned carts found');
  }

  @Post('abandoned-carts/send-reminders')
  @Auth('ADMIN' as any)
  @ApiOperation({ summary: 'Send abandoned cart reminder emails' })
  async sendReminders(@Query('hours') hours?: string) {
    return successResponse(await this.abandoned.sendReminders(parseInt(hours || '24')), 'Reminders sent');
  }

  @Get('abandoned-carts/stats')
  @Auth('ADMIN' as any)
  @ApiOperation({ summary: 'Get abandoned cart stats' })
  async getStats() {
    return successResponse(await this.abandoned.getStats(), 'Stats fetched');
  }

  @Get('fraud-flags')
  @Auth('ADMIN' as any)
  @ApiOperation({ summary: 'Get pending fraud flags' })
  async getFraudFlags(@Query('page') page?: string, @Query('all') all?: string) {
    if (all === 'true') {
      return successResponse(await this.fraud.getAllFlags(parseInt(page || '1')), 'All flags fetched');
    }
    return successResponse(await this.fraud.getPendingFlags(parseInt(page || '1')), 'Pending flags fetched');
  }

  @Patch('fraud-flags/:id/review')
  @Auth('ADMIN' as any)
  @ApiOperation({ summary: 'Review a fraud flag' })
  async reviewFlag(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { status: 'CLEARED' | 'BLOCKED'; adminNote: string },
  ) {
    return successResponse(await this.fraud.reviewFlag(id, body.status, body.adminNote, adminId), 'Flag reviewed');
  }
}
