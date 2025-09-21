// src/modules/address/address.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address, AddressDocument } from './schema/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
  ) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    // If setting as default, unset any existing default address
    if (createAddressDto.isDefault) {
      await this.addressModel.updateMany(
        { user: new Types.ObjectId(userId), isDefault: true },
        { isDefault: false },
      );
    }

    const address = new this.addressModel({
      ...createAddressDto,
      user: new Types.ObjectId(userId),
    });

    return address.save();
  }

  async findAll(userId: string) {
    return this.addressModel
      .find({ user: new Types.ObjectId(userId), isActive: true })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string) {
    const address = await this.addressModel.findOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(userId: string, id: string, updateAddressDto: UpdateAddressDto) {
    // If setting as default, unset any existing default address
    if (updateAddressDto.isDefault) {
      await this.addressModel.updateMany(
        { user: new Types.ObjectId(userId), isDefault: true },
        { isDefault: false },
      );
    }

    const address = await this.addressModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
      updateAddressDto,
      { new: true, runValidators: true },
    );

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async remove(userId: string, id: string) {
    // Soft delete by setting isActive to false
    const address = await this.addressModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
      { isActive: false },
      { new: true },
    );

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async setDefaultAddress(userId: string, id: string) {
    // Unset any existing default address
    await this.addressModel.updateMany(
      { user: new Types.ObjectId(userId), isDefault: true },
      { isDefault: false },
    );

    // Set the new default address
    const address = await this.addressModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
      { isDefault: true },
      { new: true },
    );

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }
}
