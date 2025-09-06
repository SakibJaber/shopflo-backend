import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class UpdateBusinessInfoDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  hours?: string;

  @IsString()
  @IsOptional()
  mapEmbedUrl?: string;
}
