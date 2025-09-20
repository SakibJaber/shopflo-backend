import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UsersModule } from 'src/modules/users/users.module';
import { ReviewModule } from './review/review.module';
import { CategoriesModule } from './category_management/categories/categories.module';
import { SubcategoryModule } from './category_management/subcategory/subcategory.module';
import { ColorsModule } from './color/color.module';
import { SizesModule } from './sizes/sizes.module';
import { BlogsModule } from './blogs/blogs.module';
import { StaticPageModule } from './static-page/static-page.module';
import { FAQModule } from './faq/faq.module';
import { TestimonialModule } from './testimonial/testimonial.module';
import { ContactModule } from './contact/contact.module';
import { SocialMediaModule } from './social/social.module';
import { ProductModule } from 'src/modules/products/products.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ReviewModule,
    CategoriesModule,
    SubcategoryModule,
    ColorsModule,
    SizesModule,
    ProductModule,
    BlogsModule,
    StaticPageModule,
    FAQModule,
    TestimonialModule,
    ContactModule,
    SocialMediaModule,
    CartModule,
  ],
})
export class DomainModule {}
