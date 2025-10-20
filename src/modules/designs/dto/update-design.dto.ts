import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateDesignDto {
  @IsOptional()
  @IsString()
  designName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  baseProduct?: string;

  // @IsOptional() // New: Optional color update
  // @IsMongoId()
  // color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  designPreferences?: {
    colors?: string[];
    printType?: string;
    notes?: string;
  };
}
