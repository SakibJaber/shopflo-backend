import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { MongoExceptionFilter } from 'src/common/filters/mongo-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  app.useGlobalFilters(new MongoExceptionFilter());

  // Enable CORS if frontend connects
  app.enableCors();

  // Set global API prefix
  app.setGlobalPrefix('api');

  await app.listen(port);
  Logger.log(`🚀 Server running at http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
