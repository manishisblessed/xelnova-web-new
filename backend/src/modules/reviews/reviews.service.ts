import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import type { ReviewModerationStatus } from '@prisma/client';

const PUBLIC_REVIEW: { moderationStatus: ReviewModerationStatus } = {
  moderationStatus: 'APPROVED',
};

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private async moderationAudit(
    entityId: string,
    action: string,
    actorUserId: string | undefined,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.moderationAuditLog.create({
      data: {
        entityType: 'REVIEW',
        entityId,
        action,
        actorUserId: actorUserId ?? null,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  }

  async findByProductId(productId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const wherePublic = { productId, ...PUBLIC_REVIEW };
    const [reviews, totalReviews] = await Promise.all([
      this.prisma.review.findMany({
        where: wherePublic,
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: wherePublic }),
    ]);

    const allRatings = await this.prisma.review.groupBy({
      by: ['rating'],
      where: wherePublic,
      _count: { rating: true },
    });

    const avgResult = await this.prisma.review.aggregate({
      where: wherePublic,
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

    const existingReview = await this.prisma.review.findFirst({
      where: {
        productId: data.productId,
        userId,
        moderationStatus: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const purchaseVerified = await this.prisma.orderItem.findFirst({
      where: {
        productId: data.productId,
        order: { userId, status: { in: ['DELIVERED', 'RETURNED', 'REFUNDED'] } },
      },
    });
    if (!purchaseVerified) {
      throw new ForbiddenException('You can review this product only after purchase and delivery');
    }

    const review = await this.prisma.review.create({
      data: {
        productId: data.productId,
        userId,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment || null,
        verified: true,
        moderationStatus: 'PENDING',
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    this.notifications
      .notifyAllAdmins({
        type: 'REVIEW_PENDING',
        title: 'New review pending approval',
        body: `A ${data.rating}-star review for "${product.name}" requires approval.`,
        data: { reviewId: review.id, productId: data.productId, rating: data.rating },
      })
      .catch(() => {});

    return review;
  }

  async markHelpful(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.moderationStatus !== 'APPROVED') {
      throw new BadRequestException('Review is not visible yet');
    }
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
    if (isAdmin) {
      await this.moderationAudit(reviewId, 'DELETE', userId, { productId: review.productId });
    }
    return { deleted: true };
  }

  private async updateProductRating(productId: string) {
    const result = await this.prisma.review.aggregate({
      where: { productId, moderationStatus: 'APPROVED' },
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

  async findAllForAdmin(params: {
    page?: number;
    limit?: number;
    moderationStatus?: ReviewModerationStatus;
    search?: string;
  }) {
    const { page = 1, limit = 20, moderationStatus, search } = params;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (moderationStatus) {
      where.moderationStatus = moderationStatus;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          product: { select: { id: true, name: true, images: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async approveReview(reviewId: string, adminUserId?: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.moderationStatus === 'APPROVED') return review;

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: 'APPROVED',
        moderatedAt: new Date(),
        moderatedById: adminUserId ?? null,
        moderationNote: null,
      },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    await this.updateProductRating(review.productId);
    await this.moderationAudit(reviewId, 'APPROVE', adminUserId, { productId: review.productId });

    this.notifications
      .notifyReviewModeration(updated.userId, updated.product.name, 'APPROVED', reviewId)
      .catch(() => {});

    return updated;
  }

  async rejectReview(reviewId: string, adminUserId?: string, reason?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.moderationStatus === 'REJECTED') return review;

    const note = (reason ?? '').trim() || null;

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: 'REJECTED',
        moderatedAt: new Date(),
        moderatedById: adminUserId ?? null,
        moderationNote: note,
      },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    await this.updateProductRating(review.productId);
    await this.moderationAudit(reviewId, 'REJECT', adminUserId, {
      productId: review.productId,
      reason: note,
    });

    this.notifications
      .notifyReviewModeration(updated.userId, updated.product.name, 'REJECTED', reviewId, note || undefined)
      .catch(() => {});

    return updated;
  }

  async getPendingCount(): Promise<number> {
    return this.prisma.review.count({ where: { moderationStatus: 'PENDING' } });
  }

  async getReviewStatusForOrder(userId: string, orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: { select: { productId: true } } },
    });
    if (!order || order.userId !== userId) return {};

    const productIds = order.items.map((i) => i.productId);
    const reviews = await this.prisma.review.findMany({
      where: {
        userId,
        productId: { in: productIds },
        moderationStatus: { in: ['PENDING', 'APPROVED'] },
      },
      select: { productId: true, rating: true, moderationStatus: true },
    });

    const map: Record<string, { reviewed: true; rating: number; status: string }> = {};
    for (const r of reviews) {
      map[r.productId] = { reviewed: true, rating: r.rating, status: r.moderationStatus };
    }
    return map;
  }
}
