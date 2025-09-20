import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  // Apply the ResponseInterceptor globally
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Apply the global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS if frontend connects
  app.enableCors();

  // Set global API prefix
  app.setGlobalPrefix('api');

  await app.listen(port);
  Logger.log(`🚀 Server running at http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
