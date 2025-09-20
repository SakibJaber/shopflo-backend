import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/user_role.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async create(
    @Body() dto: CreateBlogDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const newBlog = await this.blogsService.create(dto, file, req.user);
      return {
        success: true,
        statusCode: 201,
        message: 'Blog created successfully',
        data: newBlog,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Failed to create blog',
        data: null,
      };
    }
  }

  @Get()
  async findAll(@Query() query: QueryBlogDto) {
    try {
      const result = await this.blogsService.findAll(query);
      return {
        success: true,
        statusCode: 200,
        message: 'Blogs fetched successfully',
        data: result.items,
        meta: result.meta, // Include the pagination metadata here
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Failed to fetch blogs',
        data: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const blog = await this.blogsService.findOne(id);
      if (!blog) {
        return {
          success: false,
          statusCode: 404,
          message: 'Blog not found',
          data: null,
        };
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Blog fetched successfully',
        data: blog,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Failed to fetch blog',
        data: null,
      };
    }
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const updatedBlog = await this.blogsService.update(id, dto, file);
      return {
        success: true,
        statusCode: 200,
        message: 'Blog updated successfully',
        data: updatedBlog,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Failed to update blog',
        data: null,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const deletedBlog = await this.blogsService.remove(id);
      return {
        success: true,
        statusCode: 200,
        message: 'Blog deleted successfully',
        data: deletedBlog,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 400,
        message: error.message || 'Failed to delete blog',
        data: null,
      };
    }
  }
}
