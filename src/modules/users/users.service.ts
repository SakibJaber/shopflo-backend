import { Injectable, NotFoundException } from '@nestjs/common';
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
}
