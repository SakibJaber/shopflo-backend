import {
  Injectable,
  NotFoundException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subcategory } from './schema/subcategory.schema';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';

@Injectable()
export class SubcategoryService {
  constructor(
    @InjectModel(Subcategory.name)
    private readonly subcategoryModel: Model<Subcategory>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // Create subcategory
  async create(
    createSubcategoryDto: CreateSubcategoryDto,
    file?: Express.Multer.File,
  ): Promise<Subcategory> {
    try {
      let imageUrl: string | undefined;
      if (file) {
        imageUrl = await this.fileUploadService.handleUpload(file);
      }

      const created = await this.subcategoryModel.create({
        ...createSubcategoryDto,
        imageUrl,
      });

      return created;
    } catch (error) {
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Subcategory creation failed',
      });
    }
  }

  // Find all subcategories
  async findAll(
    page: number = 1,
    limit: number = 10,
    parentCategoryId: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.subcategoryModel
        .find({ parentCategoryId })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.subcategoryModel.countDocuments({ parentCategoryId }).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Find subcategory by ID
  async findOne(id: string): Promise<Subcategory> {
    const subcategory = await this.subcategoryModel.findById(id).exec();
    if (!subcategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }
    return subcategory;
  }

  // Update subcategory
  async update(
    id: string,
    updateSubcategoryDto: UpdateSubcategoryDto,
    file?: Express.Multer.File,
  ): Promise<Subcategory> {
    const existing = await this.findOne(id);

    let imageUrl = existing.imageUrl;
    if (file) {
      const newUrl = await this.fileUploadService.handleUpload(file);
      if (existing.imageUrl) {
        try {
          await this.fileUploadService.deleteFile(existing.imageUrl);
        } catch {
          /* noop */
        }
      }
      imageUrl = newUrl;
    }

    existing.set({
      ...updateSubcategoryDto,
      imageUrl,
    });

    await existing.save();
    return existing;
  }

  // Remove subcategory
  async remove(id: string): Promise<void> {
    const subcategory = await this.findOne(id);
    if (subcategory.imageUrl) {
      await this.fileUploadService.deleteFile(subcategory.imageUrl);
    }
    await this.subcategoryModel.findByIdAndDelete(id).exec();
  }
}
