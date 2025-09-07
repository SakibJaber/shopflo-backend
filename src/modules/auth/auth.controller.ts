import { Controller, Post, Body, Req, UseGuards, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto } from 'src/modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from 'src/modules/auth/dto/reset-password.dto';
import { VerifyOtpDto } from 'src/modules/auth/dto/verify-otp.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import { GoogleAuthGuard } from 'src/common/guards/google.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupAuthDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }

  @Post('forgot')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  refresh(@Req() req: any) {
    return this.authService.refreshTokens(
      req.user.userId,
      req.user.refreshToken,
    );
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
      
      // Option 1: Redirect with tokens in query params (less secure)
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/success?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
      );

      // Option 2: Set HTTP-only cookies (more secure)
      // res.cookie('accessToken', tokens.accessToken, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   sameSite: 'lax',
      //   maxAge: 60 * 60 * 1000, // 1 hour
      // });
      // 
      // res.cookie('refreshToken', tokens.refreshToken, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   sameSite: 'lax',
      //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      // });
      // 
      // return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${error.message}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    // Return user profile based on JWT
    return {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    };
  }
  
}
