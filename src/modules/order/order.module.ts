import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PaymentModule } from 'src/modules/payment/payment.module';
import { CartModule } from 'src/modules/cart/cart.module';
import { AddressModule } from 'src/modules/address/address.module';
import { DesignsModule } from 'src/modules/designs/designs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    PaymentModule,
    CartModule,
    AddressModule,
    DesignsModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
