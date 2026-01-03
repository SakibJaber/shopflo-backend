import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { OrdersController } from './order.controller';
import { OrderService } from './order.service';
import {
  Address,
  AddressSchema,
} from 'src/modules/address/schema/address.schema';
import { Cart, CartSchema } from 'src/modules/cart/schema/cart.schema';
import { User, UserSchema } from 'src/modules/users/schema/user.schema';
import {
  Product,
  ProductSchema,
} from 'src/modules/products/schema/product.schema';
import { Design, DesignSchema } from 'src/modules/designs/schema/design.schema';
import { CartModule } from 'src/modules/cart/cart.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { CheckoutController } from 'src/modules/order/payment/checkout.controller';
import { StripeWebhookController } from 'src/modules/order/payment/stripe-webhook.controller';
import { StripeService } from 'src/modules/order/payment/stripe.service';
import { CouponsModule } from 'src/modules/coupons/coupons.module';
import { Review, ReviewSchema } from 'src/modules/review/schema/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Cart.name, schema: CartSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Design.name, schema: DesignSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
    CartModule,
    NotificationsModule,
    CouponsModule,
  ],
  controllers: [OrdersController, StripeWebhookController, CheckoutController],
  providers: [OrderService, StripeService],
  exports: [OrderService, StripeService],
})
export class OrderModule {}
