import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSizeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string; // Size name (e.g., "Small", "Medium", "Large")

  @IsString()
  value: string; // Size value (e.g., "S", "M", "L", "XL")

  @IsBoolean()
  isVisible?: boolean; // Optional visibility flag, defaults to true
}
