import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductId(productId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [reviews, totalReviews] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    const allRatings = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId },
      _count: { rating: true },
    });

    const avgResult = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
    });

    const avgRating = avgResult._avg.rating
      ? Math.round(avgResult._avg.rating * 10) / 10
      : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: allRatings.find((r) => r.rating === star)?._count.rating || 0,
    }));

    return {
      reviews,
      summary: { totalReviews, avgRating, ratingDistribution },
      pagination: { page, limit, total: totalReviews, totalPages: Math.ceil(totalReviews / limit) },
    };
  }

  async create(
    userId: string,
    data: { productId: string; rating: number; title?: string; comment?: string },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Prevent duplicate reviews
    const existingReview = await this.prisma.review.findFirst({
      where: { productId: data.productId, userId },
    });
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Verify purchase — user must have a delivered order containing this product
    const purchaseVerified = await this.prisma.orderItem.findFirst({
      where: {
        productId: data.productId,
        order: { userId, status: { in: ['DELIVERED', 'RETURNED', 'REFUNDED'] } },
      },
    });

    const review = await this.prisma.review.create({
      data: {
        productId: data.productId,
        userId,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment || null,
        verified: !!purchaseVerified,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    await this.updateProductRating(data.productId);
    return review;
  }

  async markHelpful(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId === userId) {
      throw new BadRequestException('Cannot mark your own review as helpful');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { helpful: { increment: 1 } },
    });
  }

  async deleteReview(reviewId: string, userId: string, isAdmin: boolean = false) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.updateProductRating(review.productId);
    return { deleted: true };
  }

  private async updateProductRating(productId: string) {
    const result = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        reviewCount: result._count.rating,
        rating: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
      },
    });
  }
}
