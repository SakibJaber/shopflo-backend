import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsMongoId,
  IsInt,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsMongoId()
  user: string;

  @IsMongoId()
  product: string;

  @IsString()
  @IsNotEmpty()
  comment: string;

  @IsOptional()
  @IsArray()
  images?: string[]; // Array of image URLs

  @Type(() => Number)        
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}
