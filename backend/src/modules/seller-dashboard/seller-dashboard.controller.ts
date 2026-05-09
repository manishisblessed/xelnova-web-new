import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, Header, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { SellerDashboardService } from './seller-dashboard.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  SellerProductQueryDto,
  SellerOrderQueryDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  CancelShipmentDto,
  RescheduleShipmentDto,
  UpdateSellerProfileDto,
  RevenueQueryDto,
  ProposeBrandDto,
  SettlementQueryDto,
  CreateSellerCouponDto,
  UpdateSellerCouponDto,
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

  @Get('product-attribute-presets')
  @ApiOperation({ summary: 'Admin-defined key/value presets for product information sections' })
  async getProductAttributePresets() {
    return successResponse(await this.service.getProductAttributePresets(), 'Product attribute presets fetched');
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

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get a single order containing this seller\'s lines' })
  async getOrderById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return successResponse(await this.service.getOrderById(userId, id), 'Order fetched');
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

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel an order with reason' })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return successResponse(await this.service.cancelOrder(userId, id, dto.reason), 'Order cancelled');
  }

  @Post('shipments/:shipmentId/cancel')
  @ApiOperation({ summary: 'Cancel a shipment with reason' })
  async cancelShipment(
    @CurrentUser('id') userId: string,
    @Param('shipmentId') shipmentId: string,
    @Body() dto: CancelShipmentDto,
  ) {
    return successResponse(await this.service.cancelShipment(userId, shipmentId, dto.reason), 'Shipment cancelled');
  }

  @Post('shipments/:shipmentId/reschedule')
  @ApiOperation({ summary: 'Reschedule a shipment pickup' })
  async rescheduleShipment(
    @CurrentUser('id') userId: string,
    @Param('shipmentId') shipmentId: string,
    @Body() dto: RescheduleShipmentDto,
  ) {
    return successResponse(await this.service.rescheduleShipment(userId, shipmentId, dto.newPickupDate, dto.reason), 'Shipment rescheduled');
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

  // ─── Bulk Upload ───

  @Post('products/bulk-upload')
  @ApiOperation({ summary: 'Bulk upload products from parsed CSV rows' })
  async bulkUpload(@CurrentUser('id') userId: string, @Body() body: { rows: Record<string, string>[] }) {
    return successResponse(await this.service.bulkUploadProducts(userId, body.rows), 'Bulk upload complete');
  }

  // ─── Inventory Alerts ───

  @Get('inventory-alerts')
  @ApiOperation({ summary: 'Get low-stock products' })
  async getInventoryAlerts(@CurrentUser('id') userId: string) {
    return successResponse(await this.service.getInventoryAlerts(userId), 'Inventory alerts fetched');
  }

  @Post('inventory-alerts/notify')
  @ApiOperation({ summary: 'Send low-stock email alert to seller' })
  async sendInventoryAlerts(@CurrentUser('id') userId: string) {
    return successResponse(await this.service.checkAndSendInventoryAlerts(userId), 'Alert check complete');
  }

  // ─── Brand Proposal ───

  @Post('brands/propose')
  @ApiOperation({ summary: 'Propose a new brand for admin approval' })
  async proposeBrand(@CurrentUser('id') userId: string, @Body() dto: ProposeBrandDto) {
    return successResponse(
      await this.service.proposeBrand(userId, dto.name, dto.logo, dto.authorizationCertificate),
      'Brand proposed',
    );
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get brands proposed by this seller' })
  async getSellerBrands(@CurrentUser('id') userId: string) {
    return successResponse(await this.service.getSellerBrands(userId), 'Brands fetched');
  }

  @Get('brands/listing-hint')
  @ApiOperation({
    summary: 'Whether a brand name will need dealer certificate + additional documents (registered by another seller)',
  })
  async getBrandListingHint(@CurrentUser('id') userId: string, @Query('brand') brand?: string) {
    if (brand == null || String(brand).trim() === '') {
      throw new BadRequestException('Query parameter "brand" is required');
    }
    return successResponse(await this.service.getBrandListingHint(userId, String(brand)), 'Hint');
  }

  // ─── Seller Coupons ───

  @Get('coupons')
  @ApiOperation({ summary: 'List seller coupons' })
  async getCoupons(@CurrentUser('id') userId: string) {
    return successResponse(await this.service.getSellerCoupons(userId), 'Coupons fetched');
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Create a coupon for your products or cart-level discount' })
  async createCoupon(@CurrentUser('id') userId: string, @Body() dto: CreateSellerCouponDto) {
    return successResponse(await this.service.createSellerCoupon(userId, dto), 'Coupon created');
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Update a seller coupon' })
  async updateCoupon(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSellerCouponDto,
  ) {
    return successResponse(await this.service.updateSellerCoupon(userId, id, dto), 'Coupon updated');
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: 'Delete a seller coupon' })
  async deleteCoupon(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return successResponse(await this.service.deleteSellerCoupon(userId, id), 'Coupon deleted');
  }

  // ─── Settlement Reports ───

  @Get('settlement')
  @ApiOperation({ summary: 'Get settlement/payout report' })
  async getSettlement(@CurrentUser('id') userId: string, @Query() query: SettlementQueryDto) {
    return successResponse(await this.service.getSettlementReport(userId, query), 'Settlement report fetched');
  }

  @Get('settlement/csv')
  @ApiOperation({ summary: 'Download settlement report as CSV' })
  async getSettlementCsv(
    @CurrentUser('id') userId: string,
    @Query() query: SettlementQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.service.getSettlementCsv(userId, query);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="settlement-report.csv"`,
    });
    res.send(csv);
  }

  // ─── Sales Analytics ───

  @Get('sales-analytics')
  @ApiOperation({ summary: 'Get sales analytics with charts data' })
  async getSalesAnalytics(@CurrentUser('id') userId: string, @Query('period') period?: string) {
    return successResponse(await this.service.getSalesAnalytics(userId, period), 'Sales analytics fetched');
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
