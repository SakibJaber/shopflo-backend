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
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = await this.subcategoryModel.db.startSession();
      try {
        session.startTransaction();

        // 1. Check if category exists
        const category = await this.categoryModel
          .findById(createSubcategoryDto.category)
          .session(session);
        if (!category) {
          throw new NotFoundException(
            `Category with ID ${createSubcategoryDto.category} not found`,
          );
        }

        // 2. Generate slug
        const baseSlug = createSubcategoryDto.slug
          ? slugify(createSubcategoryDto.slug)
          : slugify(createSubcategoryDto.name);
        const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

        // 3. Handle file upload
        let imageUrl: string | undefined;
        if (file) {
          imageUrl = await this.fileUploadService.handleUpload(file);
        }

        // 4. Create subcategory
        const [createdSubcategory] = await this.subcategoryModel.create(
          [
            {
              ...createSubcategoryDto,
              slug: uniqueSlug,
              imageUrl,
            },
          ],
          { session },
        );

        // 5. Add subcategory ID to category's subcategories array
        await this.categoryModel.findByIdAndUpdate(
          createSubcategoryDto.category,
          { $push: { subcategories: createdSubcategory._id } },
          { session, new: true },
        );

        // 6. Commit transaction
        await session.commitTransaction();

        // 7. Populate and return
        const populatedSubcategory = await this.subcategoryModel
          .findById(createdSubcategory._id)
          .populate('category', 'name slug');

        if (!populatedSubcategory) {
          throw new NotFoundException('Subcategory not found after creation');
        }
        return populatedSubcategory;
      } catch (error) {
        await session.abortTransaction();

        // Retry only on specific transient errors
        if (attempt < maxRetries && this.isTransientTransactionError(error)) {
          lastError = error;
          // Wait before retrying (exponential backoff optional)
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          continue;
        }

        // Handle specific errors or throw the last error
        if (error?.code === 11000) {
          throw new ConflictException({
            statusCode: HttpStatus.CONFLICT,
            message: 'Subcategory slug already exists',
          });
        }
        // Re-throw if it's a known exception (like NotFoundException)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
        throw new InternalServerErrorException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Subcategory creation failed',
        });
      } finally {
        session.endSession();
      }
    }
    throw lastError;
  }

  private isTransientTransactionError(error: any): boolean {
    // Check for error codes or messages indicating a transient issue
    return (
      error.code === 246 || // Example transient error code
      error.codeName === 'SnapshotUnavailable' ||
      error.message?.includes('please retry your operation') ||
      error.message?.includes('TransientTransactionError')
    );
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
    const session = await this.subcategoryModel.db.startSession();
    session.startTransaction();

    try {
      const existing = await this.subcategoryModel
        .findById(id)
        .session(session);
      if (!existing) {
        throw new NotFoundException(`Subcategory with ID ${id} not found`);
      }

      const oldCategoryId = existing.category.toString();

      // Handle category change
      if (updateSubcategoryDto.category) {
        if (!isValidObjectId(updateSubcategoryDto.category)) {
          throw new BadRequestException('category must be a valid ObjectId.');
        }

        const newCategoryId = updateSubcategoryDto.category.toString();

        // Check if new category exists
        const newCategory = await this.categoryModel
          .findById(newCategoryId)
          .session(session);
        if (!newCategory) {
          throw new NotFoundException(
            `Category with ID ${updateSubcategoryDto.category} not found`,
          );
        }

        // Remove from old category and add to new category if category changed
        if (oldCategoryId !== newCategoryId) {
          await this.categoryModel.findByIdAndUpdate(
            oldCategoryId,
            { $pull: { subcategories: existing._id } },
            { session },
          );

          await this.categoryModel.findByIdAndUpdate(
            newCategoryId,
            { $push: { subcategories: existing._id } },
            { session },
          );
        }
      }

      // Handle slug update
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

      // Handle image update
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

      // Update subcategory
      existing.set({
        ...updateSubcategoryDto,
        slug: nextSlug,
        imageUrl,
      });

      await existing.save({ session });
      await session.commitTransaction();

      // Populate for response
      const updated = await this.subcategoryModel
        .findById(id)
        .populate('category', 'name slug')
        .lean();

      return updated as Subcategory;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async remove(id: string): Promise<void> {
    const session = await this.subcategoryModel.db.startSession();
    session.startTransaction();

    try {
      const subcategory = await this.subcategoryModel
        .findById(id)
        .session(session);
      if (!subcategory) {
        throw new NotFoundException(`Subcategory with ID ${id} not found`);
      }

      // Remove subcategory ID from category's subcategories array
      await this.categoryModel.findByIdAndUpdate(
        subcategory.category,
        { $pull: { subcategories: subcategory._id } },
        { session },
      );

      // Delete the subcategory
      await this.subcategoryModel.findByIdAndDelete(id).session(session);

      // Delete associated image if exists
      if (subcategory.imageUrl) {
        await this.fileUploadService.deleteFile(subcategory.imageUrl);
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
