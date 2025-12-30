import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schema/cart.schema';
import { CartController } from './cart.controller';
import { CartService } from './services/cart.service';
import { CartItemService } from './services/cart-item.service';
import { CartCouponService } from './services/cart-coupon.service';
import { Product, ProductSchema } from '../products/schema/product.schema';
import { Design, DesignSchema } from '../designs/schema/design.schema';
import { Size, SizeSchema } from '../sizes/schema/size.schema';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Design.name, schema: DesignSchema },
      { name: Size.name, schema: SizeSchema },
    ]),
    CouponsModule,
  ],
  controllers: [CartController],
  providers: [CartService, CartItemService, CartCouponService],
  exports: [CartService, CartItemService, CartCouponService],
})
export class CartModule {}
