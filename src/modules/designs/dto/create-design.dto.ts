import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDesignDto {
  @IsNotEmpty()
  @IsString()
  designName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId()
  @IsNotEmpty()
  baseProduct: string;

  // @IsMongoId() // New: Required color ID
  // @IsNotEmpty()
  // color: string;

  @IsOptional()
  designPreferences?: {
    colors?: string[];
    printType?: string;
    notes?: string;
  };
}
