import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Size, SizeDocument } from './schema/size.schema';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { QuerySizeDto } from './dto/query-size.dto';

@Injectable()
export class SizesService {
  constructor(
    @InjectModel(Size.name) private readonly sizeModel: Model<SizeDocument>,
  ) {}

  private async ensureUniqueName(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    let finalName = name;
    let i = 0;

    const exists = async (n: string) => {
      const filter: FilterQuery<SizeDocument> = { name: n };
      if (excludeId) filter._id = { $ne: excludeId };
      return this.sizeModel.exists(filter);
    };

    while (await exists(finalName)) {
      i += 1;
      finalName = `${name}-${i}`;
    }
    return finalName;
  }

  async create(dto: CreateSizeDto): Promise<Size> {
    const uniqueName = await this.ensureUniqueName(dto.name);

    try {
      const createdSize = await this.sizeModel.create({
        ...dto,
        name: uniqueName,
      });
      return createdSize;
    } catch (e: any) {
      if (e?.code === 11000)
        throw new ConflictException('Size name already exists');
      throw e;
    }
  }

  async findAll(query: QuerySizeDto) {
    const {
      search,
      sortBy = 'name',
      order = 'asc',
      page = 1,
      limit = 20,
      skip,
    } = query;

    const filter: FilterQuery<SizeDocument> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { value: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

    // Pagination: calculate skip if not provided
    const effectiveSkip = skip !== undefined ? skip : (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.sizeModel
        .find(filter)
        .sort(sort)
        .skip(effectiveSkip)
        .limit(limit)
        .lean(),
      this.sizeModel.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        skip: effectiveSkip,
        sortBy,
        order,
      },
    };
  }

  async findOne(id: string): Promise<Size> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ObjectId format');
    }

    const objectId = new Types.ObjectId(id); // Convert to ObjectId
    const found = await this.sizeModel.findById(objectId).lean();
    if (!found) throw new NotFoundException('Size not found');
    return found as Size;
  }

  async update(id: string, dto: UpdateSizeDto): Promise<Size> {
    const existing = await this.sizeModel.findById(id);
    if (!existing) throw new NotFoundException('Size not found');

    existing.set(dto);
    try {
      await existing.save();
      return existing.toObject() as Size;
    } catch (e: any) {
      if (e?.code === 11000)
        throw new ConflictException('Size name already exists');
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    const objectId = new Types.ObjectId(id);
    const res = await this.sizeModel.findByIdAndDelete(objectId);
    if (!res) throw new NotFoundException('Size not found');
  }
}
