import { api } from './client';
import type { ApiResponse, Review, ReviewSummary } from './types';

export async function getProductReviews(productId: string, page?: number, limit?: number): Promise<{ reviews: Review[]; summary: ReviewSummary; pagination: any }> {
  const { data } = await api.get<ApiResponse<{ reviews: Review[]; summary: ReviewSummary; pagination: any }>>(`/reviews/product/${productId}`, {
    params: { page, limit },
  });
  return data.data;
}

export async function createReview(body: { productId: string; rating: number; title?: string; comment?: string }): Promise<Review> {
  const { data } = await api.post<ApiResponse<Review>>('/reviews', body);
  return data.data;
}

export async function markReviewHelpful(reviewId: string): Promise<Review> {
  const { data } = await api.post<ApiResponse<Review>>(`/reviews/${reviewId}/helpful`);
  return data.data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await api.delete(`/reviews/${reviewId}`);
}
