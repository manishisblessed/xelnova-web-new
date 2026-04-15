import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Link ticket to an order number' })
  @IsOptional()
  @IsString()
  orderNumber?: string;
}

export class ReplyTicketDto {
  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Mark as internal note (admin only)' })
  @IsOptional()
  isInternal?: boolean;
}

export class ForwardTicketDto {
  @ApiPropertyOptional({
    description:
      'Seller user id to forward to. Omit when exactly one seller is linked to the ticket order (auto).',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ description: 'Optional note when forwarding' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] })
  @IsString()
  status: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsString()
  priority?: string;
}
