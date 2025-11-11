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
import { BrandModule } from './brand/brand.module';
import { OrderModule } from './order/order.module';
import { AddressModule } from './address/address.module';
import { BannersModule } from './banner/banner.module';
import { IconsModule } from './icon/icon.module';
import { DesignsModule } from './designs/designs.module';
import { ChartModule } from './chart/chart.module';
import { FavoriteModule } from './favorite/favorite.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';

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
    BrandModule,
    OrderModule,
    AddressModule,
    BannersModule,
    IconsModule,
    DesignsModule,
    ChartModule,
    FavoriteModule,
    NotificationsModule,
    DashboardModule,
  ],
})
export class DomainModule {}
