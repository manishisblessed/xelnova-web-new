import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SellerStoreService } from './seller-store.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateStoreSettingsDto,
  UpdateFeaturedProductsDto,
  CreateStoreBannerDto,
  UpdateStoreBannerDto,
  StoreProductsQueryDto,
} from './dto/seller-store.dto';
import {
  successResponse,
  paginatedResponse,
} from '../../common/helpers/response.helper';

@ApiTags('Seller Store')
@Controller()
export class SellerStoreController {
  constructor(private readonly service: SellerStoreService) {}

  // ─── Public Endpoints (for buyers) ───

  @Get('stores/:slug')
  @ApiOperation({ summary: 'Get store by slug (public)' })
  async getStore(@Param('slug') slug: string) {
    return successResponse(
      await this.service.getStoreBySlug(slug),
      'Store fetched successfully',
    );
  }

  @Get('stores/:slug/products')
  @ApiOperation({ summary: 'Get store products with filters (public)' })
  async getStoreProducts(
    @Param('slug') slug: string,
    @Query() query: StoreProductsQueryDto,
  ) {
    const { items, total, page, limit } = await this.service.getStoreProducts(
      slug,
      query,
    );
    return paginatedResponse(items, total, page, limit, 'Products fetched');
  }

  @Get('stores/:slug/categories')
  @ApiOperation({ summary: 'Get categories with products from this store (public)' })
  async getStoreCategories(@Param('slug') slug: string) {
    return successResponse(
      await this.service.getStoreCategories(slug),
      'Categories fetched',
    );
  }

  @Get('stores/:slug/deals')
  @ApiOperation({ summary: 'Get discounted products from this store (public)' })
  async getStoreDeals(
    @Param('slug') slug: string,
    @Query('limit') limit?: number,
  ) {
    return successResponse(
      await this.service.getStoreDeals(slug, limit),
      'Deals fetched',
    );
  }

  @Get('stores/:slug/bestsellers')
  @ApiOperation({ summary: 'Get bestselling products from this store (public)' })
  async getStoreBestsellers(
    @Param('slug') slug: string,
    @Query('limit') limit?: number,
  ) {
    return successResponse(
      await this.service.getStoreBestsellers(slug, limit),
      'Bestsellers fetched',
    );
  }

  // ─── Authenticated Endpoints (for seller dashboard) ───

  @Get('seller/store')
  @Auth('SELLER' as any)
  @ApiOperation({ summary: 'Get own store settings' })
  async getOwnStore(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.service.getOwnStoreSettings(userId),
      'Store settings fetched',
    );
  }

  @Patch('seller/store')
  @Auth('SELLER' as any)
  @ApiOperation({ summary: 'Update store settings (hero, about, theme)' })
  async updateStoreSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStoreSettingsDto,
  ) {
    return successResponse(
      await this.service.updateStoreSettings(userId, dto),
      'Store settings updated',
    );
  }

  @Put('seller/store/featured-products')
  @Auth('SELLER' as any)
  @ApiOperation({ summary: 'Set featured product IDs' })
  async updateFeaturedProducts(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateFeaturedProductsDto,
  ) {
    return successResponse(
      await this.service.updateFeaturedProducts(userId, dto.productIds),
      'Featured products updated',
    );
  }

  @Post('seller/store/banners')
  @Auth('SELLER' as any)
  @ApiOperation({ summary: 'Add a carousel banner' })
  async createBanner(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStoreBannerDto,
  ) {
    return successResponse(
      await this.service.createStoreBanner(userId, dto),
      'Banner created',
    );
  }

  @Patch('seller/store/banners/:id')
  @Auth('SELLER' as any)
  @ApiOperation({ summary: 'Update a carousel banner' })
  async updateBanner(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStoreBannerDto,
  ) {
    return successResponse(
      await this.service.updateStoreBanner(userId, id, dto),
      'Banner updated',
    );
  }

  @Delete('seller/store/banners/:id')
  @Auth('SELLER' as any)
  @ApiOperation({ summary: 'Delete a carousel banner' })
  async deleteBanner(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return successResponse(
      await this.service.deleteStoreBanner(userId, id),
      'Banner deleted',
    );
  }

  @Put('seller/store/banners/reorder')
  @Auth('SELLER' as any)
  @ApiOperation({ summary: 'Reorder carousel banners' })
  async reorderBanners(
    @CurrentUser('id') userId: string,
    @Body() body: { bannerIds: string[] },
  ) {
    return successResponse(
      await this.service.reorderBanners(userId, body.bannerIds),
      'Banners reordered',
    );
  }
}
