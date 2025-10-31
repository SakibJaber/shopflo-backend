import { IsEmail, IsOptional, IsString, Matches, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginAuthDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Matches(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    { message: 'Please provide a valid email address' }
  )
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsOptional()
  @IsString({ message: 'User agent must be a string' })
  userAgent?: string;

  @IsOptional()
  @IsString({ message: 'IP address must be a string' })
  ipAddress?: string;
}
