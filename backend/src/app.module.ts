import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { SearchModule } from './modules/search/search.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SellerDashboardModule } from './modules/seller-dashboard/seller-dashboard.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { PaymentModule } from './modules/payment/payment.module';
import { EmailModule } from './modules/email/email.module';
import { LoggingModule } from './modules/logging/logging.module';
import { VerificationModule } from './modules/verification/verification.module';
import { SellerOnboardingModule } from './modules/seller-onboarding/seller-onboarding.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { SellerStoreModule } from './modules/seller-store/seller-store.module';
import { BusinessModule } from './modules/business/business.module';
import { ContactModule } from './modules/contact/contact.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    LoggingModule,
    VerificationModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    AuthModule,
    UsersModule,
    SellersModule,
    SearchModule,
    ReviewsModule,
    SellerDashboardModule,
    AdminModule,
    UploadModule,
    PaymentModule,
    EmailModule,
    SellerOnboardingModule,
    ShippingModule,
    WalletModule,
    ReturnsModule,
    TicketsModule,
    NotificationsModule,
    WishlistModule,
    FeatureFlagsModule,
    SellerStoreModule,
    BusinessModule,
    ContactModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
