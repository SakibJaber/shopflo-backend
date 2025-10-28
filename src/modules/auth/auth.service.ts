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
import { NotificationPriority } from '../notifications/schema/notification.schema';
import { NotificationService } from 'src/modules/notifications/notifications.service';
import { NotificationType } from 'src/common/enum/notification_type.enum';

@Injectable()
export class AuthService {
  private readonly otpExpiryMs: number;
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private jwt: JwtService,
    private config: ConfigService,
    private notificationService: NotificationService,
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

    // 🔔 NOTIFICATION: Notify admins about new user registration
    try {
      const adminUsers = await this.usersService.getAdminUsers();
      const adminIds = adminUsers.map((admin) =>
        (admin as any)._id?.toString(),
      );

      await this.notificationService.notifyNewUser({
        userId: (user as any)._id?.toString(),
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        adminIds: adminIds.filter((id) => id) as string[], // Filter out undefined
      });
    } catch (notificationError) {
      console.error('Failed to send new user notification:', notificationError);
    }

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

    const tokens = await this.getTokens(
      (user as any)._id?.toString(),
      user.email,
      user.role,
    );
    await this.usersService.updateRefreshToken(
      (user as any)._id?.toString(),
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    // 🔔 NOTIFICATION: Notify about successful login (security notification)
    try {
      await this.notificationService.createNotification({
        recipient: (user as any)._id?.toString(),
        title: 'Login Successful',
        message: 'You have successfully logged into your account.',
        type: NotificationType.LOGIN_SUCCESS,
        priority: NotificationPriority.LOW,
        metadata: {
          loginTime: new Date().toISOString(),
          userAgent: dto.userAgent,
        },
      });
    } catch (notificationError) {
      console.error('Failed to send login notification:', notificationError);
    }

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);

    // 🔔 NOTIFICATION: Notify about logout (security notification)
    try {
      await this.notificationService.createNotification({
        recipient: userId,
        title: 'Logout Successful',
        message: 'You have successfully logged out of your account.',
        type: NotificationType.LOGOUT,
        priority: NotificationPriority.LOW,
        metadata: {
          logoutTime: new Date().toISOString(),
        },
      });
    } catch (notificationError) {
      console.error('Failed to send logout notification:', notificationError);
    }

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

    const tokens = await this.getTokens(
      (user as any)._id?.toString(),
      user.email,
      user.role,
    );
    await this.usersService.updateRefreshToken(
      (user as any)._id?.toString(),
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
    (user as any).resetPasswordCodeHash = hash;
    (user as any).resetPasswordExpires = new Date(
      Date.now() + this.otpExpiryMs,
    );
    await (user as any).save();

    await this.mailService.sendResetPasswordOtp(dto.email, code);

    // 🔔 NOTIFICATION: Notify about password reset request
    try {
      await this.notificationService.createNotification({
        recipient: (user as any)._id?.toString(),
        title: 'Password Reset Requested',
        message:
          'A password reset has been requested for your account. Check your email for the OTP.',
        type: NotificationType.PASSWORD_RESET,
        priority: NotificationPriority.HIGH,
        metadata: {
          requestTime: new Date().toISOString(),
        },
      });
    } catch (notificationError) {
      console.error(
        'Failed to send password reset notification:',
        notificationError,
      );
    }

    return { message: 'OTP sent to your email' };
  }

  // Verify OTP & issue resetToken
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (
      !user ||
      !(user as any).resetPasswordCodeHash ||
      !(user as any).resetPasswordExpires ||
      (user as any).resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('OTP expired or invalid');
    }

    if ((user as any).otpAttempts >= (user as any).maxOtpAttempts) {
      await this.usersService.updateUser((user as any)._id?.toString(), {
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
      (user as any).resetPasswordCodeHash,
    );
    if (!match) {
      await this.usersService.updateUser((user as any)._id?.toString(), {
        otpAttempts: (user as any).otpAttempts + 1,
      });
      throw new BadRequestException(
        `Invalid OTP. ${(user as any).maxOtpAttempts - (user as any).otpAttempts - 1} attempts remaining.`,
      );
    }

    const payload: JwtPayload = {
      userId: (user as any)._id?.toString(),
      email: user.email,
      role: user.role,
    };
    const resetToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_RESET_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACC_EXPIRATION'),
    });

