import { IsString, IsNotEmpty, IsUrl, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateSocialMediaDto {
  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;
}