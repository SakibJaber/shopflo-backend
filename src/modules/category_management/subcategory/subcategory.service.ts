import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, isValidObjectId } from 'mongoose';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import {
  Subcategory,
  SubcategoryDocument,
} from 'src/modules/category_management/subcategory/schema/subcategory.schema';
import { Category } from 'src/modules/category_management/categories/schema/category.schema';

@Injectable()
export class SubcategoryService {
  constructor(
    @InjectModel(Subcategory.name)
    private readonly subcategoryModel: Model<Subcategory>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
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

      // Make sure parentCategoryId is valid
      const category = await this.categoryModel.findById(
        createSubcategoryDto.parentCategoryId,
      );
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${createSubcategoryDto.parentCategoryId} not found`,
        );
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
    search?: string,
  ) {
        
    const filter: FilterQuery<SubcategoryDocument> = {};

    if (search) {
      // Use $text search to query the name and slug fields
      filter.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    if (parentCategoryId) {
      filter.parentCategoryId = parentCategoryId; // Filter by parentCategoryId if provided
    }

    const [data, total] = await Promise.all([
      this.subcategoryModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .populate('parentCategoryId', 'name slug') // Populate the category field
        .exec(),
      this.subcategoryModel.countDocuments(filter).exec(),
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
    const subcategory = await this.subcategoryModel
      .findById(id)
      .populate('parentCategoryId') // Populate the category field
      .exec();

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
    // Validate parentCategoryId
    if (
      !updateSubcategoryDto.parentCategoryId ||
      !isValidObjectId(updateSubcategoryDto.parentCategoryId)
    ) {
      throw new BadRequestException(
        'parentCategoryId is required and must be a valid ObjectId.',
      );
    }

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
