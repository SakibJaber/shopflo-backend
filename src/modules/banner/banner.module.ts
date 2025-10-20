import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Banner, BannerSchema } from './schema/banner.schema';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';
import { BannersController } from 'src/modules/banner/banner.controller';
import { BannersService } from 'src/modules/banner/banner.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
    FileUploadModule,
  ],
  controllers: [BannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
