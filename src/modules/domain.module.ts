import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UsersModule } from 'src/modules/users/users.module';
import { ReviewModule } from './review/review.module';
import { CategoriesModule } from './category_management/categories/categories.module';
import { SubcategoryModule } from './category_management/subcategory/subcategory.module';

@Module({
  imports: [AuthModule, UsersModule, ReviewModule, CategoriesModule, SubcategoryModule],
})
export class DomainModule {}
