import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { successResponse, errorResponse } from '../../common/helpers/response.helper';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List user orders' })
  findAll() {
    return successResponse(
      this.ordersService.findAll(),
      'Orders fetched successfully',
    );
  }

  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get order detail by order number' })
  findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    const order = this.ordersService.findByOrderNumber(orderNumber);
    if (!order) {
      return errorResponse('Order not found');
    }
    return successResponse(order, 'Order fetched successfully');
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(@Body() dto: CreateOrderDto) {
    const order = this.ordersService.create(dto);
    return successResponse(order, 'Order created successfully');
  }
}
