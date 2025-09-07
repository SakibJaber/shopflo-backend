import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { MailService } from 'src/modules/mail/mail.service';
import { ForgotPasswordDto } from 'src/modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from 'src/modules/auth/dto/reset-password.dto';
import { VerifyOtpDto } from 'src/modules/auth/dto/verify-otp.dto';
import { UserStatus } from 'src/common/enum/user.status.enum';
import { JwtPayload } from 'src/common/interface/jwtPayload.interface';
import { User, UserDocument } from 'src/modules/users/schema/user.schema';

@Injectable()
export class AuthService {
  private readonly otpExpiryMs: number;
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.otpExpiryMs =
      (+this.config.get<number>('OTP_EXPIRATION_MINUTES')! || 15) * 60 * 1000;
  }

  async signup(dto: SignupAuthDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ForbiddenException('Email already exists');

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.createUser({
      ...dto,
      password: hash,
    });

    return { message: 'Account created', user };
  }

  async login(dto: LoginAuthDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Invalid credentials');

    // Check account status
    switch (user.status) {
      case UserStatus.BLOCKED:
        throw new UnauthorizedException('Your account has been blocked');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(
      user.id,
      await bcrypt.hash(tokens.refreshToken, 10),
    );
    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');

    // status check
    if (!user || !user.refreshToken || user.status !== UserStatus.APPROVED) {
      throw new ForbiddenException('Access Denied');
    }

    const match = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!match) throw new ForbiddenException('Invalid refresh token');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(
      user.id,
      await bcrypt.hash(tokens.refreshToken, 10),
    );
    return tokens;
  }

  private async getTokens(userId: string, email: string, role: string) {
    const payload = { userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACC_EXPIRATION'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REF_EXPIRATION'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  // Generate & email OTP
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('No account with that email');

    if (user.status === UserStatus.BLOCKED)
      throw new ForbiddenException('Account is blocked');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(code, 10);
    user.resetPasswordCodeHash = hash;
    user.resetPasswordExpires = new Date(Date.now() + this.otpExpiryMs);
    await user.save();

    await this.mailService.sendResetPasswordOtp(dto.email, code);
    return { message: 'OTP sent to your email' };
  }

  // Verify OTP & issue resetToken
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (
      !user ||
      !user.resetPasswordCodeHash ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('OTP expired or invalid');
    }

    if (user.otpAttempts >= user.maxOtpAttempts) {
      await this.usersService.updateUser(user.id, {
        resetPasswordCodeHash: null,
        resetPasswordExpires: null,
        otpAttempts: 0,
      });
      throw new BadRequestException(
        'Maximum OTP attempts exceeded. Please request a new OTP.',
      );
    }

    const match = await bcrypt.compare(
      dto.code.toString(),
      user.resetPasswordCodeHash,
    );
    if (!match) {
      await this.usersService.updateUser(user.id, {
        otpAttempts: user.otpAttempts + 1,
      });
      throw new BadRequestException(
        `Invalid OTP. ${user.maxOtpAttempts - user.otpAttempts - 1} attempts remaining.`,
      );
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const resetToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_RESET_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACC_EXPIRATION'),
    });

    await this.usersService.updateUser(user.id, {
      resetPasswordCodeHash: null,
      resetPasswordExpires: null,
      otpAttempts: 0,
    });

    return { resetToken };
  }

 async validateOAuthUser(googleUser: {
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  id: string;
}): Promise<UserDocument> { // Return UserDocument instead of User
  let user = await this.usersService.findByEmail(googleUser.email) as UserDocument;

  if (!user) {
    // Create new user without password for Google OAuth
    user = await this.usersService.createUser({
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      imageUrl: googleUser.picture,
      googleId: googleUser.id,
      password: undefined, // Use undefined instead of null
      status: UserStatus.APPROVED,
    }) as UserDocument;
  } else if (!user.googleId) {
    // Update existing user with Google ID
    user.googleId = googleUser.id;
    user.imageUrl = googleUser.picture;
    await user.save();
  }

  return user;
}

async googleLogin(user: UserDocument) { // Accept UserDocument
  const tokens = await this.getTokens(user.id.toString(), user.email, user.role);
  await this.usersService.updateRefreshToken(
    user.id.toString(),
    await bcrypt.hash(tokens.refreshToken, 10),
  );
  return tokens;
}

  // Reset password using resetToken
  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(dto.resetToken, {
        secret: this.config.get<string>('JWT_RESET_SECRET'),
      });
    } catch (err) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new BadRequestException('User no longer exists');

    if (user.status === UserStatus.BLOCKED)
      throw new ForbiddenException('Account is blocked');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.refreshToken = null;
    await user.save();

    return { message: 'Password reset successful' };
  }
}
