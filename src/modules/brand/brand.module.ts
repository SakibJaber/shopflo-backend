import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema } from './schema/brand.schema';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';
import { BrandController } from 'src/modules/brand/brand.controller';
import { BrandService } from 'src/modules/brand/brand.service';

@Module({
  imports: [
    FileUploadModule,
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
  ],
  controllers: [BrandController],
  providers: [BrandService],
  exports: [BrandService],
})
export class BrandModule {}
