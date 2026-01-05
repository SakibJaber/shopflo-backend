import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './schema/banner.schema';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { UPLOAD_FOLDERS } from 'src/common/constants';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name)
    private readonly bannerModel: Model<BannerDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(
    createBannerDto: CreateBannerDto,
    file?: Express.Multer.File,
  ): Promise<Banner> {
    try {
      let imageUrl: string | undefined;

      // Upload image if provided
      if (file) {
        imageUrl = await this.fileUploadService.handleUpload(
          file,
          UPLOAD_FOLDERS.BANNERS,
        );
      }

      const bannerData = {
        ...createBannerDto,
        image: imageUrl,
      };

      const createdBanner = new this.bannerModel(bannerData);
      return await createdBanner.save();
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create banner');
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [banners, total] = await Promise.all([
      this.bannerModel
        .find()
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bannerModel.countDocuments(),
    ]);

    return {
      data: banners,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerModel.findById(id).exec();
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  async update(
    id: string,
    updateBannerDto: UpdateBannerDto,
    file?: Express.Multer.File,
  ): Promise<Banner> {
    const existingBanner = await this.bannerModel.findById(id);
    if (!existingBanner) {
      throw new NotFoundException('Banner not found');
    }

    // Upload new image if provided
    if (file) {
      // Delete old image if exists
      if (existingBanner.image) {
        await this.fileUploadService.deleteFile(existingBanner.image);
      }
      const imageUrl = await this.fileUploadService.handleUpload(
        file,
        UPLOAD_FOLDERS.BANNERS,
      );

      updateBannerDto.image = imageUrl;
    }

    const updatedBanner = await this.bannerModel
      .findByIdAndUpdate(id, updateBannerDto, { new: true })
      .exec();

    if (!updatedBanner) {
      throw new NotFoundException('Banner not found');
    }

    return updatedBanner;
  }

  async remove(id: string): Promise<void> {
    const banner = await this.bannerModel.findById(id);
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    // Delete associated image
    if (banner.image) {
      await this.fileUploadService.deleteFile(banner.image);
    }

    await this.bannerModel.findByIdAndDelete(id).exec();
  }

  async findActiveBanners(): Promise<Banner[]> {
    return this.bannerModel
      .find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .exec();
  }
}
