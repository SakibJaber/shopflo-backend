import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsMongoId,
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

  @IsNotEmpty()
  rating: number; // Rating between 1 and 5
}
