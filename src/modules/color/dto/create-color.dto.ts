import { IsBoolean, IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateColorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string; // Color name (e.g., "Red")

  @IsHexColor()
  hexValue: string; // Color hex code (e.g., "#FF0000")

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean; // Optional visibility flag, defaults to true
}
