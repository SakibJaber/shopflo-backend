import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export class ProductFilterBuilder {
  private filter: any = {};

  build() {
    return this.filter;
  }

  addSearch(search?: string) {
    if (search) {
      this.addCondition({
        $or: [
          { productName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { shortDescription: { $regex: search, $options: 'i' } },
        ],
      });
    }
    return this;
  }

  addCategory(category?: string) {
    if (category) {
      if (!Types.ObjectId.isValid(category)) {
        throw new BadRequestException('Invalid category ID');
      }
      this.addCondition({
        $or: [
          { category: category },
          { category: new Types.ObjectId(category) },
        ],
      });
    }
    return this;
  }

  addSubcategory(subcategory?: string) {
    if (subcategory) {
      if (!Types.ObjectId.isValid(subcategory)) {
        throw new BadRequestException('Invalid subcategory ID');
      }
      this.addCondition({
        $or: [
          { subcategory: subcategory },
          { subcategory: new Types.ObjectId(subcategory) },
        ],
      });
    }
    return this;
  }

  addBrand(brand?: string | string[]) {
    if (brand) {
      if (Array.isArray(brand)) {
        const brandConditions = brand.map((b) => ({
          $or: [{ brand: b }, { brand: new Types.ObjectId(b) }],
        }));
        this.addCondition({ $or: brandConditions });
      } else {
        if (!Types.ObjectId.isValid(brand)) {
          throw new BadRequestException('Invalid brand ID');
        }
        this.addCondition({
          $or: [{ brand: brand }, { brand: new Types.ObjectId(brand) }],
        });
      }
    }
    return this;
  }

  addColor(color?: string | string[]) {
    if (color) {
      if (Array.isArray(color)) {
        const colorObjectIds = color.map((c) => {
          if (!Types.ObjectId.isValid(c)) {
            throw new BadRequestException('Invalid color ID');
          }
          return new Types.ObjectId(c);
        });
        this.addCondition({ 'variants.color': { $in: colorObjectIds } });
      } else {
        if (!Types.ObjectId.isValid(color)) {
          throw new BadRequestException('Invalid color ID');
        }
        this.addCondition({ 'variants.color': new Types.ObjectId(color) });
      }
    }
    return this;
  }

  addSize(size?: string | string[]) {
    if (size) {
      if (Array.isArray(size)) {
        const sizeObjectIds = size.map((s) => {
          if (!Types.ObjectId.isValid(s)) {
            throw new BadRequestException('Invalid size ID');
          }
          return new Types.ObjectId(s);
        });
        this.addCondition({ 'variants.size': { $in: sizeObjectIds } });
      } else {
        if (!Types.ObjectId.isValid(size)) {
          throw new BadRequestException('Invalid size ID');
        }
        this.addCondition({ 'variants.size': new Types.ObjectId(size) });
      }
    }
    return this;
  }

  addPriceRange(price?: string, minPrice?: string, maxPrice?: string) {
    const priceFilter: any = {};

    if (price) {
      const priceRange = price
        .split('-')
        .map((p: string) => parseInt(p.trim()));
      if (
        priceRange.length === 2 &&
        !isNaN(priceRange[0]) &&
        !isNaN(priceRange[1])
      ) {
        if (priceRange[0] > priceRange[1]) {
          throw new BadRequestException(
            'Minimum price cannot be greater than maximum price',
          );
        }
        priceFilter.$gte = priceRange[0];
        priceFilter.$lte = priceRange[1];
      }
    }

    if (minPrice) {
      const min = parseInt(minPrice);
      if (isNaN(min) || min < 0) {
        throw new BadRequestException(
          'Invalid minPrice. Must be a positive number.',
        );
      }
      priceFilter.$gte = min;
    }

    if (maxPrice) {
      const max = parseInt(maxPrice);
      if (isNaN(max) || max < 0) {
        throw new BadRequestException(
          'Invalid maxPrice. Must be a positive number.',
        );
      }
      priceFilter.$lte = max;
    }

    if (Object.keys(priceFilter).length > 0) {
      this.addCondition({ discountedPrice: priceFilter });
    }
    return this;
  }

  private addCondition(condition: any) {
    if (!this.filter.$and) {
      this.filter.$and = [];
    }
    this.filter.$and.push(condition);
  }
}
