import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product' })
  async findByProductId(@Param('productId') productId: string) {
    return successResponse(
      await this.reviewsService.findByProductId(productId),
      'Reviews fetched successfully',
    );
  }

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Create a review' })
  async create(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      productId: string;
      rating: number;
      title: string;
      comment: string;
    },
  ) {
    return successResponse(
      await this.reviewsService.create(userId, body),
      'Review created successfully',
    );
  }
}
