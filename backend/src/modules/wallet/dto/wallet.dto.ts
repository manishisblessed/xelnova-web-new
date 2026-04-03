import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletCreditDebitDto {
  @ApiProperty({ description: 'Amount to credit or debit' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Description of the transaction' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: ['PAYOUT', 'SHIPPING_PAYMENT', 'COMMISSION', 'MANUAL', 'REFUND'] })
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
