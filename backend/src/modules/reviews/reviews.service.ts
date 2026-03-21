import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductId(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10,
          ) / 10
        : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));

    return {
      reviews,
      summary: { totalReviews, avgRating, ratingDistribution },
    };
  }

  async create(
    userId: string,
    data: { productId: string; rating: number; title: string; comment: string },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const review = await this.prisma.review.create({
      data: {
        productId: data.productId,
        userId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        verified: true,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    // Update product review count and average rating
    const allReviews = await this.prisma.review.findMany({
      where: { productId: data.productId },
      select: { rating: true },
    });
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await this.prisma.product.update({
      where: { id: data.productId },
      data: {
        reviewCount: allReviews.length,
        rating: Math.round(avgRating * 10) / 10,
      },
    });

    return review;
  }
}
