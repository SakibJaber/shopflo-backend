import { IsEmail, IsNumber, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsNumber()
  @Length(6, 6)
  code: number;
}
