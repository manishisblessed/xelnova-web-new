import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product.dto';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
} from '../../common/helpers/response.helper';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with filters and pagination' })
  async findAll(@Query() query: ProductQueryDto) {
    const { items, total, page, limit } =
      await this.productsService.findAll(query);
    return paginatedResponse(
      items,
      total,
      page,
      limit,
      'Products fetched successfully',
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get marketplace stats (product/seller/customer counts)' })
  async getStats() {
    return successResponse(
      await this.productsService.getStats(),
      'Stats fetched successfully',
    );
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get active brands' })
  async getBrands() {
    return successResponse(
      await this.productsService.getBrands(),
      'Brands fetched successfully',
    );
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  async findFeatured() {
    return successResponse(
      await this.productsService.findFeatured(),
      'Featured products fetched successfully',
    );
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  async findTrending() {
    return successResponse(
      await this.productsService.findTrending(),
      'Trending products fetched successfully',
    );
  }

  @Get('flash-deals')
  @ApiOperation({ summary: 'Get flash deal products' })
  async findFlashDeals() {
    return successResponse(
      await this.productsService.findFlashDeals(),
      'Flash deals fetched successfully',
    );
  }

  @Get('banners')
  @ApiOperation({ summary: 'Get promotional banners' })
  @ApiQuery({ name: 'position', required: false, description: 'Filter by position (hero, promo, side)' })
  async getBanners(@Query('position') position?: string) {
    const data = position
      ? await this.productsService.getBannersByPosition(position)
      : await this.productsService.getBanners();
    return successResponse(data, 'Banners fetched successfully');
  }

  @Get('reviews/top')
  @ApiOperation({ summary: 'Get top-rated reviews for testimonials' })
  async getTopReviews() {
    return successResponse(
      await this.productsService.getTopReviews(),
      'Top reviews fetched successfully',
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product detail by slug' })
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug);
    if (!product) {
      return errorResponse('Product not found');
    }
    return successResponse(product, 'Product fetched successfully');
  }
}
