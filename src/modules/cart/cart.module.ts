import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schema/cart.schema';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Product, ProductSchema } from '../products/schema/product.schema';
import { Size, SizeSchema } from '../sizes/schema/size.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Size.name, schema: SizeSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
