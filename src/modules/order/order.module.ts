import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Cart, CartSchema } from '../cart/schema/cart.schema';
import { Product, ProductSchema } from '../products/schema/product.schema';
import { Design, DesignSchema } from '../designs/schema/design.schema';
import { Size, SizeSchema } from '../sizes/schema/size.schema';
import { Color, ColorSchema } from '../color/schema/color.schema';
import { Address, AddressSchema } from 'src/modules/address/schema/address.schema';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Design.name, schema: DesignSchema },
      { name: Size.name, schema: SizeSchema },
      { name: Color.name, schema: ColorSchema },
    ]),
    NotificationsModule, 
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
