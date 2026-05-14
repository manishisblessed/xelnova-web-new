import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Cloudinary image URLs attached to this message' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
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

export class ForwardToCustomerDto {
  @ApiProperty({ description: 'ID of the seller ticket message to relay to the customer' })
  @IsString()
  messageId: string;

  @ApiPropertyOptional({
    description: 'Optional note shown above the quoted seller reply',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ForwardToSellerDto {
  @ApiProperty({ description: 'ID of the customer ticket message to relay to the seller' })
  @IsString()
  messageId: string;

  @ApiPropertyOptional({
    description: 'Optional note shown above the quoted customer message',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: [
      'OPEN',
      'IN_PROGRESS',
      'FORWARDED',
      'SELLER_REPLIED',
      'RESOLVED',
      'CLOSED',
    ],
  })
  @IsString()
  status: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class ChatMessageDto {
  @ApiProperty({ description: 'Customer message to the chatbot' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Order number for order-specific queries' })
  @IsOptional()
  @IsString()
  orderNumber?: string;
}
