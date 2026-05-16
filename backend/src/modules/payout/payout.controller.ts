import { Controller, Get, Post, Param, Query, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PayoutReleaseService } from './payout-release.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../../common/helpers/response.helper';

@ApiTags('Payouts')
@Controller()
export class PayoutController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly release: PayoutReleaseService,
  ) {}

  // ─── Seller: list payouts still inside the 7-business-day hold window ───

  @Get('seller/payouts/held')
  @Auth('SELLER')
  @ApiOperation({ summary: "Get the seller's settlements that are still in the 7-business-day hold window" })
  async getHeldPayouts(@CurrentUser('id') userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seller) return successResponse({ payouts: [], totalHeld: 0 }, 'No seller profile');

    const payouts = await this.prisma.payout.findMany({
      where: { sellerId: seller.id, status: 'ON_HOLD', isAdvance: false },
      orderBy: { holdUntil: 'asc' },
      include: {
        order: { select: { orderNumber: true, total: true } },
      },
    });

    const totalHeld = payouts.reduce((s, p) => s + p.amount, 0);

    return successResponse(
      {
        payouts: payouts.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          orderNumber: p.order?.orderNumber ?? null,
          amount: p.amount,
          gross: p.gross,
          commission: p.commission,
          xelgoServiceCharge: p.xelgoServiceCharge,
          holdUntil: p.holdUntil,
          requestedAt: p.requestedAt,
          note: p.note,
        })),
        totalHeld,
      },
      'Held payouts retrieved',
    );
  }

  // ─── Admin: list ON_HOLD payouts + force release ───

  @Get('admin/payouts/held')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'List all settlements currently in the 7-business-day hold window' })
  async getAllHeldPayouts(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { status: 'ON_HOLD', isAdvance: false },
        orderBy: { holdUntil: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          seller: {
            select: {
              storeName: true,
              user: { select: { name: true, email: true } },
            },
          },
          order: { select: { orderNumber: true } },
        },
      }),
      this.prisma.payout.count({ where: { status: 'ON_HOLD', isAdvance: false } }),
    ]);

    return paginatedResponse(items, total, pageNum, limitNum, 'Held payouts');
  }

  @Post('admin/payouts/:id/release')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-release a single ON_HOLD payout (admin override)' })
  async releaseOne(@Param('id') id: string) {
    const released = await this.release.releaseDuePayouts([id]);
    return successResponse({ released }, released > 0 ? 'Payout released' : 'Payout not eligible for release');
  }

  @Post('admin/payouts/release-due')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger the daily release sweep (releases all due ON_HOLD payouts)' })
  async releaseDue() {
    const released = await this.release.releaseDuePayouts();
    return successResponse({ released }, `Released ${released} payout(s)`);
  }

  // ─── Admin: Holiday calendar CRUD ───

  @Get('admin/holidays')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'List configured holidays (Sunday is implicit and not stored here)' })
  async listHolidays() {
    const items = await this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    return successResponse({ items }, 'Holidays');
  }

  @Post('admin/holidays')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a holiday date (skips the payout-release cron on that day)' })
  async addHoliday(@Body() body: { date: string; name: string }) {
    if (!body?.date || !body?.name) {
      return successResponse(null, 'date and name are required');
    }
    const dateOnly = new Date(body.date);
    dateOnly.setUTCHours(0, 0, 0, 0);
    const item = await this.prisma.holiday.upsert({
      where: { date: dateOnly },
      update: { name: body.name, isActive: true },
      create: { date: dateOnly, name: body.name },
    });
    return successResponse(item, 'Holiday saved');
  }

  @Post('admin/holidays/:id/toggle')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate / deactivate a holiday without deleting it' })
  async toggleHoliday(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    const item = await this.prisma.holiday.update({
      where: { id },
      data: { isActive: !!body?.isActive },
    });
    return successResponse(item, 'Holiday updated');
  }
}
