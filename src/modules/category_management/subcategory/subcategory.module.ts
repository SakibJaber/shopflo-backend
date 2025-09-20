// subcategory.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubcategoryService } from './subcategory.service';
import { SubcategoryController } from './subcategory.controller';
import { Subcategory, SubcategorySchema } from './schema/subcategory.schema';
import { Category, CategorySchema } from '../categories/schema/category.schema';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subcategory.name, schema: SubcategorySchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    forwardRef(() => CategoriesModule), // To avoid circular dependencies
  ],
  controllers: [SubcategoryController],
  providers: [SubcategoryService],
  exports: [SubcategoryService],
})
export class SubcategoryModule {}
