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
import {
  WalletCreditDebitDto,
  PayoutRequestDto,
  ManualPayoutRequestDto,
  AdvancePayoutRequestDto,
  AddMoneyDto,
  VerifyAddMoneyDto,
  BankTransferDto,
  RechargeDto,
  BillPaymentDto,
} from './dto/wallet.dto';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ========== Customer Endpoints ==========

  @Get('customer/balance')
  @Auth()
  @ApiOperation({ summary: 'Get customer wallet balance' })
  async getCustomerBalance(@CurrentUser('id') userId: string) {
    await this.walletService.getOrCreateWallet(userId, 'CUSTOMER');
    const result = await this.walletService.getBalance(userId, 'CUSTOMER');
    return successResponse(result, 'Balance retrieved');
  }

  @Get('customer/transactions')
  @Auth()
  @ApiOperation({ summary: 'Get customer wallet transactions' })
  async getCustomerTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getTransactions(
      userId,
      'CUSTOMER',
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
    return successResponse(result, 'Transactions retrieved');
  }

  @Post('customer/add-money')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Razorpay order to add money to wallet (2% convenience fee)' })
  async addMoney(@CurrentUser('id') userId: string, @Body() dto: AddMoneyDto) {
    const result = await this.walletService.createAddMoneyOrder(userId, dto.amount);
    return successResponse(result, 'Payment order created');
  }

  @Post('customer/verify-add-money')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment and credit wallet' })
  async verifyAddMoney(@CurrentUser('id') userId: string, @Body() dto: VerifyAddMoneyDto) {
    const result = await this.walletService.verifyAddMoney(userId, dto);
    return successResponse(result, 'Wallet credited successfully');
  }

  @Post('customer/transfer')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer money from wallet to bank account' })
  async bankTransfer(@CurrentUser('id') userId: string, @Body() dto: BankTransferDto) {
    const result = await this.walletService.requestBankTransfer(
      userId, dto.amount, dto.accountNumber, dto.ifscCode, dto.accountHolder,
    );
    return successResponse(result, 'Transfer request submitted');
  }

  @Get('customer/transfers')
  @Auth()
  @ApiOperation({ summary: 'Get bank transfer history' })
  async getTransfers(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getBankTransfers(userId, parseInt(page || '1'), parseInt(limit || '20'));
    return successResponse(result, 'Transfers retrieved');
  }

  @Post('customer/recharge')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mobile/DTH recharge from wallet' })
  async recharge(@CurrentUser('id') userId: string, @Body() dto: RechargeDto) {
    const result = await this.walletService.processRecharge(
      userId, dto.amount, dto.identifier, dto.operator, dto.type,
    );
    return successResponse(result, 'Recharge processing');
  }

  @Post('customer/bill-payment')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pay bill from wallet' })
  async billPayment(@CurrentUser('id') userId: string, @Body() dto: BillPaymentDto) {
    const result = await this.walletService.processBillPayment(
      userId, dto.amount, dto.billerId, dto.consumerNumber, dto.category,
    );
    return successResponse(result, 'Bill payment processing');
  }

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
  @ApiOperation({ summary: 'Request payout to bank account (legacy)' })
  async requestPayout(
    @CurrentUser('id') userId: string,
    @Body() dto: PayoutRequestDto,
  ) {
    const result = await this.walletService.requestPayout(userId, dto.amount, dto.notes);
    return successResponse(result, 'Payout request submitted');
  }

  @Get('bank-details')
  @Auth('SELLER')
  @ApiOperation({ summary: 'Get seller verified bank account details' })
  async getBankDetails(@CurrentUser('id') userId: string) {
    const result = await this.walletService.getSellerBankDetails(userId);
    return successResponse(result, 'Bank details retrieved');
  }

  @Post('payout/manual')
  @Auth('SELLER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request manual payout to verified bank account' })
  async requestManualPayout(
    @CurrentUser('id') userId: string,
    @Body() dto: ManualPayoutRequestDto,
  ) {
    const result = await this.walletService.requestManualPayout(
      userId,
      dto.amount,
      dto.acceptedTerms,
      dto.notes,
    );
    return successResponse(result, 'Manual payout request submitted');
  }

  @Post('payout/advance')
  @Auth('SELLER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request advance payout (10-50% of available balance)' })
  async requestAdvancePayout(
    @CurrentUser('id') userId: string,
    @Body() dto: AdvancePayoutRequestDto,
  ) {
    const result = await this.walletService.requestAdvancePayout(
      userId,
      dto.percentage,
      dto.acceptedTerms,
      dto.notes,
    );
    return successResponse(result, 'Advance payout request submitted');
  }

  @Get('payouts')
  @Auth('SELLER')
  @ApiOperation({ summary: 'Get seller payout history' })
  async getPayoutHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getSellerPayoutHistory(
      userId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
    return successResponse(result, 'Payout history retrieved');
  }

  // ========== Admin Endpoints ==========

  @Get('admin/all')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get all wallets (Admin only)' })
  async getAllWallets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('ownerType') ownerType?: 'ADMIN' | 'SELLER' | 'CUSTOMER',
  ) {
    const result = await this.walletService.getAllWallets(
      parseInt(page || '1'),
      parseInt(limit || '20'),
      ownerType,
    );
    return successResponse(result, 'Wallets retrieved');
  }

  @Get('admin/transactions/:walletId')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get full transaction history for a wallet (Admin only)' })
  async getWalletTransactionsAdmin(
    @Param('walletId') walletId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getWalletTransactions(
      walletId,
      parseInt(page || '1'),
      parseInt(limit || '50'),
    );
    return successResponse(result, 'Transactions retrieved');
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
