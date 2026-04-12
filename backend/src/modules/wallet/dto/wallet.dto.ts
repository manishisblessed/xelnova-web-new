import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletCreditDebitDto {
  @ApiProperty({ description: 'Amount to credit or debit' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Description of the transaction' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: ['PAYOUT', 'SHIPPING_PAYMENT', 'COMMISSION', 'MANUAL', 'REFUND', 'WALLET_TOPUP', 'TRANSFER', 'RECHARGE', 'BILL_PAYMENT'] })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID (e.g. order ID, payout ID)' })
  @IsString()
  @IsOptional()
  referenceId?: string;
}

export class PayoutRequestDto {
  @ApiProperty({ description: 'Amount to withdraw' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Notes for the payout request' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AddMoneyDto {
  @ApiProperty({ description: 'Amount to add (2% convenience fee will be charged)' })
  @IsNumber()
  @Min(10)
  amount: number;
}

export class VerifyAddMoneyDto {
  @ApiProperty()
  @IsString()
  razorpay_order_id: string;

  @ApiProperty()
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty()
  @IsString()
  razorpay_signature: string;
}

export class BankTransferDto {
  @ApiProperty({ description: 'Amount to transfer from wallet to bank' })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty()
  @IsString()
  accountNumber: string;

  @ApiProperty()
  @IsString()
  ifscCode: string;

  @ApiProperty()
  @IsString()
  accountHolder: string;
}

export class RechargeDto {
  @ApiProperty({ description: 'Recharge amount' })
  @IsNumber()
  @Min(10)
  amount: number;

  @ApiProperty({ description: 'Mobile number or DTH ID' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Operator name' })
  @IsString()
  operator: string;

  @ApiPropertyOptional({ enum: ['mobile', 'dth'] })
  @IsString()
  @IsOptional()
  type?: string;
}

export class BillPaymentDto {
  @ApiProperty({ description: 'Bill amount' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Biller name or ID' })
  @IsString()
  billerId: string;

  @ApiProperty({ description: 'Consumer number / account number' })
  @IsString()
  consumerNumber: string;

  @ApiPropertyOptional({ enum: ['electricity', 'gas', 'water', 'broadband', 'insurance', 'other'] })
  @IsString()
  @IsOptional()
  category?: string;
}
