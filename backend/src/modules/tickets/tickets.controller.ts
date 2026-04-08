import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  ReplyTicketDto,
  ForwardTicketDto,
  UpdateTicketStatusDto,
} from './dto/ticket.dto';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ═══════ Customer endpoints ═══════

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Create a support ticket (customer)' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    const ticket = await this.ticketsService.createTicket(
      userId,
      dto.subject,
      dto.message,
      dto.orderNumber,
    );
    return successResponse(ticket, 'Ticket created');
  }

  @Get('my')
  @Auth()
  @ApiOperation({ summary: 'List my tickets (customer)' })
  async getMyTickets(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.ticketsService.getCustomerTickets(userId),
      'Tickets fetched',
    );
  }

  @Get('my/:id')
  @Auth()
  @ApiOperation({ summary: 'Get ticket detail (customer)' })
  async getMyTicketDetail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return successResponse(
      await this.ticketsService.getCustomerTicketDetail(id, userId),
      'Ticket fetched',
    );
  }

  @Post('my/:id/reply')
  @Auth()
  @ApiOperation({ summary: 'Reply to a ticket (customer)' })
  async customerReply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return successResponse(
      await this.ticketsService.customerReply(id, userId, dto.message),
      'Reply sent',
    );
  }

  // ═══════ Admin endpoints ═══════

  @Get('admin')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'List all tickets (admin)' })
  async adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return successResponse(
      await this.ticketsService.getAllTickets(
        parseInt(page || '1'),
        parseInt(limit || '20'),
        status,
      ),
      'Tickets fetched',
    );
  }

  @Get('admin/:id')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Get ticket detail (admin)' })
  async adminDetail(@Param('id') id: string) {
    return successResponse(
      await this.ticketsService.getTicketDetail(id),
      'Ticket fetched',
    );
  }

  @Post('admin/:id/reply')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Reply to a ticket (admin)' })
  async adminReply(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return successResponse(
      await this.ticketsService.adminReply(id, adminId, dto.message, dto.isInternal),
      'Reply sent',
    );
  }

  @Post('admin/:id/forward')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Forward ticket to seller (admin)' })
  async forwardToSeller(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ForwardTicketDto,
  ) {
    return successResponse(
      await this.ticketsService.forwardToSeller(id, dto.sellerId, adminId, dto.note),
      'Ticket forwarded to seller',
    );
  }

  @Patch('admin/:id/status')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Update ticket status/priority (admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return successResponse(
      await this.ticketsService.updateStatus(id, dto.status, dto.priority),
      'Ticket updated',
    );
  }

  // ═══════ Seller endpoints ═══════

  @Get('seller')
  @Auth('SELLER')
  @ApiOperation({ summary: 'List tickets assigned to me (seller)' })
  async sellerList(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.ticketsService.getSellerTickets(userId),
      'Tickets fetched',
    );
  }

  @Get('seller/:id')
  @Auth('SELLER')
  @ApiOperation({ summary: 'Get ticket detail (seller)' })
  async sellerDetail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return successResponse(
      await this.ticketsService.getSellerTicketDetail(id, userId),
      'Ticket fetched',
    );
  }

  @Post('seller/:id/reply')
  @Auth('SELLER')
  @ApiOperation({ summary: 'Reply to a ticket (seller → admin)' })
  async sellerReply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return successResponse(
      await this.ticketsService.sellerReply(id, userId, dto.message),
      'Reply sent',
    );
  }
}
