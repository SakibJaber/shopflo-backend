import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UsersModule } from 'src/modules/users/users.module';
import { ReviewModule } from './review/review.module';
import { CategoriesModule } from './category_management/categories/categories.module';
import { SubcategoryModule } from './category_management/subcategory/subcategory.module';
import { ColorsModule } from './color/color.module';
import { SizesModule } from './sizes/sizes.module';
import { BlogsModule } from './blogs/blogs.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ReviewModule,
    CategoriesModule,
    SubcategoryModule,
    ColorsModule,
    SizesModule,
    BlogsModule,
  ],
})
export class DomainModule {}
