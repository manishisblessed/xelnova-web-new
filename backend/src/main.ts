import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  const corsOrigins = process.env.CORS_ORIGINS?.split(',').filter(Boolean);
  if (!corsOrigins?.length && isProduction) {
    console.warn('WARNING: CORS_ORIGINS is not set in production. No cross-origin requests will be allowed.');
  }
  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const enableDocs = !isProduction || process.env.ENABLE_API_DOCS === 'true';
  if (enableDocs) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Xelnova API')
      .setDescription(
        'Xelnova E-commerce Marketplace API.\n\n' +
        '**Base URL:** `/api/v1`\n\n' +
        '**Authentication:** Bearer token via `Authorization` header.\n\n' +
        '**Modules:** Auth, Products, Categories, Cart, Orders, Payment, Returns, ' +
        'Wallet, Tickets, Seller Dashboard, Admin, Notifications, Loyalty, COD Verification, Shipping.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('Auth', 'Registration, login, OTP, password reset')
      .addTag('Products', 'Product catalog and search')
      .addTag('Cart', 'Shopping cart operations')
      .addTag('Orders', 'Order placement and management')
      .addTag('Payment', 'Razorpay payment flow')
      .addTag('Returns', 'Return requests and reverse pickup')
      .addTag('Notifications', 'In-app notifications and push tokens')
      .addTag('Loyalty', 'Loyalty points and referral codes')
      .addTag('COD Verification', 'Cash-on-delivery OTP verification')
      .addTag('Admin', 'Admin dashboard operations')
      .addTag('Admin Notifications', 'Abandoned carts and fraud detection')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Xelnova API running on port ${port} [${isProduction ? 'production' : 'development'}]`);
  if (!isProduction) {
    console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
