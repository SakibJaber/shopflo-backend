import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/users/schema/user.schema';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';
import {
  Address,
  AddressSchema,
} from 'src/modules/address/schema/address.schema';
import { Cart, CartSchema } from 'src/modules/cart/schema/cart.schema';
import {
  Favorite,
  FavoriteSchema,
} from 'src/modules/favorite/schema/favorite,schema';
import { Review, ReviewSchema } from 'src/modules/review/schema/review.schema';
import { Order, OrderSchema } from 'src/modules/order/schema/order.schema';
import {
  Notification,
  NotificationSchema,
} from 'src/modules/notifications/schema/notification.schema';
import { Design, DesignSchema } from 'src/modules/designs/schema/design.schema';
import { Blog, BlogSchema } from 'src/modules/blogs/schema/blog.schema';
import { Chart, ChartSchema } from 'src/modules/chart/schema/chart.schema';
import { Coupon, CouponSchema } from 'src/modules/coupons/schema/coupon.schema';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Design.name, schema: DesignSchema },
      { name: Blog.name, schema: BlogSchema },
      { name: Chart.name, schema: ChartSchema },
      { name: Coupon.name, schema: CouponSchema },
    ]),
    AdminModule,
    NotificationsModule,
    FileUploadModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
