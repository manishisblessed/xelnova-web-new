import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SellerDashboardService } from './seller-dashboard.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  SellerProductQueryDto,
  SellerOrderQueryDto,
  UpdateOrderStatusDto,
  UpdateSellerProfileDto,
  RevenueQueryDto,
} from './dto/seller-dashboard.dto';
import { successResponse, paginatedResponse, errorResponse } from '../../common/helpers/response.helper';

@ApiTags('Seller Dashboard')
@Controller('seller')
@Auth('SELLER' as any)
export class SellerDashboardController {
  constructor(private readonly service: SellerDashboardService) {}

  @Get('registration-status')
  @ApiOperation({ summary: 'Whether the current user has completed seller onboarding (SellerProfile row)' })
  async registrationStatus(@CurrentUser('id') userId: string) {
    return successResponse(await this.service.getRegistrationStatus(userId), 'Registration status');
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get seller dashboard overview' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return successResponse(await this.service.getDashboard(userId), 'Dashboard data fetched');
  }

  // ─── Products ───

  @Get('products')
  @ApiOperation({ summary: 'List seller products' })
  async getProducts(@CurrentUser('id') userId: string, @Query() query: SellerProductQueryDto) {
    const { items, total, page, limit } = await this.service.getProducts(userId, query);
    return paginatedResponse(items, total, page, limit, 'Products fetched');
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(@CurrentUser('id') userId: string, @Body() dto: CreateProductDto) {
    return successResponse(await this.service.createProduct(userId, dto), 'Product created');
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product detail' })
  async getProduct(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return successResponse(await this.service.getProductById(userId, id), 'Product fetched');
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update a product' })
  async updateProduct(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return successResponse(await this.service.updateProduct(userId, id, dto), 'Product updated');
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete a product' })
  async deleteProduct(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return successResponse(await this.service.deleteProduct(userId, id), 'Product deleted');
  }

  // ─── Orders ───

  @Get('orders')
  @ApiOperation({ summary: 'List orders containing seller products' })
  async getOrders(@CurrentUser('id') userId: string, @Query() query: SellerOrderQueryDto) {
    const { items, total, page, limit } = await this.service.getOrders(userId, query);
    return paginatedResponse(items, total, page, limit, 'Orders fetched');
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update order status' })
  async updateOrderStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return successResponse(await this.service.updateOrderStatus(userId, id, dto.status), 'Order status updated');
  }

  // ─── Revenue & Analytics ───

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue data' })
  async getRevenue(@CurrentUser('id') userId: string, @Query() query: RevenueQueryDto) {
    return successResponse(await this.service.getRevenue(userId, query), 'Revenue data fetched');
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get seller analytics' })
  async getAnalytics(@CurrentUser('id') userId: string) {
    return successResponse(await this.service.getAnalytics(userId), 'Analytics fetched');
  }

  // ─── Profile ───

  @Get('profile')
  @ApiOperation({ summary: 'Get seller profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return successResponse(await this.service.getProfile(userId), 'Profile fetched');
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update seller profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateSellerProfileDto) {
    return successResponse(await this.service.updateProfile(userId, dto), 'Profile updated');
  }
}
