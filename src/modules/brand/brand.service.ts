import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand, BrandDocument } from './schema/brand.schema';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';

@Injectable()
export class BrandService {
  constructor(
    @InjectModel(Brand.name)
    private readonly brandModel: Model<BrandDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(
    createBrandDto: CreateBrandDto,
    file: Express.Multer.File,
  ): Promise<Brand> {
    try {
      const brandLogo = await this.fileUploadService.handleUpload(file);
      const createdBrand = new this.brandModel({
        ...createBrandDto,
        brandLogo,
      });
      return await createdBrand.save();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(query: any) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (search) {
      filter.brandName = { $regex: search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.brandModel.find(filter).skip(skip).limit(limit).exec(),
      this.brandModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandModel.findById(id).exec();

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
    file?: Express.Multer.File,
  ): Promise<Brand> {
    const existing = await this.brandModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Brand not found');
    }

    if (file) {
      if (existing.brandLogo) {
        await this.fileUploadService.deleteFile(existing.brandLogo);
      }
      existing.brandLogo = await this.fileUploadService.handleUpload(file);
    }

    if (updateBrandDto.brandName) {
      existing.brandName = updateBrandDto.brandName;
    }

    await existing.save();
    return existing;
  }

  async remove(id: string): Promise<void> {
    const brand = await this.brandModel.findById(id);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (brand.brandLogo) {
      await this.fileUploadService.deleteFile(brand.brandLogo);
    }

    await this.brandModel.findByIdAndDelete(id).exec();
  }
}
