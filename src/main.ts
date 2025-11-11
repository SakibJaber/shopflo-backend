import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as express from 'express';
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';

async function bootstrap() {
  // Disable built-in body parser to control it manually
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  // Stripe raw body parser — must come BEFORE express.json()
  app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));

  // Normal JSON parser for all other routes
  app.use(express.json({ limit: '10mb' }));

  // Global interceptors and filters
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Explicitly allow only your known frontends
  const allowedOrigins = ['http://10.10.20.60:3008', 'http://10.10.20.60:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation: Origin not allowed'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(port);
  Logger.log(`🚀 Server running at http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
