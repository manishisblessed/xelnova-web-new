import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { successResponse, paginatedResponse } from '../../common/helpers/response.helper';
import {
  AdminProductQueryDto, AdminUpdateProductDto,
  AdminOrderQueryDto, AdminUpdateOrderDto,
  AdminSellerQueryDto, AdminUpdateSellerDto,
  AdminCustomerQueryDto, AdminUpdateCustomerDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateBrandDto, UpdateBrandDto,
  CreateBannerDto, UpdateBannerDto,
  CreateCouponDto, UpdateCouponDto,
  CreateCommissionDto, UpdateCommissionDto,
  AdminPayoutQueryDto, UpdatePayoutDto,
  CreatePageDto, UpdatePageDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@Auth('ADMIN' as any)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard overview' })
  async getDashboard() {
    return successResponse(await this.service.getDashboard(), 'Dashboard data fetched');
  }

  // ─── Products ───
  @Get('products')
  @ApiOperation({ summary: 'List all products' })
  async getProducts(@Query() query: AdminProductQueryDto) {
    const { items, total, page, limit } = await this.service.getProducts(query);
    return paginatedResponse(items, total, page, limit, 'Products fetched');
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update product (status, feature flags)' })
  async updateProduct(@Param('id') id: string, @Body() dto: AdminUpdateProductDto) {
    return successResponse(await this.service.updateProduct(id, dto), 'Product updated');
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  async deleteProduct(@Param('id') id: string) {
    return successResponse(await this.service.deleteProduct(id), 'Product deleted');
  }

  // ─── Orders ───
  @Get('orders')
  @ApiOperation({ summary: 'List all orders' })
  async getOrders(@Query() query: AdminOrderQueryDto) {
    const { items, total, page, limit } = await this.service.getOrders(query);
    return paginatedResponse(items, total, page, limit, 'Orders fetched');
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update order status' })
  async updateOrder(@Param('id') id: string, @Body() dto: AdminUpdateOrderDto) {
    return successResponse(await this.service.updateOrder(id, dto), 'Order updated');
  }

  // ─── Sellers ───
  @Get('sellers')
  @ApiOperation({ summary: 'List all sellers' })
  async getSellers(@Query() query: AdminSellerQueryDto) {
    const { items, total, page, limit } = await this.service.getSellers(query);
    return paginatedResponse(items, total, page, limit, 'Sellers fetched');
  }

  @Patch('sellers/:id')
  @ApiOperation({ summary: 'Update seller (verify, commission)' })
  async updateSeller(@Param('id') id: string, @Body() dto: AdminUpdateSellerDto) {
    return successResponse(await this.service.updateSeller(id, dto), 'Seller updated');
  }

  // ─── Customers ───
  @Get('customers')
  @ApiOperation({ summary: 'List all customers' })
  async getCustomers(@Query() query: AdminCustomerQueryDto) {
    const { items, total, page, limit } = await this.service.getCustomers(query);
    return paginatedResponse(items, total, page, limit, 'Customers fetched');
  }

  @Patch('customers/:id')
  @ApiOperation({ summary: 'Update customer role/status' })
  async updateCustomer(@Param('id') id: string, @Body() dto: AdminUpdateCustomerDto) {
    return successResponse(await this.service.updateCustomer(id, dto), 'Customer updated');
  }

  // ─── Categories ───
  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  async getCategories() {
    return successResponse(await this.service.getCategories(), 'Categories fetched');
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return successResponse(await this.service.createCategory(dto), 'Category created');
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return successResponse(await this.service.updateCategory(id, dto), 'Category updated');
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Param('id') id: string) {
    return successResponse(await this.service.deleteCategory(id), 'Category deleted');
  }

  // ─── Brands ───
  @Get('brands')
  @ApiOperation({ summary: 'List brands' })
  async getBrands() {
    return successResponse(await this.service.getBrands(), 'Brands fetched');
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create brand' })
  async createBrand(@Body() dto: CreateBrandDto) {
    return successResponse(await this.service.createBrand(dto), 'Brand created');
  }

  @Patch('brands/:id')
  @ApiOperation({ summary: 'Update brand' })
  async updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return successResponse(await this.service.updateBrand(id, dto), 'Brand updated');
  }

  @Delete('brands/:id')
  @ApiOperation({ summary: 'Delete brand' })
  async deleteBrand(@Param('id') id: string) {
    return successResponse(await this.service.deleteBrand(id), 'Brand deleted');
  }

  // ─── Banners ───
  @Get('banners')
  @ApiOperation({ summary: 'List banners' })
  async getBanners() {
    return successResponse(await this.service.getBanners(), 'Banners fetched');
  }

  @Post('banners')
  @ApiOperation({ summary: 'Create banner' })
  async createBanner(@Body() dto: CreateBannerDto) {
    return successResponse(await this.service.createBanner(dto), 'Banner created');
  }

  @Patch('banners/:id')
  @ApiOperation({ summary: 'Update banner' })
  async updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return successResponse(await this.service.updateBanner(id, dto), 'Banner updated');
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Delete banner' })
  async deleteBanner(@Param('id') id: string) {
    return successResponse(await this.service.deleteBanner(id), 'Banner deleted');
  }

  // ─── Coupons ───
  @Get('coupons')
  @ApiOperation({ summary: 'List coupons' })
  async getCoupons() {
    return successResponse(await this.service.getCoupons(), 'Coupons fetched');
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Create coupon' })
  async createCoupon(@Body() dto: CreateCouponDto) {
    return successResponse(await this.service.createCoupon(dto), 'Coupon created');
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Update coupon' })
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return successResponse(await this.service.updateCoupon(id, dto), 'Coupon updated');
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: 'Delete coupon' })
  async deleteCoupon(@Param('id') id: string) {
    return successResponse(await this.service.deleteCoupon(id), 'Coupon deleted');
  }

  // ─── Commission Rules ───
  @Get('commission')
  @ApiOperation({ summary: 'List commission rules' })
  async getCommissionRules() {
    return successResponse(await this.service.getCommissionRules(), 'Commission rules fetched');
  }

  @Post('commission')
  @ApiOperation({ summary: 'Create commission rule' })
  async createCommissionRule(@Body() dto: CreateCommissionDto) {
    return successResponse(await this.service.createCommissionRule(dto), 'Rule created');
  }

  @Patch('commission/:id')
  @ApiOperation({ summary: 'Update commission rule' })
  async updateCommissionRule(@Param('id') id: string, @Body() dto: UpdateCommissionDto) {
    return successResponse(await this.service.updateCommissionRule(id, dto), 'Rule updated');
  }

  @Delete('commission/:id')
  @ApiOperation({ summary: 'Delete commission rule' })
  async deleteCommissionRule(@Param('id') id: string) {
    return successResponse(await this.service.deleteCommissionRule(id), 'Rule deleted');
  }

  // ─── Payouts ───
  @Get('payouts')
  @ApiOperation({ summary: 'List payouts' })
  async getPayouts(@Query() query: AdminPayoutQueryDto) {
    const { items, total, page, limit } = await this.service.getPayouts(query);
    return paginatedResponse(items, total, page, limit, 'Payouts fetched');
  }

  @Patch('payouts/:id')
  @ApiOperation({ summary: 'Update payout status' })
  async updatePayout(@Param('id') id: string, @Body() dto: UpdatePayoutDto) {
    return successResponse(await this.service.updatePayout(id, dto), 'Payout updated');
  }

  // ─── CMS Pages ───
  @Get('pages')
  @ApiOperation({ summary: 'List CMS pages' })
  async getPages() {
    return successResponse(await this.service.getPages(), 'Pages fetched');
  }

  @Post('pages')
  @ApiOperation({ summary: 'Create CMS page' })
  async createPage(@Body() dto: CreatePageDto) {
    return successResponse(await this.service.createPage(dto), 'Page created');
  }

  @Patch('pages/:id')
  @ApiOperation({ summary: 'Update CMS page' })
  async updatePage(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return successResponse(await this.service.updatePage(id, dto), 'Page updated');
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Delete CMS page' })
  async deletePage(@Param('id') id: string) {
    return successResponse(await this.service.deletePage(id), 'Page deleted');
  }

  // ─── Revenue ───
  @Get('revenue')
  @ApiOperation({ summary: 'Revenue analytics' })
  async getRevenue(@Query() query: { period?: string; dateFrom?: string; dateTo?: string }) {
    return successResponse(await this.service.getRevenue(query), 'Revenue data fetched');
  }

  // ─── Activity Logs ───
  @Get('activity')
  @ApiOperation({ summary: 'Activity logs' })
  async getActivityLogs(@Query() query: { page?: number; limit?: number; type?: string }) {
    const { items, total, page, limit } = await this.service.getActivityLogs(query);
    return paginatedResponse(items, total, page, limit, 'Activity logs fetched');
  }
}
