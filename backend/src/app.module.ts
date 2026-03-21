import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { LoggingMiddleware } from './common/middleware/logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
