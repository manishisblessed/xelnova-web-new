import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  const corsOrigins = process.env.CORS_ORIGINS?.split(',').filter(Boolean);
  if (!corsOrigins?.length && isProduction) {
    console.warn('WARNING: CORS_ORIGINS is not set in production. No cross-origin requests will be allowed.');
  }
  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
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

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Xelnova API')
      .setDescription('Xelnova Ecommerce Marketplace API')
      .setVersion('1.0')
      .addBearerAuth()
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
