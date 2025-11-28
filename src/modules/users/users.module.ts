import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/users/schema/user.schema';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AdminModule,
    NotificationsModule,
    FileUploadModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
