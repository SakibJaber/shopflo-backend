import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Role } from 'src/common/enum/user_role.enum';
import { UserStatus } from 'src/common/enum/user.status.enum';

export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(Role)
  role: Role = Role.USER; 

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsEnum(UserStatus)
  status: UserStatus = UserStatus.APPROVED; // Default status is APPROVED

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  refreshToken?: string | null;

  @IsOptional()
  @IsString()
  resetPasswordCodeHash?: string | null;

  @IsOptional()
  @IsDateString()
  resetPasswordExpires?: Date | null;

  @IsInt()
  @Min(0)
  otpAttempts: number = 0; // Default is 0

  @IsInt()
  @Min(1)
  @Max(10)
  maxOtpAttempts: number = 3; // Default is 3
}
