import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ProductStatus } from 'src/common/enum/product.status.enum';
import { VisibilityStatus } from 'src/common/enum/visibility-status.enum';

export class UpdateVariantDto {
  @IsOptional()
  @IsMongoId()
  color?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  size?: string[];

  @IsOptional()
  @IsEnum(VisibilityStatus)
  status?: VisibilityStatus;

  @IsOptional()
  @IsEnum(ProductStatus)
  stockStatus?: ProductStatus;

  @IsOptional()
  frontImage?: string;

  @IsOptional()
  backImage?: string;
}
