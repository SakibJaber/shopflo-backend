import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Design, DesignSchema } from './schema/design.schema';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';
import { Product, ProductSchema } from '../products/schema/product.schema';
import { Color, ColorSchema } from '../color/schema/color.schema'; 

@Module({
  imports: [
    FileUploadModule,
    MongooseModule.forFeature([
      { name: Design.name, schema: DesignSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Color.name, schema: ColorSchema }, 
    ]),
  ],
  controllers: [DesignsController],
  providers: [DesignsService],
  exports: [DesignsService],
})
export class DesignsModule {}