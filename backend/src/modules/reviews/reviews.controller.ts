import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findByProductId(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return successResponse(
      await this.reviewsService.findByProductId(
        productId,
        parseInt(page || '1', 10),
        parseInt(limit || '10', 10),
      ),
      'Reviews fetched successfully',
    );
  }

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Create a review' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: { productId: string; rating: number; title?: string; comment?: string },
  ) {
    return successResponse(
      await this.reviewsService.create(userId, body),
      'Review created successfully',
    );
  }

  @Post(':id/helpful')
  @Auth()
  @ApiOperation({ summary: 'Mark a review as helpful' })
  async markHelpful(
    @CurrentUser('id') userId: string,
    @Param('id') reviewId: string,
  ) {
    return successResponse(
      await this.reviewsService.markHelpful(reviewId, userId),
      'Marked as helpful',
    );
  }

  @Delete(':id')
  @Auth()
  @ApiOperation({ summary: 'Delete a review' })
  async deleteReview(
    @CurrentUser('id') userId: string,
    @Param('id') reviewId: string,
  ) {
    return successResponse(
      await this.reviewsService.deleteReview(reviewId, userId),
      'Review deleted',
    );
  }

  @Get('order/:orderNumber/status')
  @Auth()
  @ApiOperation({ summary: 'Get review status for products in an order' })
  async getOrderReviewStatus(
    @CurrentUser('id') userId: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return successResponse(
      await this.reviewsService.getReviewStatusForOrder(userId, orderNumber),
      'Review status fetched',
    );
  }
}
