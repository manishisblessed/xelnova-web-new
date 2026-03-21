import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import {
  successResponse,
  errorResponse,
} from '../../common/helpers/response.helper';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories (tree structure)' })
  async findAll() {
    return successResponse(
      await this.categoriesService.findAll(),
      'Categories fetched successfully',
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category with products by slug' })
  async findBySlug(@Param('slug') slug: string) {
    const result = await this.categoriesService.findBySlug(slug);
    if (!result) {
      return errorResponse('Category not found');
    }
    return successResponse(result, 'Category fetched successfully');
  }
}
