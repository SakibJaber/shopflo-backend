import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
} from '@nestjs/common';
import { TestimonialService } from './testimonial.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { Role } from 'src/common/enum/user_role.enum';
import { Roles } from 'src/common/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';

@Controller('testimonials')
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  create(
    @Body() createTestimonialDto: CreateTestimonialDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.testimonialService.create(createTestimonialDto, file);
  }

  @Get()
  findAll() {
    return this.testimonialService.findAll();
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAllForAdmin() {
    return this.testimonialService.findAllForAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testimonialService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  update(
    @Param('id') id: string,
    @Body() updateTestimonialDto: UpdateTestimonialDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.testimonialService.update(id, updateTestimonialDto, file);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  remove(@Param('id') id: string) {
    return this.testimonialService.remove(id);
  }

  @Patch(':id/toggle-status')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  toggleStatus(@Param('id') id: string) {
    return this.testimonialService.toggleStatus(id);
  }
}
