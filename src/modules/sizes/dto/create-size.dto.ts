import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSizeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string; // Size name (e.g., "Small", "Medium", "Large")




}
