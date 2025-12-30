import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Review, ReviewSchema } from 'src/modules/review/schema/review.schema';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';
import {
  Product,
  ProductSchema,
} from 'src/modules/products/schema/product.schema';
import { Order, OrderSchema } from 'src/modules/order/schema/order.schema';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    FileUploadModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
