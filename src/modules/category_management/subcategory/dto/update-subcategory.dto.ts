import { IsOptional, IsMongoId, IsNumber, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateSubcategoryDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  slug?: string;

  @IsOptional()
  @IsMongoId() 
  category?: Types.ObjectId; 

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
