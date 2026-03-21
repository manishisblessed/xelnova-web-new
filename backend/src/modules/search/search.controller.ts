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
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async search(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '12', 10);
    const result = await this.searchService.search(q || '', pageNum, limitNum);
    return paginatedResponse(
      result.products,
      result.total,
      result.page,
      result.limit,
      'Search results fetched successfully',
    );
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
