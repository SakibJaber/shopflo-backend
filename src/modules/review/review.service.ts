import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './schema/review.schema';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(
    createReviewDto: CreateReviewDto,
    files?: Express.Multer.File[],
    user?: any,
  ) {
    try {
      const imageUrls: string[] = [];
      if (files && files.length > 0) {
        // Handle multiple file uploads
        for (const file of files) {
          const url = await this.fileUploadService.handleUpload(file);
          imageUrls.push(url);
        }
      }

      const createdReview = new this.reviewModel({
        ...createReviewDto,
        images: imageUrls,
        user: user?.userId,
      });
      return await createdReview.save();
    } catch (error) {
      throw new InternalServerErrorException('Failed to create review');
    }
  }

  async findAll() {
    try {
      return await this.reviewModel
        .find()
        .populate('user')
        .populate('product')
        .exec();
    } catch (error) {
      console.error('Error fetching all reviews:', error);
      throw new InternalServerErrorException('Failed to fetch reviews');
    }
  }

  async findOne(id: string) {
    try {
      const review = await this.reviewModel
        .findById(id)
        .populate('user')
        .populate('product')
        .exec();
      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }
      return review;
    } catch (error) {
      console.error(`Error fetching review with ID ${id}:`, error);
      throw new InternalServerErrorException('Failed to fetch review');
    }
  }
 
  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    files?: Express.Multer.File[],
    user?: any,
  ) {
    const existingReview = await this.reviewModel.findById(id);
    if (!existingReview) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Handle images if new files are uploaded
    const imageUrls: string[] = existingReview.images || [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await this.fileUploadService.handleUpload(file);
        imageUrls.push(url);
      }
    }

    existingReview.set({
      ...updateReviewDto,
      images: imageUrls,
      user: user?.userId,
    });

    return await existingReview.save();
  }

  async remove(id: string) {
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return await this.reviewModel.findByIdAndDelete(id).exec();
  }
}
