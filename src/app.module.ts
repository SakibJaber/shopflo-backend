import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DomainModule } from 'src/modules/domain.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/common/database/database.module';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(process.cwd(), 'public'),
      serveRoot: '/', // so /uploads/* maps to public/uploads/*
      exclude: ['/api*'],
    }),
    FileUploadModule,
    DatabaseModule,
    DomainModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
