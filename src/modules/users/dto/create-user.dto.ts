import {
  IsString,
  IsEmail,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Role } from 'src/common/enum/user_role.enum';

export class CreateUserDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  gdcNumber?: string;

  @IsOptional()
  clinicName?: string;
}
