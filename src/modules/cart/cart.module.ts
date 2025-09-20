import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Product,
  ProductSchema,
} from 'src/modules/products/schema/product.schema';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import {
  Cart,
  CartSchema,
  CartItem,
  CartItemSchema,
} from 'src/modules/cart/schema/cart.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: CartItem.name, schema: CartItemSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
