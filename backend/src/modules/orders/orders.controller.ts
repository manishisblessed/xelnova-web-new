import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import {
  successResponse,
  errorResponse,
} from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'List user orders' })
  async findAll(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.ordersService.findAll(userId),
      'Orders fetched successfully',
    );
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
      return errorResponse('Order not found');
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
