import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument, DiscountType } from './schema/coupon.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { Order } from 'src/modules/order/schema/order.schema';
import { UPLOAD_FOLDERS } from 'src/common/constants';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(
    createCouponDto: CreateCouponDto,
    file?: Express.Multer.File,
  ): Promise<Coupon> {
    const existingCoupon = await this.couponModel.findOne({
      code: createCouponDto.code.toUpperCase(),
    });
    if (existingCoupon) {
      throw new ConflictException('Coupon with this code already exists');
    }

    let thumbnail: string;
    if (file) {
      thumbnail = await this.fileUploadService.handleUpload(
        file,
        UPLOAD_FOLDERS.COUPONS,
      );
    } else {
      throw new BadRequestException('Coupon thumbnail image is required');
    }

    const coupon = new this.couponModel({
      ...createCouponDto,
      code: createCouponDto.code.toUpperCase(),
      image: thumbnail,
    });
    return coupon.save();
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.couponModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.couponModel.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
      },
    };
  }

  async findActive(page: number = 1, limit: number = 10) {
    const now = new Date();
    const skip = (page - 1) * limit;
    const query = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    const [data, total] = await Promise.all([
      this.couponModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.couponModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async findByCode(code: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findOne({
      code: code.toUpperCase(),
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async update(
    id: string,
    updateCouponDto: UpdateCouponDto,
    file?: Express.Multer.File,
  ): Promise<Coupon> {
    const coupon = await this.couponModel.findByIdAndUpdate(
      id,
      updateCouponDto,
      { new: true },
    );

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (file) {
      coupon.image = await this.fileUploadService.handleUpload(
        file,
        UPLOAD_FOLDERS.COUPONS,
      );
    }

    return coupon;
  }

  async remove(id: string): Promise<void> {
    const result = await this.couponModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Coupon not found');
    }
  }

  async validateCoupon(
    code: string,
    userId: string,
    cartTotal: number,
    cartItems: any[] = [],
  ): Promise<CouponDocument> {
    const coupon = await this.findByCode(code);

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is not active');
    }

    const now = new Date();
    if (now < new Date(coupon.startDate) || now > new Date(coupon.endDate)) {
      throw new BadRequestException('Coupon is expired or not yet valid');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    // Check if user has already used this coupon
    if (coupon.usedBy.some((id) => id.toString() === userId)) {
      throw new BadRequestException('You have already used this coupon');
    }

    // Category validation (Fixed for global coupons)
    if (coupon.category && String(coupon.category) !== 'undefined') {
      const couponCategory = coupon.category;
      const hasCategoryItem = cartItems.some((item) => {
        const product = item.product;
        const productCategory = product.category?._id || product.category;
        return (
          productCategory &&
          productCategory.toString() === couponCategory.toString()
        );
      });

      if (!hasCategoryItem) {
        throw new BadRequestException(
          'This coupon is not applicable to any items in your cart',
        );
      }
    }

    return coupon;
  }

  calculateDiscount(
    coupon: Coupon,
    cartTotal: number,
    cartItems: any[] = [],
  ): number {
    let discount = 0;
    let applicableTotal = cartTotal;

    // If coupon is category-specific, calculate total of applicable items only
    if (coupon.category && String(coupon.category) !== 'undefined') {
      const couponCategory = coupon.category;
      applicableTotal = cartItems.reduce((total, item) => {
        const product = item.product;
        const productCategory = product.category?._id || product.category;

        if (
          productCategory &&
          productCategory.toString() === couponCategory.toString()
        ) {
          let itemPrice = 0;
          if (typeof item.total === 'number') {
            itemPrice = item.total;
          } else if (typeof item.itemTotal === 'number') {
            itemPrice = item.itemTotal;
          } else if (item.price) {
            const rawTotal = item.itemTotal ?? item.total;
            if (typeof rawTotal === 'string') {
              itemPrice = parseFloat(rawTotal.replace(/[^0-9.-]+/g, ''));
            } else {
              itemPrice = Number(rawTotal || 0);
            }
          }
          return total + itemPrice;
        }
        return total;
      }, 0);
    }

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (applicableTotal * coupon.discountValue) / 100;
    } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed applicable total (or cart total)
    return Math.min(discount, applicableTotal);
  }

  async incrementUsageCount(id: string, userId: string): Promise<void> {
    await this.couponModel.findByIdAndUpdate(id, {
      $inc: { usedCount: 1 },
      $addToSet: { usedBy: new Types.ObjectId(userId) },
    });
  }
}
