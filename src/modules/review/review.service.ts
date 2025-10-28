import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './schema/review.schema';

import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { NotificationService } from 'src/modules/notifications/notifications.service';
import { NotificationType } from 'src/common/enum/notification_type.enum';
import { NotificationPriority } from '../notifications/schema/notification.schema';
import { UsersService } from 'src/modules/users/users.service';
import { Role } from 'src/common/enum/user_role.enum';

import {
  Product,
  ProductDocument,
} from 'src/modules/products/schema/product.schema';

// ---- helper: robust number coercion for multipart/form-data ----
// Accepts "4" or ["4"] or 4, returns number or null if invalid.
function coerceNumber(input: unknown): number | null {
  const v = Array.isArray(input) ? input[0] : input;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly fileUploadService: FileUploadService,
    private readonly notificationService: NotificationService,
    private readonly usersService: UsersService,
  ) {}

  // ---------- Private helpers ----------

  private assertValidObjectId(id: string, field: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${field} id`);
    }
  }

  /** Only the author or an admin can mutate a review. If `user` is not supplied, skip the check. */
  private assertCanMutate(review: Review, user?: any) {
    if (!user) return; // controller guards may already enforce auth; pass user to enforce strict ownership
    if (user.role === Role.ADMIN) return;
    const ownerId = (review.user as any)?.toString?.() ?? String(review.user);
    if (ownerId !== user.userId) {
      throw new ForbiddenException('You are not allowed to modify this review');
    }
  }

  /** Recompute product rating (avg, 2 decimals) and reviewCount. */
  private async recomputeProductStats(productId: string): Promise<void> {
    const [stats] = await this.reviewModel.aggregate([
      { $match: { product: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const avg = stats?.avgRating ?? 0;
    const count = stats?.count ?? 0;

    await this.productModel.findByIdAndUpdate(
      productId,
      { rating: Number(avg.toFixed(2)), reviewCount: count },
      { new: false },
    );
  }

  // ---------- Public API ----------

  async create(
    createReviewDto: CreateReviewDto,
    files?: Express.Multer.File[],
    user?: any,
  ) {
    try {
      // Validate product id and existence
      this.assertValidObjectId(createReviewDto.product, 'product');
      const product = await this.productModel.findById(createReviewDto.product);
      if (!product) throw new NotFoundException('Product not found');

      // Coerce & validate rating (handles multipart form-data)
      const ratingNum = coerceNumber((createReviewDto as any).rating);
      if (ratingNum === null || ratingNum < 1 || ratingNum > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }
      (createReviewDto as any).rating = ratingNum;

      // Enforce one review per user per product
      if (user?.userId) {
        const existing = await this.reviewModel.findOne({
          product: new Types.ObjectId(createReviewDto.product),
          user: new Types.ObjectId(user.userId),
        });
        if (existing) {
          throw new BadRequestException(
            'You have already reviewed this product',
          );
        }
      }

      // Upload images (if any)
      const imageUrls: string[] = [];
      if (files?.length) {
        for (const file of files) {
          imageUrls.push(await this.fileUploadService.handleUpload(file));
        }
      }

      const createdReview = new this.reviewModel({
        ...createReviewDto,
        images: imageUrls,
        user: user?.userId, // author
      });

      const savedReview = await createdReview.save();

      // Update product aggregates
      await this.recomputeProductStats(createReviewDto.product);

      // Notify admins
      try {
        const adminUsers = await this.usersService.getAdminUsers();
        const adminIds = adminUsers
          .map((a) => (a as any)._id?.toString())
          .filter(Boolean) as string[];

        for (const adminId of adminIds) {
          await this.notificationService.createNotification({
            recipient: adminId,
            title: 'New Review Submitted',
            message: `A new review has been submitted. Rating: ${ratingNum}/5`,
            type: NotificationType.SYSTEM_ALERT,
            priority: NotificationPriority.LOW,
            metadata: {
              reviewId: (savedReview._id as Types.ObjectId).toString(),
              productId: createReviewDto.product,
              rating: ratingNum,
              userId: user?.userId,
            },
            relatedId: (savedReview._id as Types.ObjectId).toString(),
            relatedModel: 'Review',
          });
        }
      } catch (notifyErr) {
        // non-fatal
        console.error('Failed to send new review notification:', notifyErr);
      }

      return savedReview;
    } catch (err) {
      // keep intended status codes; only wrap unknowns
      if (err instanceof HttpException) throw err;
      console.error('Create review error:', err);
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
    this.assertValidObjectId(id, 'review');
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
    try {
      this.assertValidObjectId(id, 'review');

      const review = await this.reviewModel.findById(id);
      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      // Ownership / admin check (if user passed)
      this.assertCanMutate(review, user);

      // Coerce & validate rating if provided
      if (updateReviewDto.rating !== undefined) {
        const ratingNum = coerceNumber((updateReviewDto as any).rating);
        if (ratingNum === null || ratingNum < 1 || ratingNum > 5) {
          throw new BadRequestException('Rating must be between 1 and 5');
        }
        (updateReviewDto as any).rating = ratingNum;
      }

      // Upload any new images (append to existing)
      const imageUrls: string[] = review.images || [];
      if (files?.length) {
        for (const file of files) {
          imageUrls.push(await this.fileUploadService.handleUpload(file));
        }
      }

      review.set({
        ...updateReviewDto,
        images: imageUrls,
        // keep existing author; if you want immutable author, omit user line:
        user: review.user ?? user?.userId,
      });

      const updated = await review.save();

      // Recompute product aggregates if rating changed or present
      await this.recomputeProductStats(
        (review.product as Types.ObjectId).toString(),
      );

      // Notify admins
      try {
        const adminUsers = await this.usersService.getAdminUsers();
        const adminIds = adminUsers
          .map((a) => (a as any)._id?.toString())
          .filter(Boolean) as string[];

        for (const adminId of adminIds) {
          await this.notificationService.createNotification({
            recipient: adminId,
            title: 'Review Updated',
            message: 'A review has been updated.',
            type: NotificationType.SYSTEM_ALERT,
            priority: NotificationPriority.LOW,
            metadata: {
              reviewId: id,
              productId: (review.product as Types.ObjectId).toString(),
              rating: updateReviewDto.rating ?? review.rating,
            },
            relatedId: id,
            relatedModel: 'Review',
          });
        }
      } catch (notifyErr) {
        console.error('Failed to send review update notification:', notifyErr);
      }

      return updated;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error('Update review error:', err);
      throw new InternalServerErrorException('Failed to update review');
    }
  }

  /**
   * NOTE: Your controller currently does not pass `req.user` to this method.
   * If you want strict ownership enforcement here, pass `@Req() req` and forward `req.user`.
   */
  async remove(id: string, user?: any) {
    try {
      this.assertValidObjectId(id, 'review');

      const review = await this.reviewModel.findById(id);
      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      // Ownership / admin check (only if user provided)
      this.assertCanMutate(review, user);

      // Delete uploaded images (best-effort)
      for (const url of review.images || []) {
        if (!url) continue;
        try {
          await this.fileUploadService.deleteFile(url);
        } catch (e) {
          console.error('Failed to delete review image:', url, e);
        }
      }

      const productId = (review.product as Types.ObjectId).toString();
      const result = await this.reviewModel.findByIdAndDelete(id).exec();

      // Update product aggregates
      await this.recomputeProductStats(productId);

      // Notify admins
      try {
        const adminUsers = await this.usersService.getAdminUsers();
        const adminIds = adminUsers
          .map((a) => (a as any)._id?.toString())
          .filter(Boolean) as string[];

        for (const adminId of adminIds) {
          await this.notificationService.createNotification({
            recipient: adminId,
            title: 'Review Deleted',
            message: 'A review has been deleted.',
            type: NotificationType.SYSTEM_ALERT,
            priority: NotificationPriority.LOW,
            metadata: {
              reviewId: id,
              productId,
            },
            relatedId: id,
            relatedModel: 'Review',
          });
        }
      } catch (notifyErr) {
        console.error(
          'Failed to send review deletion notification:',
          notifyErr,
        );
      }

      return result;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error('Delete review error:', err);
      throw new InternalServerErrorException('Failed to delete review');
    }
  }
}
