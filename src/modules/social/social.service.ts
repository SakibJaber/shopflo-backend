import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SocialMedia } from './schema/social-media.schema';
import { CreateSocialMediaDto } from 'src/modules/social/dto/create-social.dto';
import { UpdateSocialMediaDto } from 'src/modules/social/dto/update-social.dto';

@Injectable()
export class SocialMediaService {
  constructor(
    @InjectModel(SocialMedia.name) private socialMediaModel: Model<SocialMedia>,
  ) {}

  async create(createSocialMediaDto: CreateSocialMediaDto) {
    const createdSocialMedia = new this.socialMediaModel(createSocialMediaDto);
    return await createdSocialMedia.save();
  }

  async findAll() {
    return await this.socialMediaModel
      .find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async findAllForAdmin() {
    return await this.socialMediaModel
      .find()
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const socialMedia = await this.socialMediaModel.findById(id).exec();
    if (!socialMedia) {
      throw new NotFoundException(`Social media with ID ${id} not found`);
    }
    return socialMedia;
  }

  async findByPlatform(platform: string) {
    return await this.socialMediaModel
      .findOne({ platform, isActive: true })
      .exec();
  }

  async update(id: string, updateSocialMediaDto: UpdateSocialMediaDto) {
    const existingSocialMedia = await this.socialMediaModel
      .findByIdAndUpdate(id, updateSocialMediaDto, { new: true })
      .exec();

    if (!existingSocialMedia) {
      throw new NotFoundException(`Social media with ID ${id} not found`);
    }

    return existingSocialMedia;
  }

  async remove(id: string) {
    const result = await this.socialMediaModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Social media with ID ${id} not found`);
    }
    return result;
  }

  async toggleStatus(id: string) {
    const socialMedia = await this.socialMediaModel.findById(id).exec();
    if (!socialMedia) {
      throw new NotFoundException(`Social media with ID ${id} not found`);
    }

    socialMedia.isActive = !socialMedia.isActive;
    return await socialMedia.save();
  }

  async updateOrder(ids: string[]) {
    const bulkOps = ids.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { order: index },
      },
    }));

    await this.socialMediaModel.bulkWrite(bulkOps);
    return await this.findAllForAdmin();
  }
}
