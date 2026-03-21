import { api } from './client';
import type { ApiResponse, Review, ReviewSummary } from './types';

export async function getProductReviews(productId: string): Promise<{ reviews: Review[]; summary: ReviewSummary }> {
  const { data } = await api.get<ApiResponse<{ reviews: Review[]; summary: ReviewSummary }>>(`/reviews/product/${productId}`);
  return data.data;
}

export async function createReview(body: { productId: string; rating: number; title: string; comment: string }): Promise<Review> {
  const { data } = await api.post<ApiResponse<Review>>('/reviews', body);
  return data.data;
}
