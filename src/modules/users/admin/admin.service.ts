import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from 'src/modules/users/admin/admin.schema';
import { CreateAdminDto } from 'src/modules/users/admin/dto/create-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {}

  async create(dto: CreateAdminDto) {
    const existing = await this.adminModel.findOne({ email: dto.email });
    if (existing) throw new ConflictException('Admin already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const created = new this.adminModel({ ...dto, password: hashedPassword });
    return created.save();
  }

  async findAll() {
    return this.adminModel.find().select('-password');
  }

  async delete(id: string) {
    const result = await this.adminModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Admin not found');
    return { message: 'Admin deleted successfully' };
  }
}
