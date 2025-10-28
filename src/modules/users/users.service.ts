import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserStatus } from 'src/common/enum/user.status.enum';
import { User, UserDocument } from 'src/modules/users/schema/user.schema';
import { NotificationPriority } from '../notifications/schema/notification.schema';
import { NotificationService } from 'src/modules/notifications/notifications.service';
import { NotificationType } from 'src/common/enum/notification_type.enum';
import { Role } from 'src/common/enum/user_role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationService: NotificationService,
  ) {}

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

    (user as any).status = status;

    // Revoke tokens when blocking
    if (status === UserStatus.BLOCKED) {
      (user as any).refreshToken = null;

      // 🔔 NOTIFICATION: Notify user about account blocking
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
    }

    await (user as any).save();

    return { message: `User status updated to ${status}` };
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    return await this.userModel.findByIdAndUpdate(id, { refreshToken });
  }

  async updateUser(id: string, data: Partial<User>) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, data);
    await (user as any).save();
    return user;
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return await (user as any).save();
  }

  async findAll(filters?: {
    roles?: string[];
    statuses?: UserStatus[];
    page?: number;
    limit?: number;
  }) {
    const { roles, statuses, page = 1, limit = 10 } = filters || {};
    const query: any = {};

    if (roles && roles.length > 0) {
      query.role = { $in: roles };
    }
    if (statuses && statuses.length > 0) {
      query.status = { $in: statuses };
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
