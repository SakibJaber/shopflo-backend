import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category, CategorySchema } from './schema/category.schema';
import {
  Subcategory,
  SubcategorySchema,
} from '../subcategory/schema/subcategory.schema';
import { SubcategoryModule } from '../subcategory/subcategory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Subcategory.name, schema: SubcategorySchema },
    ]),
    forwardRef(() => SubcategoryModule), 
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // Export MongooseModule for DI
})
export class CategoriesModule {}
