import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { getModelToken } from '@nestjs/mongoose';
import { Review } from './schema/review.schema';
import { Product } from 'src/modules/products/schema/product.schema';
import { Order } from 'src/modules/order/schema/order.schema';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { NotificationService } from 'src/modules/notifications/notifications.service';
import { UsersService } from 'src/modules/users/users.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateReviewDto } from './dto/create-review.dto';

describe('ReviewService', () => {
  let service: ReviewService;
  let orderModel: any;
  let productModel: any;
  let reviewModel: any;

  // Mock class for ReviewModel
  class MockReviewModel {
    save: any;
    constructor(public data: any) {
      this.save = jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(), ...this.data });
    }
    static findOne = jest.fn();
    static aggregate = jest.fn().mockResolvedValue([]);
    static find = jest.fn();
    static countDocuments = jest.fn();
    static findById = jest.fn();
    static findByIdAndDelete = jest.fn();
  }

  const mockProductModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockOrderModel = {
    exists: jest.fn(),
  };

  const mockFileUploadService = {
    handleUpload: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  const mockUsersService = {
    getAdminUsers: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: getModelToken(Review.name), useValue: MockReviewModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: FileUploadService, useValue: mockFileUploadService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    orderModel = module.get(getModelToken(Order.name));
    productModel = module.get(getModelToken(Product.name));
    reviewModel = module.get(getModelToken(Review.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId().toString();
    const createReviewDto: CreateReviewDto = {
      user: userId,
      product: productId,
      rating: 5,
      comment: 'Great product',
    };
    const user = { userId };

    it('should throw NotFoundException if product does not exist', async () => {
      mockProductModel.findById.mockResolvedValue(null);

      await expect(service.create(createReviewDto, [], user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has not purchased the product', async () => {
      mockProductModel.findById.mockResolvedValue({ _id: productId });
      mockOrderModel.exists.mockResolvedValue(false);

      await expect(service.create(createReviewDto, [], user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockOrderModel.exists).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        'items.product': new Types.ObjectId(productId),
        status: 'delivered',
      });
    });

    it('should create review if user has purchased the product', async () => {
      mockProductModel.findById.mockResolvedValue({ _id: productId });
      mockOrderModel.exists.mockResolvedValue(true);
      MockReviewModel.findOne.mockResolvedValue(null);

      const result = await service.create(createReviewDto, [], user);

      expect(result).toBeDefined();
      expect(mockOrderModel.exists).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        'items.product': new Types.ObjectId(productId),
        status: 'delivered',
      });
    });
  });
});
