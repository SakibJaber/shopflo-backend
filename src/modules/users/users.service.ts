import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserStatus } from 'src/common/enum/user.status.enum';

import { User, UserDocument } from 'src/modules/users/schema/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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

    user.status = status;

    // Revoke tokens when blocking
    if (status === UserStatus.BLOCKED) {
      user.refreshToken = null;
    }

    await user.save();

    return { message: `User status updated to ${status}` };
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    return await this.userModel.findByIdAndUpdate(id, { refreshToken });
  }

  async updateUser(id: string, data: Partial<User>) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, data);
    await user.save();
    return user;
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return await user.save();
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
        .select('-password -refreshToken') // Exclude sensitive fields
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
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
    return result;
  }
}
