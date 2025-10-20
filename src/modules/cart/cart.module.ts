import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schema/cart.schema';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Product, ProductSchema } from '../products/schema/product.schema';
import { Design, DesignSchema } from '../designs/schema/design.schema';
import { Size, SizeSchema } from '../sizes/schema/size.schema';
import { Color, ColorSchema } from '../color/schema/color.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Design.name, schema: DesignSchema },
      { name: Size.name, schema: SizeSchema },
      { name: Color.name, schema: ColorSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}