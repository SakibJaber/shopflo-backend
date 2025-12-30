import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/modules/users/users.service';
import { MailService } from 'src/modules/mail/mail.service';
import { NotificationService } from 'src/modules/notifications/notifications.service';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { JwtPayload } from 'src/common/interface/jwtPayload.interface';
import { UserStatus } from 'src/common/enum/user.status.enum';
import { Role } from 'src/common/enum/user_role.enum';
import { UserDocument } from 'src/modules/users/schema/user.schema';
import {
  TokenBlacklist,
  TokenBlacklistDocument,
} from 'src/modules/users/schema/token-blacklist.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { NotificationType } from 'src/common/enum/notification_type.enum';
import { NotificationPriority } from 'src/modules/notifications/schema/notification.schema';

@Injectable()
export class AuthService {
  private readonly otpExpiryMs: number;

  constructor(
    @InjectModel(TokenBlacklist.name)
    private readonly blacklistModel: Model<TokenBlacklistDocument>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly fileUploadService: FileUploadService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    this.otpExpiryMs =
      (+this.config.get<number>('OTP_EXPIRATION_MINUTES')! || 15) * 60 * 1000;
  }

  // Helper method to sanitize sensitive user data
  private sanitize(user: UserDocument) {
    const { password, refreshToken, ...safe } = user.toObject({
      getters: true,
      virtuals: false,
    });
    return safe;
  }

  // Method to sign JWT tokens (accessToken and refreshToken)
  private async signTokens(userId: string, email: string, role: string | Role) {
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

  // Helper method to generate a 6-digit OTP code
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  }

