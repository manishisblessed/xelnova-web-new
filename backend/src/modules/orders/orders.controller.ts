import { Controller, Get, Post, Patch, Param, Body, Res, Header, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service';
import { CreateOrderDto, CancelOrderDto } from './dto/order.dto';
import {
  successResponse,
} from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'List user orders' })
  async findAll(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.ordersService.findAll(userId),
      'Orders fetched successfully',
    );
  }

  @Get(':orderNumber/refund-options')
  @Auth()
  @ApiOperation({ summary: 'Get refund options for an order' })
  async getRefundOptions(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('id') userId: string,
  ) {
    const options = await this.ordersService.getRefundOptions(orderNumber, userId);
    return successResponse(options, 'Refund options fetched');
  }

  @Post(':orderNumber/cancel')
  @Auth()
  @ApiOperation({ summary: 'Cancel an order (customer)' })
  async cancelOrder(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelOrderDto,
  ) {
    const order = await this.ordersService.cancelOrder(
      orderNumber, 
      userId, 
      dto.reason, 
      'CUSTOMER',
      dto.refundTo || 'WALLET',
    );
    return successResponse(order, 'Order cancelled successfully');
  }

  @Get(':orderNumber/invoice')
  @Auth()
  @ApiOperation({ summary: 'Download order invoice PDF' })
  async downloadInvoice(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.invoiceService.generateInvoice(orderNumber, userId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${orderNumber}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':orderNumber')
  @Auth()
  @ApiOperation({ summary: 'Get order detail by order number' })
  async findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('id') userId: string,
  ) {
    const order = await this.ordersService.findByOrderNumber(
      orderNumber,
      userId,
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return successResponse(order, 'Order fetched successfully');
  }

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Create a new order' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    const order = await this.ordersService.create(userId, dto);
    return successResponse(order, 'Order created successfully');
  }
}
