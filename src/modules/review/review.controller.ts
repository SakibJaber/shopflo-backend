import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Role } from 'src/common/enum/user_role.enum';
import { Roles } from 'src/common/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @Roles(Role.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 5 })
  create(
    @Body() createReviewDto: CreateReviewDto,
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.reviewService.create(createReviewDto, files, req.user);
  }

  @Get()
  findAll() {
    return this.reviewService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 5 })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.reviewService.update(id, updateReviewDto, files);
  }

  @Delete(':id')
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  remove(@Param('id') id: string) {
    return this.reviewService.remove(id);
  }
}