  // Signup & Email Verification
  async signup(dto: SignupAuthDto, file?: Express.Multer.File) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ForbiddenException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.fileUploadService.handleUpload(file);
    }

    // Create the user as UNBLOCKED but not verified (email verification required)
    const createdUser = await this.usersService.createUser({
      ...dto,
      password: passwordHash,
      imageUrl,
      status: UserStatus.UNBLOCKED,
      isVerified: false,
    });

    // Fetch the user document to get full mongoose document functionality
    const user = await this.usersService.findByEmail(createdUser.email);
    if (!user) {
      throw new InternalServerErrorException('Failed to retrieve created user');
    }

    // Generate email verification OTP
    const code = this.generateCode();
    user.emailVerificationCodeHash = await bcrypt.hash(code, 10);
    user.emailVerificationExpires = new Date(Date.now() + this.otpExpiryMs);
    await user.save();

    // Send the verification email
    try {
      await this.mailService.sendEmailVerificationOtp(user.email, code);
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }

    // Notify admins about the new user registration
    try {
      const adminUsers = await this.usersService.getAdminUsers();
      const adminIds = adminUsers.map((admin) => admin._id?.toString());

      if (user._id) {
        await this.notificationService.notifyNewUser({
          userId: user._id.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          adminIds: adminIds.filter((id) => id) as string[],
        });
      }
    } catch (notificationError) {
      console.error('Failed to send new user notification:', notificationError);
    }

    return { user: this.sanitize(user) };
  }

  // Send the email verification OTP to the user
  async sendEmailVerificationOtp(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const code = this.generateCode();
    user.emailVerificationCodeHash = await bcrypt.hash(code, 10);
    user.emailVerificationExpires = new Date(Date.now() + this.otpExpiryMs);
    await user.save();

    await this.mailService.sendEmailVerificationOtp(email, code);
  }

  // Verify the email using the OTP code
  async verifyEmailOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (
      !user ||
      !user.emailVerificationCodeHash ||
      !user.emailVerificationExpires
    ) {
      throw new BadRequestException(
        'Verification code not found or expired. Please request a new code',
      );
    }

    if (user.emailVerificationExpires < new Date()) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new code',
      );
    }

    const ok = await bcrypt.compare(
      dto.code.toString(),
      user.emailVerificationCodeHash,
    );
    if (!ok) {
      throw new BadRequestException('Invalid verification code');
    }

    // Update user as verified
    user.isVerified = true;
    (user as any).emailVerifiedAt = new Date(); // Add this field to your schema if needed
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send confirmation email
    try {
      await this.mailService.sendEmail(
        user.email,
        'Email Verified',
        'Your email has been successfully verified.',
      );
    } catch {
      // Ignore email failure
    }

    // Notify about email verification
    try {
      if (user._id) {
        await this.notificationService.createNotification({
          recipient: user._id.toString(),
          title: 'Email Verified Successfully',
          message: 'Your email address has been verified successfully.',
          type: NotificationType.SYSTEM_ALERT,
          priority: NotificationPriority.MEDIUM,
        });
      }
    } catch (notificationError) {
      console.error(
        'Failed to send email verification notification:',
        notificationError,
      );
    }

    return { message: 'Email verified successfully' };
  }

  // Login & Token Management
  async login(dto: LoginAuthDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Account status checks
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException('Your account is pending approval');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email address to continue',
      );
    }

    if (!user._id) {
      throw new InternalServerErrorException('User ID not found');
    }

    const tokens = await this.signTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.usersService.updateRefreshToken(
      user._id.toString(),
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    // Notify successful login
    try {
      await this.notificationService.createNotification({
        recipient: user._id.toString(),
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

  // Refresh the JWT tokens
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied - Invalid refresh token');
    }

    const match = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!match) {
      throw new ForbiddenException('Invalid refresh token');
    }

    if (!user._id) {
      throw new InternalServerErrorException('User ID not found');
    }

    const tokens = await this.signTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.usersService.updateRefreshToken(
      user._id.toString(),
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    return tokens;
  }

  // Blacklist a token (log out the user)
  async blacklistToken(token: string) {
    try {
      const decoded = this.jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return;

      const expiresAt = new Date(decoded.exp * 1000);
      await this.blacklistModel.create({ token, expiresAt });
    } catch (err) {
      console.error('Failed to blacklist token:', err);
    }
  }

  // Check if a token is blacklisted
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const found = await this.blacklistModel.exists({ token });
    return !!found;
  }

  // Logout a user by revoking the refresh token
  async logout(userId: string, token?: string) {
    await this.usersService.updateRefreshToken(userId, null);
    if (token) await this.blacklistToken(token);

    return { message: 'Logged out successfully' };
  }

  // Password Management
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.refreshToken = null; // Revoke all sessions
    await user.save();

    // Optional: Send email notification for password change
    try {
      await this.mailService.sendEmail(
        user.email,
        'Your password was changed',
        "Your password has been updated. If this wasn't you, reset it immediately and contact support.",
      );
    } catch {
      // Ignore email failure
    }

    return { message: 'Password changed successfully' };
  }

  // Password Reset
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('No account found with this email address');
    }

    const code = this.generateCode();
    user.resetPasswordCodeHash = await bcrypt.hash(code, 10);
    user.resetPasswordExpires = new Date(Date.now() + this.otpExpiryMs);
    await user.save();

    await this.mailService.sendResetPasswordOtp(dto.email, code);
    return { message: 'OTP sent to your email' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;

    try {
      // Verify the reset token
      payload = await this.jwt.verifyAsync(dto.resetToken, {
        secret: this.config.get<string>('JWT_RESET_SECRET'),
      });
    } catch (error) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'Invalid or expired reset token. Please request a new password reset.',
      });
    }

    // Support both payload styles (sub or userId)
    const userId = payload.userId || payload.sub;
    if (!userId) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'Invalid token payload. Please request a new password reset link.',
      });
    }

    // Fetch the user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'User account no longer exists.',
      });
    }

    // Ensure account is active
    if (
      user.status === UserStatus.BLOCKED ||
      user.status === UserStatus.REJECTED
    ) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: `Cannot reset password. Account is ${user.status.toLowerCase()}.`,
      });
    }

    // Hash and update password
    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.refreshToken = null; // revoke active sessions
    await user.save();

    // Optionally notify user
    try {
      await this.mailService.sendEmail(
        user.email,
        'Your password has been reset',
        'Your password has been successfully updated. If this was not you, please contact support immediately.',
      );
    } catch {
      // Don’t block if email fails
    }

    return {
      message: 'Password reset successful',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.resetPasswordCodeHash || !user.resetPasswordExpires) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    const match = await bcrypt.compare(
      dto.code.toString(),
      user.resetPasswordCodeHash,
    );
    if (!match) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user._id) {
      throw new InternalServerErrorException('User ID not found');
    }

    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const resetToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_RESET_SECRET'),
      expiresIn: '1h',
    });

    user.resetPasswordCodeHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    return { resetToken };
  }

  async googleLogin(user: UserDocument) {
    if (!user._id) {
      throw new InternalServerErrorException('User ID not found');
    }

    const tokens = await this.signTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.usersService.updateRefreshToken(
      user._id.toString(),
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    try {
      await this.notificationService.createNotification({
        recipient: user._id.toString(),
        title: 'Google Login Successful',
        message: 'You have logged in successfully using Google.',
        type: NotificationType.GOOGLE_OAUTH,
        priority: NotificationPriority.LOW,
      });
    } catch (notificationError) {
      console.error(
        'Failed to send Google login notification:',
        notificationError,
      );
    }

    return tokens;
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.sanitize(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const updatedUser = await this.usersService.updateUser(userId, dto, file, {
      userId,
      role: Role.USER,
    });
    return this.sanitize(updatedUser);
  }

  // OAuth validation method for Google Strategy
  async validateOAuthUser(oauthProfile: {
    email: any;
    firstName: any;
    lastName: any;
    picture: any;
    id: any;
  }) {
    // Find existing user or create new one
    let user = await this.usersService.findByEmail(oauthProfile.email);

    if (!user) {
      // Create new user for OAuth login
      const createdUser = await this.usersService.createUser({
        email: oauthProfile.email,
        firstName: oauthProfile.firstName,
        lastName: oauthProfile.lastName,
        imageUrl: oauthProfile.picture,
        password: '', // OAuth users don't have a password
        role: Role.USER, // Default role
        isVerified: true, // OAuth emails are pre-verified
        status: UserStatus.UNBLOCKED,
      });

      // Fetch the created user as a document
      user = await this.usersService.findByEmail(createdUser.email);
      if (!user) {
        throw new InternalServerErrorException('Failed to retrieve OAuth user');
      }
    }

    // Ensure user is properly validated and has necessary fields
    if (!user._id) {
      throw new InternalServerErrorException('User ID not found');
    }

    return user;
  }
}
