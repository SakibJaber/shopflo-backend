import {
  Controller,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Get,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleAuthGuard } from 'src/common/guards/google.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UseGlobalFileInterceptor({ fieldName: 'image' })
  async signup(
    @Body() dto: SignupAuthDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const result = await this.authService.signup(dto, file);
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Account created successfully',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        data: null,
      });
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginAuthDto) {
    try {
      const tokens = await this.authService.login(dto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        data: tokens,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        data: null,
      });
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      await this.authService.forgotPassword(dto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'OTP sent to your email successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  // Email verification endpoints
  @Post('email/send-verification')
  @HttpCode(HttpStatus.OK)
  async sendEmailVerification(@Body() dto: { email: string }) {
    try {
      await this.authService.sendEmailVerificationOtp(dto.email);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Verification OTP sent successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyOtpDto) {
    try {
      const result = await this.authService.verifyEmailOtp(dto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: result.message,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  // Password-reset OTP verification (returns resetToken)
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    try {
      const result = await this.authService.verifyOtp(dto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'OTP verified successfully',
        data: result, // { resetToken }
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(dto);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Password reset successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    try {
      const result = await this.authService.changePassword(
        req.user.userId,
        dto,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: result.message,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    try {
      const token = req.get('authorization')?.replace('Bearer ', '').trim();
      const result = await this.authService.logout(req.user.userId, token);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: result.message,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any) {
    try {
      const tokens = await this.authService.refreshTokens(
        req.user.userId,
        req.user.refreshToken,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Tokens refreshed successfully',
        data: tokens,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // This will automatically redirect to Google OAuth
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    try {
      const tokens = await this.authService.googleLogin(req.user);

      // Secure approach: Set HTTP-only cookies
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: any) {
    try {
      const user = await this.authService.getUserProfile(req.user.userId);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Profile fetched successfully',
        data: user,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }
}
