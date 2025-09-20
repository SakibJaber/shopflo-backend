import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { Testimonial } from './schema/testimonial.schema';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';

@Injectable()
export class TestimonialService {
  constructor(
    @InjectModel(Testimonial.name) private testimonialModel: Model<Testimonial>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // Create a new testimonial
  async create(
    createTestimonialDto: CreateTestimonialDto,
    file?: Express.Multer.File,
  ) {
    try {
      let imageUrl: string | undefined;

      if (file) {
        imageUrl = await this.fileUploadService.handleUpload(file);
      }

      const createdTestimonial = new this.testimonialModel({
        ...createTestimonialDto,
        imageUrl,
      });

      return await createdTestimonial.save();
    } catch (error) {
      throw new InternalServerErrorException('Failed to create testimonial');
    }
  }

  // Get all active testimonials
  async findAll() {
    try {
      return await this.testimonialModel
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch testimonials');
    }
  }

  // Get all testimonials for admin
  async findAllForAdmin() {
    try {
      return await this.testimonialModel.find().sort({ createdAt: -1 }).exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch testimonials for admin',
      );
    }
  }

  // Get a testimonial by ID
  async findOne(id: string) {
    try {
      const testimonial = await this.testimonialModel.findById(id).exec();
      if (!testimonial) {
        throw new NotFoundException(`Testimonial with ID ${id} not found`);
      }
      return testimonial;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch testimonial');
    }
  }

  // Update an existing testimonial
  async update(
    id: string,
    updateTestimonialDto: UpdateTestimonialDto,
    file?: Express.Multer.File,
  ) {
    try {
      const existingTestimonial = await this.testimonialModel
        .findById(id)
        .exec();
      if (!existingTestimonial) {
        throw new NotFoundException(`Testimonial with ID ${id} not found`);
      }

      // Handle image upload if a new file is provided
      if (file) {
        // Delete old image if exists
        if (existingTestimonial.imageUrl) {
          await this.fileUploadService.deleteFile(existingTestimonial.imageUrl);
        }

        // Upload new image
        const imageUrl = await this.fileUploadService.handleUpload(file);
        existingTestimonial.imageUrl = imageUrl;
      }

      // Update other fields
      existingTestimonial.set(updateTestimonialDto);

      return await existingTestimonial.save();
    } catch (error) {
      throw new InternalServerErrorException('Failed to update testimonial');
    }
  }

  // Remove a testimonial
  async remove(id: string) {
    try {
      const testimonial = await this.testimonialModel.findById(id).exec();
      if (!testimonial) {
        throw new NotFoundException(`Testimonial with ID ${id} not found`);
      }

      // Delete associated image if exists
      if (testimonial.imageUrl) {
        await this.fileUploadService.deleteFile(testimonial.imageUrl);
      }

      return await this.testimonialModel.findByIdAndDelete(id).exec();
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete testimonial');
    }
  }

  // Toggle the status of a testimonial (active/inactive)
  async toggleStatus(id: string) {
    try {
      const testimonial = await this.testimonialModel.findById(id).exec();
      if (!testimonial) {
        throw new NotFoundException(`Testimonial with ID ${id} not found`);
      }

      testimonial.isActive = !testimonial.isActive;
      return await testimonial.save();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to toggle testimonial status',
      );
    }
  }
}
