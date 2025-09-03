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
    return this.blogsService.create(dto, file, req.user); // Pass the file to the service
  }

  @Get()
  findAll(@Query() query: QueryBlogDto) {
    return this.blogsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogsService.findOne(id);
  }

  @Patch(':id')
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.blogsService.update(id, dto, file); // Pass the file to the service
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogsService.remove(id);
  }
}
