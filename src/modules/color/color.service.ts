import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Color, ColorDocument } from './schema/color.schema';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { QueryColorDto } from './dto/query-color.dto';

@Injectable()
export class ColorsService {
  constructor(
    @InjectModel(Color.name) private readonly colorModel: Model<ColorDocument>,
  ) {}

  private async ensureUniqueName(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    let finalName = name;
    let i = 0;

    const exists = async (n: string) => {
      const filter: FilterQuery<ColorDocument> = { name: n };
      if (excludeId) filter._id = { $ne: excludeId };
      return this.colorModel.exists(filter);
    };

    while (await exists(finalName)) {
      i += 1;
      finalName = `${name}-${i}`;
    }
    return finalName;
  }

  async create(dto: CreateColorDto): Promise<Color> {
    const uniqueName = await this.ensureUniqueName(dto.name);

    try {
      const createdColor = await this.colorModel.create({
        ...dto,
        name: uniqueName,
      });
      return createdColor;
    } catch (e: any) {
      if (e?.code === 11000)
        throw new ConflictException('Color name already exists');
      throw e;
    }
  }

  async findAll(query: QueryColorDto) {
    const {
      search,
      sortBy = 'name',
      order = 'asc',
      page = 1,
      limit = 20,
    } = query;

    const filter: FilterQuery<ColorDocument> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { hexValue: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.colorModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.colorModel.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        skip,
        sortBy,
        order,
      },
    };
  }

  async findOne(id: string): Promise<Color> {
    const found = await this.colorModel.findById(id).lean();
    if (!found) throw new NotFoundException('Color not found');
    return found as Color;
  }

  async update(id: string, dto: UpdateColorDto): Promise<Color> {
    const existing = await this.colorModel.findById(id);
    if (!existing) throw new NotFoundException('Color not found');

    existing.set(dto);
    try {
      await existing.save();
      return existing.toObject() as Color;
    } catch (e: any) {
      if (e?.code === 11000)
        throw new ConflictException('Color name already exists');
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    const res = await this.colorModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Color not found');
  }
}
