import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Inject,
  forwardRef,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserStatus } from 'src/common/enum/user.status.enum';
import { User, UserDocument } from 'src/modules/users/schema/user.schema';
import { NotificationPriority } from '../notifications/schema/notification.schema';
import { NotificationService } from 'src/modules/notifications/notifications.service';
import { NotificationType } from 'src/common/enum/notification_type.enum';
import { Role } from 'src/common/enum/user_role.enum';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationService: NotificationService,
    private fileUploadService: FileUploadService,
  ) {}

  private assertCanMutate(user: UserDocument, currentUser?: any) {
    if (!currentUser) return;
    if (currentUser.role === Role.ADMIN) return;

    const userId = (user._id as Types.ObjectId).toString();
    if (userId !== currentUser.userId) {
      throw new ForbiddenException('You are not allowed to modify this user');
    }
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email }).exec();
  }

  async findAllByRole(role: string) {
    return this.userModel.find({ role }).exec();
  }

  async findById(id: string) {
    return await this.userModel.findById(id);
  }

  async findByStatus(status: UserStatus) {
    return await this.userModel.find({ status }).exec();
  }

  async updateStatus(id: string, status: UserStatus) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    const previousStatus = user.status;
    (user as any).status = status;

    // Handle blocking/unblocking logic
    if (status === UserStatus.BLOCKED) {
      // Clear the refresh token
      (user as any).refreshToken = null;

      // Send notification to the user
      try {
        await this.notificationService.createNotification({
          recipient: (user as any)._id?.toString(),
          title: 'Account Blocked',
          message:
            'Your account has been blocked by an administrator. Please contact support for more information.',
          type: NotificationType.ACCOUNT_BLOCKED,
          priority: NotificationPriority.HIGH,
          metadata: {
            blockedTime: new Date().toISOString(),
            status: 'BLOCKED',
          },
        });
      } catch (notificationError) {
        console.error(
          'Failed to send account blocked notification:',
          notificationError,
        );
      }
    } else if (
      status === UserStatus.APPROVED &&
      previousStatus === UserStatus.BLOCKED
    ) {
      //  NOTIFICATION: Notify user about account unblocking
      try {
        await this.notificationService.createNotification({
          recipient: (user as any)._id?.toString(),
          title: 'Account Unblocked',
          message: 'Your account has been unblocked. You can now login.',
          type: NotificationType.ACCOUNT_UNBLOCKED,
          priority: NotificationPriority.HIGH,
          metadata: {
            unblockedTime: new Date().toISOString(),
            status: 'APPROVED',
          },
        });
      } catch (notificationError) {
        console.error(
          'Failed to send account unblocked notification:',
          notificationError,
        );
      }
    }

    await (user as any).save();

    return { message: `User status updated to ${status}` };
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    return await this.userModel.findByIdAndUpdate(id, { refreshToken });
  }

  async updateUser(
    id: string,
    data: UpdateUserDto,
    file?: Express.Multer.File,
    currentUser?: any,
  ): Promise<UserDocument> {
    // this.assertValidObjectId(id, 'user');

    try {
      const user = await this.userModel.findById(id);
      if (!user) throw new NotFoundException('User not found');

      // Ownership / admin check
      this.assertCanMutate(user, currentUser);

      // Upload new image if provided
      if (file) {
        // Delete old image if exists
        if (user.imageUrl) {
          try {
            await this.fileUploadService.deleteFile(user.imageUrl);
          } catch (deleteError) {
            console.error('Failed to delete old user image:', deleteError);
            // Continue with upload even if deletion fails
          }
        }

        // Upload new image
        const imageUrl = await this.fileUploadService.handleUpload(file);
        user.imageUrl = imageUrl;
      }

      // Update other fields
      const allowedFields = ['firstName', 'lastName', 'phone'];
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          user[field] = data[field];
        }
      }

      // Only admin can update role and status
      if (currentUser?.role === Role.ADMIN) {
        if (data.role !== undefined) user.role = data.role;
        if (data.status !== undefined) user.status = data.status;
      }

      const updatedUser = await user.save();

      // Notify admins about user profile update (if updated by admin)
      if (currentUser?.role === Role.ADMIN && currentUser.userId !== id) {
        try {
          const adminUsers = await this.getAdminUsers();
          const adminIds = adminUsers
            .map((a) => (a._id as Types.ObjectId).toString())
            .filter(Boolean) as string[];

          for (const adminId of adminIds) {
            if (adminId === currentUser.userId) continue; // Skip the current admin

            await this.notificationService.createNotification({
              recipient: adminId,
              title: 'User Profile Updated',
              message: `User ${user.firstName} ${user.lastName}'s profile has been updated by an administrator.`,
              type: NotificationType.SYSTEM_ALERT,
              priority: NotificationPriority.LOW,
              metadata: {
                userId: id,
                updatedBy: currentUser.userId,
                updatedFields: Object.keys(data),
              },
              relatedId: id,
              relatedModel: 'User',
            });
          }
        } catch (notifyErr) {
          console.error('Failed to send user update notification:', notifyErr);
        }
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Update user error:', error);
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async toggleBlockStatus(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    const isBlocked = user.status === UserStatus.BLOCKED;
    const newStatus = isBlocked ? UserStatus.APPROVED : UserStatus.BLOCKED;

    await this.updateStatus(id, newStatus);

    return {
      message: `User ${isBlocked ? 'unblocked' : 'blocked'} successfully`,
      user,
    };
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return await (user as any).save();
  }

  async findAll(filters?: {
    roles?: string[];
    statuses?: UserStatus[];
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { roles, statuses, search, page = 1, limit = 10 } = filters || {};
    const query: any = {};

    if (roles && roles.length > 0) {
      query.role = { $in: roles };
    }
    if (statuses && statuses.length > 0) {
      query.status = { $in: statuses };
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    try {
      const users = await this.userModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .select('-password -refreshToken')
        .exec();

      const total = await this.userModel.countDocuments(query);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          usersPerPage: limit,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch users');
    }
  }

  // Delete a user permanently
  async deleteUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 🔔 NOTIFICATION: Notify user about account deletion (if needed)
    try {
      await this.notificationService.createNotification({
        recipient: (user as any)._id?.toString(),
        title: 'Account Deleted',
        message: 'Your account has been permanently deleted from our system.',
        type: NotificationType.ACCOUNT_DELETED,
        priority: NotificationPriority.HIGH,
      });
    } catch (notificationError) {
      console.error(
        'Failed to send account deletion notification:',
        notificationError,
      );
    }

    const result = await this.userModel.findByIdAndDelete(id);
    return result;
  }

  async getAdminUsers(): Promise<UserDocument[]> {
    // FIX: role must use enum; filter by approved status (no isActive field in schema)
    return this.userModel
      .find({ role: Role.ADMIN, status: UserStatus.APPROVED })
      .exec();
  }
}
