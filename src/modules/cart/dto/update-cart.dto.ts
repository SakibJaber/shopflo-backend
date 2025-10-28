import { Type } from 'class-transformer';
import {
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { VariantQuantityDto } from 'src/modules/cart/dto/create-cart.dto';

export class UpdateCartItemDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantQuantityDto)
  variantQuantities?: VariantQuantityDto[];

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}