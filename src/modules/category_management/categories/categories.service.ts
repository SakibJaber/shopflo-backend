import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Category, CategoryDocument } from './schema/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { slugify } from 'src/common/utils/slugify.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // --- slug helpers (kept from your original) ---
  private async ensureUniqueSlug(slug: string, excludeId?: string) {
    let finalSlug = slug;
    let i = 0;
    const exists = async (s: string) => {
      const filter: FilterQuery<CategoryDocument> = { slug: s };
      if (excludeId) filter._id = { $ne: excludeId };
      return this.categoryModel.exists(filter);
    };
    while (await exists(finalSlug)) {
      i += 1;
      finalSlug = `${slug}-${i}`;
    }
    return finalSlug;
  }

  // --- create with optional image upload & structured error payload ---
  async create(
    dto: CreateCategoryDto,
    file?: Express.Multer.File,
  ): Promise<Category> {
    try {
      const baseSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
      const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

      let imageUrl: string | undefined;
      if (file) {
        imageUrl = await this.fileUploadService.handleUpload(file);
      }

      const created = await this.categoryModel.create({
        ...dto,
        slug: uniqueSlug,
        imageUrl,
      });

      return created.toObject() as Category;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Category slug already exists',
        });
      }
      throw e;
    }
  }

  // --- paginated + search (kept & simplified to your “desired” shape) ---
  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter: FilterQuery<CategoryDocument> = {};

    if (search) {
      // Use $text search to query the name and slug fields
      filter.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ sortOrder: 1, name: 1 }) // stable order
        .skip(skip)
        .limit(limit)
        .lean(),
      this.categoryModel.countDocuments(filter),
    ]);

    return {
      data: data as Category[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Category> {
    const found = await this.categoryModel.findById(id).lean();
    if (!found) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Category with ID ${id} not found`,
      });
    }
    return found as Category;
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    file?: Express.Multer.File,
  ): Promise<Category> {
    const existing = await this.categoryModel.findById(id);
    if (!existing) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Category with ID ${id} not found`,
      });
    }

    // next slug logic
    let nextSlug = existing.slug;
    if (dto.name && !dto.slug) nextSlug = slugify(dto.name);
    if (dto.slug) nextSlug = slugify(dto.slug);
    if (nextSlug !== existing.slug) {
      nextSlug = await this.ensureUniqueSlug(nextSlug, id);
    }

    // image handling (replace + cleanup)
    let imageUrl = existing.imageUrl;
    if (file) {
      const newUrl = await this.fileUploadService.handleUpload(file);
      if (imageUrl && imageUrl !== newUrl) {
        try {
          await this.fileUploadService.deleteFile(imageUrl);
        } catch {
          /* noop */
        }
      }
      imageUrl = newUrl;
    }

    existing.set({ ...dto, slug: nextSlug, imageUrl });

    try {
      await existing.save();
      return existing.toObject() as Category;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Category slug already exists',
        });
      }
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.categoryModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Category with ID ${id} not found`,
      });
    }

    if (deleted.imageUrl) {
      try {
        await this.fileUploadService.deleteFile(deleted.imageUrl);
      } catch {
        /* noop */
      }
    }
  }
}
