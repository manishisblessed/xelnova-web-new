import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
  async getBanners() {
    return successResponse(
      await this.productsService.getBanners(),
      'Banners fetched successfully',
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
