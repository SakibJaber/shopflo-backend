import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './services/cart.service';
import { getModelToken } from '@nestjs/mongoose';
import { Cart } from './schema/cart.schema';
import { Product } from '../products/schema/product.schema';
import { Design } from '../designs/schema/design.schema';
import { Size } from '../sizes/schema/size.schema';
import { CouponsService } from '../coupons/coupons.service';
import { Types } from 'mongoose';

describe('CartService Reproduction', () => {
  let service: CartService;

  const mockCartModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const mockProductModel = {};
  const mockDesignModel = {};
  const mockSizeModel = {
    find: jest.fn(),
  };
  const mockCouponsService = {
    validateCoupon: jest.fn(),
    calculateDiscount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getModelToken(Cart.name), useValue: mockCartModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Design.name), useValue: mockDesignModel },
        { provide: getModelToken(Size.name), useValue: mockSizeModel },
        { provide: CouponsService, useValue: mockCouponsService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should calculate totals including unselected items', async () => {
    const userId = new Types.ObjectId().toString();
    const sizeId = new Types.ObjectId();

    const mockCart = {
      _id: new Types.ObjectId(),
      user: new Types.ObjectId(userId),
      items: [
        {
          _id: new Types.ObjectId(),
          product: {
            _id: new Types.ObjectId(),
            productName: 'V-neck',
            price: 140,
            discountedPrice: 140,
            variants: [
              {
                _id: new Types.ObjectId(),
                size: [{ _id: sizeId, name: 'M' }],
              },
            ],
          },
          variantQuantities: [
            {
              variant: new Types.ObjectId(), // Will match the product variant above if we mock it right
              sizeQuantities: [{ size: sizeId, quantity: 3 }],
            },
          ],
          isSelected: true,
          isModified: jest.fn().mockReturnValue(false),
        },
        {
          _id: new Types.ObjectId(),
          product: {
            _id: new Types.ObjectId(),
            productName: 'Raglan',
            price: 200,
            discountedPrice: 200,
            variants: [
              {
                _id: new Types.ObjectId(),
                size: [{ _id: sizeId, name: 'M' }],
              },
            ],
          },
          variantQuantities: [
            {
              variant: new Types.ObjectId(),
              sizeQuantities: [{ size: sizeId, quantity: 3 }],
            },
          ],
          isSelected: false,
          isModified: jest.fn().mockReturnValue(false),
        },
      ],
      isModified: jest.fn().mockReturnValue(false),
      save: jest.fn(),
    };

    // Fix variant IDs to match
    (mockCart.items[0] as any).variantQuantities[0].variant = (
      mockCart.items[0].product.variants[0] as any
    )._id;
    (mockCart.items[1] as any).variantQuantities[0].variant = (
      mockCart.items[1].product.variants[0] as any
    )._id;

    mockCartModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockCart),
        }),
      }),
    });

    mockSizeModel.find.mockResolvedValue([{ _id: sizeId, name: 'M' }]);

    const result = await service.getCartWithDetails(userId);

    console.log('Items Total:', result.summary.itemsTotal);
    console.log('Total Quantity:', result.summary.totalQuantity);
    console.log('Item Count:', result.summary.itemCount);
    console.log('Selected Items Total:', result.summary.selectedItemsTotal);
    console.log(
      'Selected Total Quantity:',
      result.summary.selectedTotalQuantity,
    );

    expect(result.summary.itemsTotal).toBe(1020); // (140 * 3) + (200 * 3) = 420 + 600 = 1020
    expect(result.summary.totalQuantity).toBe(6); // 3 + 3
    expect(result.summary.selectedItemsTotal).toBe(420); // Only the first item is selected (140 * 3)
    expect(result.summary.selectedTotalQuantity).toBe(3); // Only the first item's quantity
  });
});
