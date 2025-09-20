import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Blog, BlogDocument } from './schema/blog.schema';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class BlogsService {
  constructor(
    @InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(
    dto: CreateBlogDto,
    file?: Express.Multer.File,
    user?: UserPayload,
  ): Promise<Blog> {
    if (!user?.userId) {
      throw new BadRequestException(
        'Authenticated user required to create a blog',
      );
    }

    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.fileUploadService.handleUpload(file);
    }

    const createdBlog = await this.blogModel.create({
      ...dto,
      imageUrl,
      author: user.userId,
    });
    return createdBlog;
  }

  async findAll(query: QueryBlogDto) {
    const {
      search,
      isVisible,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
      skip,
    } = query;

    const filter: FilterQuery<BlogDocument> = {};

    if (isVisible === 'true' || isVisible === 'false') {
      filter.isVisible = isVisible === 'true';
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $in: [search] } },
      ];
    }

    const validSortFields = ['title', 'createdAt', 'updatedAt'];
    if (!validSortFields.includes(sortBy)) {
      throw new BadRequestException(`Invalid sort field: ${sortBy}`);
    }

    const sort: { [key: string]: 1 | -1 } = {
      [sortBy]: order === 'asc' ? 1 : -1,
    };

    const effectiveSkip = typeof skip === 'number' ? skip : (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.blogModel
        .find(filter)
        .populate('author', 'firstName lastName email')
        .sort(sort)
        .skip(effectiveSkip)
        .limit(limit)
        .lean(),
      this.blogModel.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        total,
        page: Math.floor(effectiveSkip / limit) + 1,
        limit,
        skip: effectiveSkip,
        sortBy,
        order,
      },
    };
  }

  async findOne(id: string): Promise<Blog> {
    const found = await this.blogModel
      .findById(id)
      .populate('author', 'firstName lastName email')
      .lean();
    if (!found) throw new NotFoundException('Blog post not found');
    return found as Blog;
  }

  async update(
    id: string,
    dto: UpdateBlogDto,
    file?: Express.Multer.File,
  ): Promise<Blog> {
    const existing = await this.blogModel.findById(id);
    if (!existing) throw new NotFoundException('Blog post not found');

    // Handle file upload only if file is provided
    if (file) {
      const imageUrl = await this.fileUploadService.handleUpload(file);
      existing.set({ ...dto, imageUrl });
    } else {
      // update only other fields, leave imageUrl unchanged
      existing.set(dto);
    }

    await existing.save();
    return existing.toObject() as Blog;
  }

  async remove(id: string): Promise<void> {
    const res = await this.blogModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Blog post not found');
  }
}