    await this.usersService.updateUser((user as any)._id?.toString(), {
      resetPasswordCodeHash: null,
      resetPasswordExpires: null,
      otpAttempts: 0,
    });

    // 🔔 NOTIFICATION: Notify about successful OTP verification
    try {
      await this.notificationService.createNotification({
        recipient: (user as any)._id?.toString(),
        title: 'OTP Verified',
        message:
          'Your OTP has been verified successfully. You can now reset your password.',
        type: NotificationType.SYSTEM_ALERT,
        priority: NotificationPriority.MEDIUM,
      });
    } catch (notificationError) {
      console.error(
        'Failed to send OTP verification notification:',
        notificationError,
      );
    }

    return { resetToken };
  }

  async validateOAuthUser(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
    id: string;
  }): Promise<UserDocument> {
    let user = (await this.usersService.findByEmail(
      googleUser.email,
    )) as UserDocument;

    if (!user) {
      // Create new user without password for Google OAuth
      user = (await this.usersService.createUser({
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        imageUrl: googleUser.picture,
        googleId: googleUser.id,
        password: undefined,
        status: UserStatus.APPROVED,
      })) as UserDocument;

      // 🔔 NOTIFICATION: Notify admins about new Google OAuth user
      try {
        const adminUsers = await this.usersService.getAdminUsers();
        const adminIds = adminUsers.map((admin) =>
          (admin as any)._id?.toString(),
        );

        await this.notificationService.notifyNewUser({
          userId: (user as any)._id?.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          adminIds: adminIds.filter((id) => id) as string[],
        });
      } catch (notificationError) {
        console.error(
          'Failed to send new Google user notification:',
          notificationError,
        );
      }
    } else if (!(user as any).googleId) {
      // Update existing user with Google ID
      (user as any).googleId = googleUser.id;
      (user as any).imageUrl = googleUser.picture;
      await (user as any).save();

      // 🔔 NOTIFICATION: Notify about Google account linking
      try {
        await this.notificationService.createNotification({
          recipient: (user as any)._id?.toString(),
          title: 'Google Account Linked',
          message: 'Your account has been successfully linked with Google.',
          type: NotificationType.GOOGLE_OAUTH,
          priority: NotificationPriority.MEDIUM,
        });
      } catch (notificationError) {
        console.error(
          'Failed to send Google linking notification:',
          notificationError,
        );
      }
    }

    return user;
  }

  async googleLogin(user: UserDocument) {
    const tokens = await this.getTokens(
      (user as any)._id?.toString(),
      user.email,
      user.role,
    );
    await this.usersService.updateRefreshToken(
      (user as any)._id?.toString(),
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    // 🔔 NOTIFICATION: Notify about Google OAuth login
    try {
      await this.notificationService.createNotification({
        recipient: (user as any)._id?.toString(),
        title: 'Google Login Successful',
        message: 'You have successfully logged in using Google.',
        type: NotificationType.GOOGLE_OAUTH,
        priority: NotificationPriority.LOW,
        metadata: {
          loginTime: new Date().toISOString(),
          loginMethod: 'google',
        },
      });
    } catch (notificationError) {
      console.error(
        'Failed to send Google login notification:',
        notificationError,
      );
    }

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

    const user = await this.usersService.findById(payload.userId);
    if (!user) throw new BadRequestException('User no longer exists');

    if (user.status === UserStatus.BLOCKED)
      throw new ForbiddenException('Account is blocked');

    (user as any).password = await bcrypt.hash(dto.newPassword, 10);
    (user as any).refreshToken = null;
    await (user as any).save();

    // 🔔 NOTIFICATION: Notify about successful password reset
    try {
      await this.notificationService.createNotification({
        recipient: (user as any)._id?.toString(),
        title: 'Password Reset Successful',
        message: 'Your password has been reset successfully.',
        type: NotificationType.PASSWORD_RESET,
        priority: NotificationPriority.HIGH,
        metadata: {
          resetTime: new Date().toISOString(),
        },
      });
    } catch (notificationError) {
      console.error(
        'Failed to send password reset success notification:',
        notificationError,
      );
    }

    return { message: 'Password reset successful' };
  }
}
