import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class UpdateBusinessInfoDto {
  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  State?: string;

  @IsString()
  @IsOptional()
  City?: string;

  @IsString()
  @IsOptional()
  Country?: string;
}
