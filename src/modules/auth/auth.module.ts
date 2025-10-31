import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { GoogleStrategy } from 'src/modules/auth/strategy/google.strategy';
import { JwtRefreshStrategy } from 'src/modules/auth/strategy/jwt-refresh.strategy';
import { JwtStrategy } from 'src/modules/auth/strategy/jwt.strategy';
import { MailModule } from 'src/modules/mail/mail.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { UsersModule } from 'src/modules/users/users.module';
import {
  TokenBlacklist,
  TokenBlacklistSchema,
} from 'src/modules/users/schema/token-blacklist.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
    ]),
    UsersModule,
    PassportModule,
    MailModule,
    NotificationsModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        expiresIn: config.get<string>('JWT_ACC_EXPIRATION'),
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, GoogleStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
