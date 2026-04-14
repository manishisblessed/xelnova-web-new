import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import {
  successResponse,
  paginatedResponse,
} from '../../common/helpers/response.helper';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search products with filters' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'minRating', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['relevance', 'price_asc', 'price_desc', 'rating', 'newest'] })
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '12', 10);
    const filters = {
      category: category || undefined,
      brand: brand || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      sortBy: (sortBy as any) || undefined,
    };
    const result = await this.searchService.search(q || '', pageNum, limitNum, filters);
    return {
      ...paginatedResponse(
        result.products,
        result.total,
        result.page,
        result.limit,
        'Search results fetched successfully',
      ),
      filters: result.filters,
    };
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Get autocomplete suggestions' })
  @ApiQuery({ name: 'q', required: true })
  async autocomplete(@Query('q') q: string) {
    return successResponse(
      await this.searchService.autocomplete(q || ''),
      'Autocomplete suggestions fetched',
    );
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular searches' })
  async popular() {
    return successResponse(
      await this.searchService.getPopularSearches(),
      'Popular searches fetched successfully',
    );
  }
}
