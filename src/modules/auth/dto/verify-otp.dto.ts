import { IsEmail, IsString, Matches, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Matches(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    { message: 'Please provide a valid email address' }
  )
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'OTP must be a string' })
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Transform(({ value }) => value?.toString().trim())
  code: string;

  @IsString({ message: 'IP address must be a string' })
  @IsOptional()
  ipAddress?: string;

  @IsString({ message: 'User agent must be a string' })
  @IsOptional()
  userAgent?: string;
}
