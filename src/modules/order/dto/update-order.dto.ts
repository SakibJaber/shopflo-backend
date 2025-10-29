import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from 'src/common/enum/order_status.enum';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: 'Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled',
  })
  status: OrderStatus;

  @IsString()
  @IsOptional()
  trackingNumber?: string;
}