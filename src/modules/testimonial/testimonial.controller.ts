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
  HttpStatus,
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
  async create(
    @Body() createTestimonialDto: CreateTestimonialDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const subcategory = await this.testimonialService.create(
        createTestimonialDto,
        file,
      );
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Testimonial created successfully',
        data: subcategory,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to create testimonial',
        data: null,
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const testimonials = await this.testimonialService.findAll();
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Testimonials fetched successfully',
        data: testimonials,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch testimonials',
        data: null,
      };
    }
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAllForAdmin() {
    try {
      const testimonials = await this.testimonialService.findAllForAdmin();
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Testimonials fetched successfully for admin',
        data: testimonials,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to fetch testimonials for admin',
        data: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const testimonial = await this.testimonialService.findOne(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Testimonial fetched successfully',
        data: testimonial,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Testimonial not found',
        data: null,
      };
    }
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async update(
    @Param('id') id: string,
    @Body() updateTestimonialDto: UpdateTestimonialDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const updated = await this.testimonialService.update(
        id,
        updateTestimonialDto,
        file,
      );
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Testimonial updated successfully',
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to update testimonial',
        data: null,
      };
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(@Param('id') id: string) {
    try {
      await this.testimonialService.remove(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Testimonial deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message || 'Testimonial not found',
        data: null,
      };
    }
  }

  @Patch(':id/toggle-status')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async toggleStatus(@Param('id') id: string) {
    try {
      const testimonial = await this.testimonialService.toggleStatus(id);
      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Testimonial status toggled successfully',
        data: testimonial,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to toggle testimonial status',
        data: null,
      };
    }
  }
}
