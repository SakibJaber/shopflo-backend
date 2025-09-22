import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, isValidObjectId, Types } from 'mongoose';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { Subcategory, SubcategoryDocument } from './schema/subcategory.schema';
import { Category } from '../categories/schema/category.schema';
import { slugify } from 'src/common/utils/slugify.util';

@Injectable()
export class SubcategoryService {
  constructor(
    @InjectModel(Subcategory.name)
    private readonly subcategoryModel: Model<SubcategoryDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  private async ensureUniqueSlug(slug: string, excludeId?: string) {
    let finalSlug = slug;
    let i = 0;
    const exists = async (s: string) => {
      const filter: FilterQuery<SubcategoryDocument> = { slug: s };
      if (excludeId) filter._id = { $ne: excludeId };
      return this.subcategoryModel.exists(filter);
    };
    while (await exists(finalSlug)) {
      i += 1;
      finalSlug = `${slug}-${i}`;
    }
    return finalSlug;
  }

  async create(
    createSubcategoryDto: CreateSubcategoryDto,
    file?: Express.Multer.File,
  ): Promise<Subcategory> {
    try {
      // Check if category exists
      const category = await this.categoryModel.findById(
        createSubcategoryDto.category,
      );
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${createSubcategoryDto.category} not found`,
        );
      }

      // Generate slug
      const baseSlug = createSubcategoryDto.slug
        ? slugify(createSubcategoryDto.slug)
        : slugify(createSubcategoryDto.name);
      const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

      let imageUrl: string | undefined;
      if (file) {
        imageUrl = await this.fileUploadService.handleUpload(file);
      }

      const created = await this.subcategoryModel.create({
        ...createSubcategoryDto,
        slug: uniqueSlug,
        imageUrl,
      });

      return created;
    } catch (error) {
      if (error?.code === 11000) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Subcategory slug already exists',
        });
      }
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Subcategory creation failed',
      });
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    categoryId: string,
    search?: string,
  ) {
    const filter: FilterQuery<SubcategoryDocument> = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (categoryId) {
      filter.category = categoryId;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.subcategoryModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .sort({ sortOrder: 1, name: 1 })
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

  async findOne(id: string): Promise<Subcategory> {
    const subcategory = await this.subcategoryModel
      .findById(id)
      .populate('category', 'name slug')
      .exec();

    if (!subcategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }
    return subcategory;
  }

  async update(
    id: string,
    updateSubcategoryDto: UpdateSubcategoryDto,
    file?: Express.Multer.File,
  ): Promise<Subcategory> {
    const existing = await this.findOne(id);
    const oldCategoryId = existing.category.toString();

    if (updateSubcategoryDto.category) {
      if (!isValidObjectId(updateSubcategoryDto.category)) {
        throw new BadRequestException('category must be a valid ObjectId.');
      }

      updateSubcategoryDto.category = new Types.ObjectId(
        updateSubcategoryDto.category,
      );
      const category = await this.categoryModel.findById(
        updateSubcategoryDto.category,
      );
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateSubcategoryDto.category} not found`,
        );
      }
    }

    let nextSlug = existing.slug;
    if (updateSubcategoryDto.name && !updateSubcategoryDto.slug) {
      nextSlug = slugify(updateSubcategoryDto.name);
    }
    if (updateSubcategoryDto.slug) {
      nextSlug = slugify(updateSubcategoryDto.slug);
    }
    if (nextSlug !== existing.slug) {
      nextSlug = await this.ensureUniqueSlug(nextSlug, id);
    }

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
      slug: nextSlug,
      imageUrl,
    });

    await existing.save();
    return existing;
  }

  async remove(id: string): Promise<void> {
    const subcategory = await this.findOne(id);
    if (subcategory.imageUrl) {
      await this.fileUploadService.deleteFile(subcategory.imageUrl);
    }

    await this.categoryModel.findByIdAndUpdate(subcategory.category, {
      $pull: { subcategories: subcategory._id },
    });

    await this.subcategoryModel.findByIdAndDelete(id).exec();
  }
}
