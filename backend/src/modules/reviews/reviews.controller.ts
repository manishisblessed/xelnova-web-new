import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product' })
  findByProductId(@Param('productId') productId: string) {
    return successResponse(
      this.reviewsService.findByProductId(productId),
      'Reviews fetched successfully',
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a review' })
  create(
    @Body()
    body: {
      productId: string;
      rating: number;
      title: string;
      comment: string;
    },
  ) {
    return successResponse(
      this.reviewsService.create(body),
      'Review created successfully',
    );
  }
}
