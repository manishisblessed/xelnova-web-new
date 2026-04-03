import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { WalletCreditDebitDto, PayoutRequestDto } from './dto/wallet.dto';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ========== Seller Endpoints ==========

  @Get('balance')
  @Auth('SELLER')
  @ApiOperation({ summary: 'Get seller wallet balance' })
  async getBalance(@CurrentUser('id') userId: string) {
    const result = await this.walletService.getBalance(userId, 'SELLER');
    return successResponse(result, 'Balance retrieved');
  }

  @Get('transactions')
  @Auth('SELLER')
  @ApiOperation({ summary: 'Get seller wallet transactions' })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getTransactions(
      userId,
      'SELLER',
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
    return successResponse(result, 'Transactions retrieved');
  }

  @Post('payout')
  @Auth('SELLER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request payout to bank account' })
  async requestPayout(
    @CurrentUser('id') userId: string,
    @Body() dto: PayoutRequestDto,
  ) {
    const result = await this.walletService.requestPayout(userId, dto.amount, dto.notes);
    return successResponse(result, 'Payout request submitted');
  }

  // ========== Admin Endpoints ==========

  @Get('admin/all')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get all wallets (Admin only)' })
  async getAllWallets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getAllWallets(
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
    return successResponse(result, 'Wallets retrieved');
  }

  @Post('admin/credit/:walletId')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Credit a wallet (Admin only)' })
  async creditWallet(
    @Param('walletId') walletId: string,
    @Body() dto: WalletCreditDebitDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.walletService.credit(
      walletId,
      dto.amount,
      dto.description,
      adminId,
      dto.referenceType || 'MANUAL',
      dto.referenceId,
    );
    return successResponse(result, 'Wallet credited');
  }

  @Post('admin/debit/:walletId')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Debit a wallet (Admin only)' })
  async debitWallet(
    @Param('walletId') walletId: string,
    @Body() dto: WalletCreditDebitDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.walletService.debit(
      walletId,
      dto.amount,
      dto.description,
      adminId,
      dto.referenceType || 'MANUAL',
      dto.referenceId,
    );
    return successResponse(result, 'Wallet debited');
  }
}
