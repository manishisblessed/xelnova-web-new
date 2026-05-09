import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ReportsService } from './reports.service';
import { DuplicateListingService } from './duplicate-listing.service';
import { PricingCheckService } from './pricing-check.service';
import { SplitPaymentService } from '../payment/split-payment.service';
import { ReviewsService } from '../reviews/reviews.service';
import { ShippingService } from '../shipping/shipping.service';
import { AccountUniquenessService } from '../../common/services/account-uniqueness.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { successResponse, paginatedResponse } from '../../common/helpers/response.helper';
import { getClientIp } from '../../common/helpers/client-ip';
import {
  AdminProductQueryDto, AdminUpdateProductDto, AdminApproveProductDto,
  AdminOrderQueryDto, AdminUpdateOrderDto, AdminUpdateShipmentDto,
  AdminSellerQueryDto, AdminUpdateSellerDto,
  AdminCustomerQueryDto, AdminUpdateCustomerDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateBrandDto, UpdateBrandDto,
  CreateBannerDto, UpdateBannerDto,
  CreateCouponDto, UpdateCouponDto,
  CreateCommissionDto, UpdateCommissionDto,
  AdminPayoutQueryDto, UpdatePayoutDto,
  CreateRoleDto, UpdateRoleDto,
  CreateSubAdminDto, UpdateSubAdminDto,
  CreatePageDto, UpdatePageDto,
  AdminSiteSettingsDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@Auth('ADMIN' as any)
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly reports: ReportsService,
    private readonly duplicates: DuplicateListingService,
    private readonly pricing: PricingCheckService,
    private readonly splitPayment: SplitPaymentService,
    private readonly reviewsService: ReviewsService,
    private readonly shippingService: ShippingService,
    private readonly accountUniqueness: AccountUniquenessService,
  ) {}

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

  @Get('products/pending')
  @ApiOperation({ summary: 'List products pending approval' })
  async getPendingProducts(@Query() query: AdminProductQueryDto) {
    const { items, total, page, limit } = await this.service.getProducts({ ...query, status: 'PENDING' });
    return paginatedResponse(items, total, page, limit, 'Pending products fetched');
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get one product (full detail for review / approval)' })
  async getProduct(@Param('id') id: string) {
    return successResponse(await this.service.getProductById(id), 'Product fetched');
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update product (status, feature flags)' })
  async updateProduct(@Param('id') id: string, @Body() dto: AdminUpdateProductDto) {
    return successResponse(await this.service.updateProduct(id, dto), 'Product updated');
  }

  @Post('products/:id/approve')
  @ApiOperation({
    summary:
      'Approve a pending product (admin sets commission %, optional bestseller rank, and replacement eligibility/window)',
  })
  async approveProduct(@Param('id') id: string, @Body() body: AdminApproveProductDto = {} as AdminApproveProductDto) {
    return successResponse(
      await this.service.updateProduct(id, {
        status: 'ACTIVE',
        isActive: true,
        commissionRate: body.commissionRate,
        bestSellersRank: body.bestSellersRank,
        isReplaceable: body.isReplaceable,
        replacementWindow: body.replacementWindow,
        returnPolicyPreset: body.returnPolicyPreset,
        returnWindowDays: body.returnWindowDays,
        warrantyDurationValue: body.warrantyDurationValue,
        warrantyDurationUnit: body.warrantyDurationUnit,
      }),
      'Product approved and now live',
    );
  }

  @Post('products/:id/reject')
  @ApiOperation({ summary: 'Reject a pending product' })
  async rejectProduct(@Param('id') id: string, @Body() body: { rejectionReason?: string }) {
    return successResponse(
      await this.service.updateProduct(id, { status: 'REJECTED', rejectionReason: body.rejectionReason }),
      'Product rejected',
    );
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  async deleteProduct(@Param('id') id: string) {
    return successResponse(await this.service.deleteProduct(id), 'Product deleted');
  }

  @Post('products/:id/approve-changes')
  @ApiOperation({ summary: 'Approve pending changes for a product' })
  async approvePendingChanges(@Param('id') id: string) {
    return successResponse(await this.service.approvePendingChanges(id), 'Pending changes approved');
  }

  @Post('products/:id/reject-changes')
  @ApiOperation({ summary: 'Reject pending changes for a product' })
  async rejectPendingChanges(@Param('id') id: string, @Body() body: { reason?: string }) {
    return successResponse(await this.service.rejectPendingChanges(id, body.reason), 'Pending changes rejected');
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

  @Patch('orders/:id/shipment')
  @ApiOperation({ summary: 'Update shipment details (AWB, carrier, tracking)' })
  async updateShipment(@Param('id') orderId: string, @Body() dto: AdminUpdateShipmentDto) {
    return successResponse(await this.service.updateShipment(orderId, dto), 'Shipment updated');
  }

  // ─── Sellers ───
  @Get('sellers')
  @ApiOperation({ summary: 'List all sellers' })
  async getSellers(@Query() query: AdminSellerQueryDto) {
    const { items, total, page, limit } = await this.service.getSellers(query);
    return paginatedResponse(items, total, page, limit, 'Sellers fetched');
  }

  @Patch('sellers/:id')
  @ApiOperation({ summary: 'Update seller (verify, commission, suspend)' })
  async updateSeller(
    @Param('id') id: string,
    @Body() dto: AdminUpdateSellerDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(await this.service.updateSeller(id, dto, audit), 'Seller updated');
  }

  @Delete('sellers/:id')
  @ApiOperation({ summary: 'Delete seller (no products, no buyer orders)' })
  async deleteSeller(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(await this.service.deleteSeller(id, adminId, audit), 'Seller deleted');
  }

  // ─── Customers ───
  @Get('customers')
  @ApiOperation({ summary: 'List all customers' })
  async getCustomers(@Query() query: AdminCustomerQueryDto) {
    const { items, total, page, limit } = await this.service.getCustomers(query);
    return paginatedResponse(items, total, page, limit, 'Customers fetched');
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get full 360° view for one customer (orders, returns, tickets, wallet)' })
  async getCustomerDetail(@Param('id') id: string) {
    return successResponse(await this.service.getCustomerById(id), 'Customer details fetched');
  }

  @Patch('customers/:id')
  @ApiOperation({ summary: 'Update customer role/status, suspend' })
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: AdminUpdateCustomerDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(await this.service.updateCustomer(id, dto, audit), 'Customer updated');
  }

  @Delete('customers/:id')
  @ApiOperation({ summary: 'Delete customer (no orders)' })
  async deleteCustomer(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(await this.service.deleteCustomer(id, adminId, audit), 'Customer deleted');
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

  @Get('brands/pending')
  @ApiOperation({ summary: 'List brands pending approval' })
  async getPendingBrands() {
    return successResponse(await this.service.getPendingBrands(), 'Pending brands fetched');
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

  @Post('coupons/:id/approve')
  @ApiOperation({ summary: 'Approve a seller-submitted coupon (platform admins)' })
  async approveSellerCoupon(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return successResponse(await this.service.approveSellerCoupon(id, adminId), 'Coupon approved');
  }

  @Post('coupons/:id/reject')
  @ApiOperation({ summary: 'Reject a seller-submitted coupon' })
  async rejectSellerCoupon(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason?: string },
  ) {
    return successResponse(await this.service.rejectSellerCoupon(id, adminId, body.reason), 'Coupon rejected');
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

  // ─── Admin Roles ───
  @Get('roles')
  @ApiOperation({ summary: 'List admin roles' })
  @RequirePermission({ section: 'roles', action: 'view' })
  async getRoles() {
    return successResponse(await this.service.getRoles(), 'Roles fetched');
  }

  @Get('roles/templates')
  @ApiOperation({ summary: 'Get role templates for quick role creation' })
  @RequirePermission({ section: 'roles', action: 'view' })
  async getRoleTemplates() {
    return successResponse(await this.service.getRoleTemplates(), 'Role templates fetched');
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create admin role' })
  @RequirePermission({ section: 'roles', action: 'create' })
  async createRole(@Body() dto: CreateRoleDto) {
    return successResponse(await this.service.createRole(dto), 'Role created');
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Update admin role' })
  @RequirePermission({ section: 'roles', action: 'edit' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return successResponse(await this.service.updateRole(id, dto), 'Role updated');
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete admin role' })
  @RequirePermission({ section: 'roles', action: 'delete' })
  async deleteRole(@Param('id') id: string) {
    return successResponse(await this.service.deleteRole(id), 'Role deleted');
  }

  // ─── Sub-admins ───
  // A "sub-admin" is a user with `role = ADMIN` and an assigned `AdminRole`.
  // The original super-admin (no AdminRole link) keeps unrestricted access.

  @Get('sub-admins')
  @ApiOperation({ summary: 'List all sub-admins (admin users)' })
  async getSubAdmins() {
    return successResponse(await this.service.getSubAdmins(), 'Sub-admins fetched');
  }

  @Post('sub-admins')
  @ApiOperation({ summary: 'Create a new sub-admin and assign a role' })
  async createSubAdmin(
    @Body() dto: CreateSubAdminDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(await this.service.createSubAdmin(dto, audit), 'Sub-admin created');
  }

  @Patch('sub-admins/:id')
  @ApiOperation({ summary: 'Update a sub-admin (rename, change role, activate/deactivate)' })
  async updateSubAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateSubAdminDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(await this.service.updateSubAdmin(id, dto, audit), 'Sub-admin updated');
  }

  @Post('sub-admins/:id/reset-password')
  @ApiOperation({ summary: 'Generate a new temporary password for a sub-admin' })
  async resetSubAdminPassword(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(
      await this.service.resetSubAdminPassword(id, audit),
      'Temporary password generated',
    );
  }

  @Delete('sub-admins/:id')
  @ApiOperation({ summary: 'Remove sub-admin access (demote to customer)' })
  async deleteSubAdmin(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(await this.service.deleteSubAdmin(id, audit), 'Sub-admin removed');
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

  // ─── Site settings ───
  @Get('settings')
  @ApiOperation({ summary: 'Get site settings' })
  async getSiteSettings() {
    return successResponse(await this.service.getSiteSettings(), 'Settings fetched');
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update site settings' })
  async updateSiteSettings(
    @Body() dto: AdminSiteSettingsDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') adminRole: Role,
    @Req() req: Request,
  ) {
    const audit = {
      adminId,
      adminRole,
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    };
    return successResponse(await this.service.updateSiteSettings(dto, audit), 'Settings updated');
  }

  // ─── GST Report ───
  @Get('reports/gst')
  @ApiOperation({ summary: 'Get GST report' })
  async getGstReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return successResponse(await this.reports.getGstReport({ dateFrom, dateTo }), 'GST report fetched');
  }

  @Get('reports/gst/csv')
  @ApiOperation({ summary: 'Download GST report as CSV' })
  async getGstCsv(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Res() res?: Response) {
    const csv = await this.reports.getGstReportCsv({ dateFrom, dateTo });
    res!.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="gst-report.csv"' });
    res!.send(csv);
  }

  // ─── TDS Report ───
  @Get('reports/tds')
  @ApiOperation({ summary: 'Get TDS report' })
  async getTdsReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return successResponse(await this.reports.getTdsReport({ dateFrom, dateTo }), 'TDS report fetched');
  }

  @Get('reports/tds/csv')
  @ApiOperation({ summary: 'Download TDS report as CSV' })
  async getTdsCsv(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Res() res?: Response) {
    const csv = await this.reports.getTdsReportCsv({ dateFrom, dateTo });
    res!.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="tds-report.csv"' });
    res!.send(csv);
  }

  // ─── Refund Report ───
  @Get('reports/refunds')
  @ApiOperation({ summary: 'Get refund report' })
  async getRefundReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return successResponse(await this.reports.getRefundReport({ dateFrom, dateTo }), 'Refund report fetched');
  }

  @Get('reports/refunds/csv')
  @ApiOperation({ summary: 'Download refund report as CSV' })
  async getRefundCsv(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Res() res?: Response) {
    const csv = await this.reports.getRefundReportCsv({ dateFrom, dateTo });
    res!.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="refund-report.csv"' });
    res!.send(csv);
  }

  // ─── Sales Report ───
  @Get('reports/sales')
  @ApiOperation({ summary: 'Get sales report' })
  async getSalesReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return successResponse(await this.reports.getSalesReport({ dateFrom, dateTo }), 'Sales report fetched');
  }

  @Get('reports/sales/csv')
  @ApiOperation({ summary: 'Download sales report as CSV' })
  async getSalesCsv(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Res() res?: Response) {
    const csv = await this.reports.getSalesReportCsv({ dateFrom, dateTo });
    res!.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="sales-report.csv"' });
    res!.send(csv);
  }

  // ─── Inventory Report ───
  @Get('reports/inventory')
  @ApiOperation({ summary: 'Get inventory report' })
  async getInventoryReport() {
    return successResponse(await this.reports.getInventoryReport(), 'Inventory report fetched');
  }

  @Get('reports/inventory/csv')
  @ApiOperation({ summary: 'Download inventory report as CSV' })
  async getInventoryCsv(@Res() res?: Response) {
    const csv = await this.reports.getInventoryReportCsv();
    res!.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="inventory-report.csv"' });
    res!.send(csv);
  }

  // ─── Seller Performance Report ───
  @Get('reports/sellers')
  @ApiOperation({ summary: 'Get seller performance report' })
  async getSellerPerformanceReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return successResponse(await this.reports.getSellerPerformanceReport({ dateFrom, dateTo }), 'Seller performance report fetched');
  }

  @Get('reports/sellers/csv')
  @ApiOperation({ summary: 'Download seller performance report as CSV' })
  async getSellerPerformanceCsv(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Res() res?: Response) {
    const csv = await this.reports.getSellerPerformanceReportCsv({ dateFrom, dateTo });
    res!.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="seller-performance-report.csv"' });
    res!.send(csv);
  }

  // ─── Coupon Usage Report ───
  @Get('reports/coupons')
  @ApiOperation({ summary: 'Get coupon usage report' })
  async getCouponUsageReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return successResponse(await this.reports.getCouponUsageReport({ dateFrom, dateTo }), 'Coupon usage report fetched');
  }

  @Get('reports/coupons/csv')
  @ApiOperation({ summary: 'Download coupon usage report as CSV' })
  async getCouponUsageCsv(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Res() res?: Response) {
    const csv = await this.reports.getCouponUsageReportCsv({ dateFrom, dateTo });
    res!.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="coupon-usage-report.csv"' });
    res!.send(csv);
  }

  // ─── Duplicate Listings ───
  @Get('duplicates')
  @ApiOperation({ summary: 'Scan for duplicate product listings' })
  async scanDuplicates() {
    return successResponse(await this.duplicates.scanDuplicates(), 'Duplicate scan complete');
  }

  @Post('duplicates/:productId/hide')
  @ApiOperation({ summary: 'Hide a duplicate product listing' })
  async hideDuplicate(@Param('productId') productId: string) {
    return successResponse(await this.duplicates.hideProduct(productId), 'Product hidden');
  }

  // ─── Pricing Checks ───
  @Get('pricing-flags')
  @ApiOperation({ summary: 'Scan for pricing anomalies' })
  async scanPricing() {
    return successResponse(await this.pricing.scanPricingIssues(), 'Pricing scan complete');
  }

  // ─── Split Payment / Advance Payout ───
  @Post('payouts/advance')
  @ApiOperation({ summary: 'Create advance payout to seller' })
  async createAdvancePayout(@Body() body: { sellerId: string; amount: number; orderId?: string; note?: string }) {
    return successResponse(
      await this.splitPayment.createAdvancePayout(body.sellerId, body.amount, body.orderId, body.note),
      'Advance payout created',
    );
  }

  @Get('orders/:orderId/seller-shares')
  @ApiOperation({ summary: 'Compute seller shares for an order' })
  async getSellerShares(@Param('orderId') orderId: string) {
    return successResponse(await this.splitPayment.computeSellerShares(orderId), 'Seller shares computed');
  }

  @Post('orders/:orderId/settle')
  @ApiOperation({ summary: 'Create settlement payouts for all sellers in an order' })
  async settleOrder(@Param('orderId') orderId: string) {
    return successResponse(await this.splitPayment.settleOrder(orderId), 'Order settled');
  }

  // ─── Reviews ───
  @Get('reviews')
  @ApiOperation({ summary: 'List all reviews (with filters)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'moderationStatus',
    required: false,
    description: 'Filter: PENDING | APPROVED | REJECTED (preferred)',
  })
  @ApiQuery({ name: 'approved', required: false, description: 'Deprecated: true = APPROVED only' })
  @ApiQuery({ name: 'search', required: false })
  async getReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('moderationStatus') moderationStatus?: string,
    @Query('approved') approved?: string,
    @Query('search') search?: string,
  ) {
    let ms = moderationStatus as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
    if (!ms && approved !== undefined) {
      ms = approved === 'true' ? 'APPROVED' : undefined;
    }
    const { items, total, page: p, limit: l } = await this.reviewsService.findAllForAdmin({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      moderationStatus: ms,
      search,
    });
    return paginatedResponse(items, total, p, l, 'Reviews fetched');
  }

  @Get('reviews/pending')
  @ApiOperation({ summary: 'List reviews pending approval' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPendingReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { items, total, page: p, limit: l } = await this.reviewsService.findAllForAdmin({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      moderationStatus: 'PENDING',
    });
    return paginatedResponse(items, total, p, l, 'Pending reviews fetched');
  }

  @Post('reviews/:id/approve')
  @ApiOperation({ summary: 'Approve a review' })
  async approveReview(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return successResponse(await this.reviewsService.approveReview(id, adminId), 'Review approved');
  }

  @Post('reviews/:id/reject')
  @ApiOperation({ summary: 'Reject a review (hidden publicly; audit retained)' })
  async rejectReview(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason?: string },
  ) {
    return successResponse(await this.reviewsService.rejectReview(id, adminId, body.reason), 'Review rejected');
  }

  // ─── Shipping / Xelgo ───

  @Get('shipping/test-xelgo')
  @ApiOperation({ summary: 'Test Xelgo (Delhivery) connection and configuration' })
  async testXelgoConnection() {
    return successResponse(
      await this.shippingService.testXelgoConnection(),
      'Xelgo connection test completed',
    );
  }

  @Get('shipping/test-pickup')
  @ApiOperation({
    summary:
      'Test Xelgo (Delhivery) pickup scheduling for next business day at the configured warehouse',
  })
  async testXelgoPickup() {
    return successResponse(
      await this.shippingService.testXelgoPickup(),
      'Pickup test completed',
    );
  }

  // ─── Account Security Audit ───

  @Get('security/duplicate-identifiers')
  @ApiOperation({
    summary: 'Audit duplicate identifiers across accounts',
    description:
      'Returns a report of accounts that share email, phone, GST, bank account, PAN, or Aadhaar numbers. ' +
      'Useful for identifying accounts created before cross-role uniqueness enforcement was added.',
  })
  async getDuplicateIdentifiersReport() {
    const report = await this.accountUniqueness.getDuplicateIdentifiersReport();
    const hasDuplicates =
      report.duplicateEmails.length > 0 ||
      report.duplicatePhones.length > 0 ||
      report.duplicateGst.length > 0 ||
      report.duplicateBankAccounts.length > 0 ||
      report.duplicatePan.length > 0 ||
      report.duplicateAadhaar.length > 0;

    return successResponse(
      {
        ...report,
        summary: {
          duplicateEmailCount: report.duplicateEmails.length,
          duplicatePhoneCount: report.duplicatePhones.length,
          duplicateGstCount: report.duplicateGst.length,
          duplicateBankAccountCount: report.duplicateBankAccounts.length,
          duplicatePanCount: report.duplicatePan.length,
          duplicateAadhaarCount: report.duplicateAadhaar.length,
          hasDuplicates,
        },
      },
      hasDuplicates
        ? 'Found duplicate identifiers that may need review'
        : 'No duplicate identifiers found',
    );
  }
}
