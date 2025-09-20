import { Types } from 'mongoose';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsEnum,
  IsString,
} from 'class-validator';
import { ProductStatus } from 'src/common/enum/product.status.enum';
import { VisibilityStatus } from 'src/common/enum/visibility-status.enum';

export class ProductVariantDto {
  @IsMongoId()
  @IsNotEmpty()
  color: string | Types.ObjectId;

  @IsArray()
  @IsMongoId({ each: true })
  size: string[] | Types.ObjectId[];

  @IsEnum(VisibilityStatus)
  status: VisibilityStatus;

  @IsEnum(ProductStatus)
  stockStatus: ProductStatus;

  @IsString()
  @IsNotEmpty()
  frontImage: string;

  @IsString()
  @IsNotEmpty()
  backImage: string;
}
