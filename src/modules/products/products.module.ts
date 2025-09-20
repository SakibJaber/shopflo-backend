import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schema/product.schema';
import { Color, ColorSchema } from '../color/schema/color.schema';
import {
  Category,
  CategorySchema,
} from 'src/modules/category_management/categories/schema/category.schema';
import {
  Subcategory,
  SubcategorySchema,
} from 'src/modules/category_management/subcategory/schema/subcategory.schema';
import { ProductController } from 'src/modules/products/products.controller';
import { ProductService } from 'src/modules/products/products.service';
import { Size, SizeSchema } from 'src/modules/sizes/schema/size.schema';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';

@Module({
  imports: [
    FileUploadModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Subcategory.name, schema: SubcategorySchema },
      { name: Color.name, schema: ColorSchema },
      { name: Size.name, schema: SizeSchema },
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
