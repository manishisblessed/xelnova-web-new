import { Injectable } from '@nestjs/common';
import { reviews } from '../../data/mock-data';

@Injectable()
export class ReviewsService {
  private allReviews = [...reviews];

  findByProductId(productId: string) {
    const productReviews = this.allReviews.filter(
      (r) => r.productId === productId,
    );

    const totalReviews = productReviews.length;
    const avgRating =
      totalReviews > 0
        ? Math.round(
            (productReviews.reduce((sum, r) => sum + r.rating, 0) /
              totalReviews) *
              10,
          ) / 10
        : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: productReviews.filter((r) => r.rating === star).length,
    }));

    return {
      reviews: productReviews,
      summary: { totalReviews, avgRating, ratingDistribution },
    };
  }

  create(data: {
    productId: string;
    rating: number;
    title: string;
    comment: string;
  }) {
    const newReview = {
      id: `rev-${Date.now()}`,
      productId: data.productId,
      userId: 'user-1',
      userName: 'Rahul Sharma',
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      images: [],
      verified: true,
      helpful: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    this.allReviews.push(newReview);
    return newReview;
  }
}
