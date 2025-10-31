import { IsString, MinLength, NotEquals } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @NotEquals('currentPassword', { message: 'New password must be different' })
  newPassword: string;
}
