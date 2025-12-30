import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Icon, IconDocument } from './schema/icon.schema';
import { CreateIconDto } from './dto/create-icon.dto';
import { UpdateIconDto } from './dto/update-icon.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';

@Injectable()
export class IconsService {
  constructor(
    @InjectModel(Icon.name)
    private readonly iconModel: Model<IconDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  private async ensureUniqueName(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    let finalName = name;
    let i = 0;
    const exists = async (n: string) => {
      const filter: FilterQuery<IconDocument> = { iconName: n };
      if (excludeId) filter._id = { $ne: excludeId };
      return this.iconModel.exists(filter);
    };

    while (await exists(finalName)) {
      i += 1;
      finalName = `${name}-${i}`;
    }
    return finalName;
  }

  // --- Create with optional icon upload ---
  async create(
    dto: CreateIconDto,
    files?: Express.Multer.File[],
  ): Promise<Icon> {
    try {
      const uniqueName = await this.ensureUniqueName(dto.iconName);
      const iconUrls: string[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          const url = await this.fileUploadService.handleUpload(file);
          iconUrls.push(url);
        }
      }

      const created = await this.iconModel.create({
        iconName: uniqueName,
        iconUrls,
      });

      return created.toObject() as Icon;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Icon name already exists',
        });
      }
      throw e;
    }
  }

  // --- Find all with search + pagination ---
  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<{
    data: Icon[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter: FilterQuery<IconDocument> = {};
    if (search) filter.iconName = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.iconModel
        .find(filter)
        .sort({ iconName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.iconModel.countDocuments(filter),
    ]);

    return {
      data: data as Icon[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Icon> {
    const found = await this.iconModel.findById(id).lean();
    if (!found) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Icon with ID ${id} not found`,
      });
    }
    return found as Icon;
  }

  // --- Update with optional icon file replace ---
  async update(
    id: string,
    dto: UpdateIconDto,
    files?: Express.Multer.File[],
  ): Promise<Icon> {
    const existing = await this.iconModel.findById(id);
    if (!existing) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Icon with ID ${id} not found`,
      });
    }

    let iconUrls = existing.iconUrls || [];
    const existingIconsToKeep = dto.existingIcons || [];

    // Identify icons to delete: those in existing.iconUrls but NOT in existingIconsToKeep
    const iconsToDelete = iconUrls.filter(
      (url) => !existingIconsToKeep.includes(url),
    );

    // Delete removed icons from storage
    if (iconsToDelete.length > 0) {
      for (const url of iconsToDelete) {
        try {
          await this.fileUploadService.deleteFile(url);
        } catch {
          /* ignore cleanup errors */
        }
      }
    }

    // Start with the icons we want to keep
    iconUrls = [...existingIconsToKeep];

    // Upload and add new files
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await this.fileUploadService.handleUpload(file);
        iconUrls.push(url);
      }
    }

    const uniqueName =
      dto.iconName && dto.iconName !== existing.iconName
        ? await this.ensureUniqueName(dto.iconName, id)
        : existing.iconName;

    existing.set({ ...dto, iconName: uniqueName, iconUrls });

    try {
      await existing.save();
      return existing.toObject() as Icon;
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Icon name already exists',
        });
      }
      throw e;
    }
  }

  // --- Remove icon + delete uploaded files ---
  async remove(id: string): Promise<void> {
    const deleted = await this.iconModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Icon with ID ${id} not found`,
      });
    }

    if (deleted.iconUrls && deleted.iconUrls.length > 0) {
      for (const url of deleted.iconUrls) {
        try {
          await this.fileUploadService.deleteFile(url);
        } catch {
          /* ignore cleanup errors */
        }
      }
    }
  }
}
