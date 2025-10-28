import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Design, DesignDocument } from './schema/design.schema';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';
import { Product, ProductDocument } from '../products/schema/product.schema';

@Injectable()
export class DesignsService {
  constructor(
    @InjectModel(Design.name)
    private readonly designModel: Model<DesignDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // async create(
  //   userId: string,
  //   createDesignDto: CreateDesignDto,
  //   files: {
  //     frontImage?: Express.Multer.File[];
  //     backImage?: Express.Multer.File[];
  //     frontElement?: Express.Multer.File[];
  //     backElement?: Express.Multer.File[];
  //     leftImage?: Express.Multer.File[];
  //     leftElement?: Express.Multer.File[];
  //     rightImage?: Express.Multer.File[];
  //     rightElement?: Express.Multer.File[];
  //   },
  // ): Promise<Design> {
  //   const uploadedUrls: string[] = [];

  //   try {
  //     // Validate base product and color
  //     const product = await this.productModel.findById(
  //       createDesignDto.baseProduct,
  //     );
  //     if (!product) {
  //       throw new NotFoundException('Base product not found');
  //     }
  //     const colorId = new Types.ObjectId(createDesignDto.color);

  //     const hasColor = product.variants.some((v) => v.color.equals(colorId));
  //     if (!hasColor) {
  //       throw new BadRequestException(
  //         'Selected color not available for this product',
  //       );
  //     }

  //     // Validate that front design is provided
  //     if (!files.frontImage?.[0]) {
  //       throw new BadRequestException('Front image is required');
  //     }

  //     // Process front design files
  //     const frontImageUrl = await this.fileUploadService.handleUpload(
  //       files.frontImage[0],
  //     );
  //     uploadedUrls.push(frontImageUrl);

  //     let frontElementUrl: string | undefined;
  //     if (files.frontElement?.[0]) {
  //       frontElementUrl = await this.fileUploadService.handleUpload(
  //         files.frontElement[0],
  //       );
  //       uploadedUrls.push(frontElementUrl);
  //     }

  //     // Process back design files if provided
  //     let backImageUrl: string | undefined;
  //     let backElementUrl: string | undefined;

  //     if (files.backImage?.[0]) {
  //       backImageUrl = await this.fileUploadService.handleUpload(
  //         files.backImage[0],
  //       );
  //       uploadedUrls.push(backImageUrl);

  //       if (files.backElement?.[0]) {
  //         backElementUrl = await this.fileUploadService.handleUpload(
  //           files.backElement[0],
  //         );
  //         uploadedUrls.push(backElementUrl);
  //       }
  //     }

  //     // Process left side design files if provided
  //     let leftImageUrl: string | undefined;
  //     let leftElementUrl: string | undefined;

  //     if (files.leftImage?.[0]) {
  //       leftImageUrl = await this.fileUploadService.handleUpload(
  //         files.leftImage[0],
  //       );
  //       uploadedUrls.push(leftImageUrl);

  //       if (files.leftElement?.[0]) {
  //         leftElementUrl = await this.fileUploadService.handleUpload(
  //           files.leftElement[0],
  //         );
  //         uploadedUrls.push(leftElementUrl);
  //       }
  //     }

  //     // Process right side design files if provided
  //     let rightImageUrl: string | undefined;
  //     let rightElementUrl: string | undefined;

  //     if (files.rightImage?.[0]) {
  //       rightImageUrl = await this.fileUploadService.handleUpload(
  //         files.rightImage[0],
  //       );
  //       uploadedUrls.push(rightImageUrl);

  //       if (files.rightElement?.[0]) {
  //         rightElementUrl = await this.fileUploadService.handleUpload(
  //           files.rightElement[0],
  //         );
  //         uploadedUrls.push(rightElementUrl);
  //       }
  //     }

  //     const designData: any = {
  //       ...createDesignDto,
  //       user: new Types.ObjectId(userId),
  //       frontImage: frontImageUrl,
  //       baseProduct: new Types.ObjectId(createDesignDto.baseProduct),
  //       color: colorId, // New: Set color
  //     };

  //     // Only add front element if provided
  //     if (frontElementUrl) {
  //       designData.frontElement = frontElementUrl;
  //     }

  //     // Only add back design if provided
  //     if (backImageUrl) {
  //       designData.backImage = backImageUrl;
  //       if (backElementUrl) {
  //         designData.backElement = backElementUrl;
  //       }
  //     }

  //     // Only add left side design if provided
  //     if (leftImageUrl) {
  //       designData.leftImage = leftImageUrl;
  //       if (leftElementUrl) {
  //         designData.leftElement = leftElementUrl;
  //       }
  //     }

  //     // Only add right side design if provided
  //     if (rightImageUrl) {
  //       designData.rightImage = rightImageUrl;
  //       if (rightElementUrl) {
  //         designData.rightElement = rightElementUrl;
  //       }
  //     }

  //     const createdDesign = new this.designModel(designData);
  //     return await createdDesign.save();
  //   } catch (error) {
  //     // Clean up uploaded files if creation fails
  //     await this.cleanupFilesByUrls(uploadedUrls);
  //     throw new BadRequestException(error.message || 'Failed to create design');
  //   }
  // }

  async create(
    userId: string,
    createDesignDto: CreateDesignDto,
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
      frontElement?: Express.Multer.File[];
      backElement?: Express.Multer.File[];
      leftImage?: Express.Multer.File[];
      leftElement?: Express.Multer.File[];
      rightImage?: Express.Multer.File[];
      rightElement?: Express.Multer.File[];
    },
  ): Promise<Design> {
    const uploadedUrls: string[] = [];

    try {
      // Validate base product exists (but don't validate color)
      const product = await this.productModel.findById(
        createDesignDto.baseProduct,
      );
      if (!product) {
        throw new NotFoundException('Base product not found');
      }

      // REMOVE color validation since design is not tied to a specific color
      // const colorId = new Types.ObjectId(createDesignDto.color);
      // const hasColor = product.variants.some((v) => v.color.equals(colorId));
      // if (!hasColor) {
      //   throw new BadRequestException(
      //     'Selected color not available for this product',
      //   );
      // }

      // Validate that front design is provided
      if (!files.frontImage?.[0]) {
        throw new BadRequestException('Front image is required');
      }

      // Process front design files
      const frontImageUrl = await this.fileUploadService.handleUpload(
        files.frontImage[0],
      );
      uploadedUrls.push(frontImageUrl);

      let frontElementUrl: string | undefined;
      if (files.frontElement?.[0]) {
        frontElementUrl = await this.fileUploadService.handleUpload(
          files.frontElement[0],
        );
        uploadedUrls.push(frontElementUrl);
      }

      // Process back design files if provided
      let backImageUrl: string | undefined;
      let backElementUrl: string | undefined;

      if (files.backImage?.[0]) {
        backImageUrl = await this.fileUploadService.handleUpload(
          files.backImage[0],
        );
        uploadedUrls.push(backImageUrl);

        if (files.backElement?.[0]) {
          backElementUrl = await this.fileUploadService.handleUpload(
            files.backElement[0],
          );
          uploadedUrls.push(backElementUrl);
        }
      }

      // Process left side design files if provided
      let leftImageUrl: string | undefined;
      let leftElementUrl: string | undefined;

      if (files.leftImage?.[0]) {
        leftImageUrl = await this.fileUploadService.handleUpload(
          files.leftImage[0],
        );
        uploadedUrls.push(leftImageUrl);

        if (files.leftElement?.[0]) {
          leftElementUrl = await this.fileUploadService.handleUpload(
            files.leftElement[0],
          );
          uploadedUrls.push(leftElementUrl);
        }
      }

      // Process right side design files if provided
      let rightImageUrl: string | undefined;
      let rightElementUrl: string | undefined;

      if (files.rightImage?.[0]) {
        rightImageUrl = await this.fileUploadService.handleUpload(
          files.rightImage[0],
        );
        uploadedUrls.push(rightImageUrl);

        if (files.rightElement?.[0]) {
          rightElementUrl = await this.fileUploadService.handleUpload(
            files.rightElement[0],
          );
          uploadedUrls.push(rightElementUrl);
        }
      }

      const designData: any = {
        ...createDesignDto,
        user: new Types.ObjectId(userId),
        frontImage: frontImageUrl,
        baseProduct: new Types.ObjectId(createDesignDto.baseProduct),
        // REMOVE color assignment
        // color: colorId,
      };

      // Only add front element if provided
      if (frontElementUrl) {
        designData.frontElement = frontElementUrl;
      }

      // Only add back design if provided
      if (backImageUrl) {
        designData.backImage = backImageUrl;
        if (backElementUrl) {
          designData.backElement = backElementUrl;
        }
      }

      // Only add left side design if provided
      if (leftImageUrl) {
        designData.leftImage = leftImageUrl;
        if (leftElementUrl) {
          designData.leftElement = leftElementUrl;
        }
      }

      // Only add right side design if provided
      if (rightImageUrl) {
        designData.rightImage = rightImageUrl;
        if (rightElementUrl) {
          designData.rightElement = rightElementUrl;
        }
      }

      const createdDesign = new this.designModel(designData);
      return await createdDesign.save();
    } catch (error) {
      // Clean up uploaded files if creation fails
      await this.cleanupFilesByUrls(uploadedUrls);
      throw new BadRequestException(error.message || 'Failed to create design');
    }
  }

  private async cleanupFilesByUrls(urls: string[]): Promise<void> {
    for (const url of urls) {
      try {
        await this.fileUploadService.deleteFile(url);
      } catch (error) {
        // Log error but don't throw - we want to clean up as much as possible
        console.error(`Failed to delete file: ${url}`, error);
      }
    }
  }

  async findAllByUser(
    userId: string,
    query: any,
  ): Promise<{ data: Design[]; meta: any }> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      isPublic,
      hasBackDesign,
      hasLeftDesign,
      hasRightDesign,
    } = query;

    const skip = (page - 1) * limit;
    const filter: any = { user: new Types.ObjectId(userId) };

    try {
      if (search) {
        filter.$or = [
          { designName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      if (isPublic !== undefined) {
        filter.isPublic = isPublic === 'true';
      }

      if (hasBackDesign !== undefined) {
        if (hasBackDesign === 'true') {
          filter.backImage = { $exists: true, $ne: null };
        } else {
          filter.$or = [{ backImage: { $exists: false } }, { backImage: null }];
        }
      }

      if (hasLeftDesign !== undefined) {
        if (hasLeftDesign === 'true') {
          filter.leftImage = { $exists: true, $ne: null };
        } else {
          filter.$or = [{ leftImage: { $exists: false } }, { leftImage: null }];
        }
      }

      if (hasRightDesign !== undefined) {
        if (hasRightDesign === 'true') {
          filter.rightImage = { $exists: true, $ne: null };
        } else {
          filter.$or = [
            { rightImage: { $exists: false } },
            { rightImage: null },
          ];
        }
      }

      const [data, total] = await Promise.all([
        this.designModel
          .find(filter)
          .populate({
            path: 'baseProduct',
            select: 'productName price discountedPrice variants thumbnail',
            populate: [
              { path: 'variants.color', select: 'name hexValue' },
              { path: 'variants.size', select: 'name' },
            ],
          })
          // .populate('color', 'name hexValue') // New: Populate color
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.designModel.countDocuments(filter),
      ]);

      return {
        data,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch designs');
    }
  }

  async findOne(id: string, userId?: string): Promise<Design> {
    const filter: any = { _id: new Types.ObjectId(id) };

    if (userId) {
      filter.user = new Types.ObjectId(userId);
    }

    const design = await this.designModel
      .findOne(filter)
      .populate('user', 'firstName lastName email')
      .populate({
        path: 'baseProduct',
        select: 'productName price discountedPrice variants thumbnail',
        populate: [
          { path: 'variants.color', select: 'name hexValue' },
          { path: 'variants.size', select: 'name' },
        ],
      })
      // .populate('color', 'name hexValue') // New: Populate color
      .exec();

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    return design;
  }

  // async update(
  //   id: string,
  //   userId: string,
  //   updateDesignDto: UpdateDesignDto,
  //   files?: {
  //     frontImage?: Express.Multer.File[];
  //     backImage?: Express.Multer.File[];
  //     frontElement?: Express.Multer.File[];
  //     backElement?: Express.Multer.File[];
  //     leftImage?: Express.Multer.File[];
  //     leftElement?: Express.Multer.File[];
  //     rightImage?: Express.Multer.File[];
  //     rightElement?: Express.Multer.File[];
  //   },
  // ): Promise<Design> {
  //   const design = await this.designModel.findOne({
  //     _id: new Types.ObjectId(id),
  //     user: new Types.ObjectId(userId),
  //   });

  //   if (!design) {
  //     throw new NotFoundException('Design not found');
  //   }

  //   const filesToDelete: string[] = [];
  //   const newlyUploadedUrls: string[] = [];

  //   try {
  //     // If color is being updated, validate it
  //     if (updateDesignDto.color) {
  //       const product = await this.productModel.findById(design.baseProduct);
  //       if (!product) {
  //         throw new NotFoundException('Base product not found');
  //       }

  //       const colorId = new Types.ObjectId(updateDesignDto.color);
  //       const hasColor = product.variants.some((v) => v.color.equals(colorId));
  //       if (!hasColor) {
  //         throw new BadRequestException(
  //           'Selected color not available for this product',
  //         );
  //       }
  //       design.color = colorId;
  //     }

  //     // Process uploaded files if provided
  //     if (files) {
  //       if (files.frontImage?.[0]) {
  //         if (design.frontImage) {
  //           filesToDelete.push(design.frontImage);
  //         }
  //         const newFrontImage = await this.fileUploadService.handleUpload(
  //           files.frontImage[0],
  //         );
  //         newlyUploadedUrls.push(newFrontImage);
  //         design.frontImage = newFrontImage;
  //       }

  //       if (files.backImage?.[0]) {
  //         if (design.backImage) {
  //           filesToDelete.push(design.backImage);
  //         }
  //         const newBackImage = await this.fileUploadService.handleUpload(
  //           files.backImage[0],
  //         );
  //         newlyUploadedUrls.push(newBackImage);
  //         design.backImage = newBackImage;
  //       }

  //       if (files.frontElement?.[0]) {
  //         if (design.frontElement) {
  //           filesToDelete.push(design.frontElement);
  //         }
  //         const newFrontElement = await this.fileUploadService.handleUpload(
  //           files.frontElement[0],
  //         );
  //         newlyUploadedUrls.push(newFrontElement);
  //         design.frontElement = newFrontElement;
  //       }

  //       if (files.backElement?.[0]) {
  //         if (design.backElement) {
  //           filesToDelete.push(design.backElement);
  //         }
  //         const newBackElement = await this.fileUploadService.handleUpload(
  //           files.backElement[0],
  //         );
  //         newlyUploadedUrls.push(newBackElement);
  //         design.backElement = newBackElement;
  //       }

  //       // Process left side files
  //       if (files.leftImage?.[0]) {
  //         if (design.leftImage) {
  //           filesToDelete.push(design.leftImage);
  //         }
  //         const newLeftImage = await this.fileUploadService.handleUpload(
  //           files.leftImage[0],
  //         );
  //         newlyUploadedUrls.push(newLeftImage);
  //         design.leftImage = newLeftImage;
  //       }

  //       if (files.leftElement?.[0]) {
  //         if (design.leftElement) {
  //           filesToDelete.push(design.leftElement);
  //         }
  //         const newLeftElement = await this.fileUploadService.handleUpload(
  //           files.leftElement[0],
  //         );
  //         newlyUploadedUrls.push(newLeftElement);
  //         design.leftElement = newLeftElement;
  //       }

  //       // Process right side files
  //       if (files.rightImage?.[0]) {
  //         if (design.rightImage) {
  //           filesToDelete.push(design.rightImage);
  //         }
  //         const newRightImage = await this.fileUploadService.handleUpload(
  //           files.rightImage[0],
  //         );
  //         newlyUploadedUrls.push(newRightImage);
  //         design.rightImage = newRightImage;
  //       }

  //       if (files.rightElement?.[0]) {
  //         if (design.rightElement) {
  //           filesToDelete.push(design.rightElement);
  //         }
  //         const newRightElement = await this.fileUploadService.handleUpload(
  //           files.rightElement[0],
  //         );
  //         newlyUploadedUrls.push(newRightElement);
  //         design.rightElement = newRightElement;
  //       }
  //     }

  //     // Update other fields
  //     Object.keys(updateDesignDto).forEach((key) => {
  //       if (updateDesignDto[key] !== undefined && key !== 'color') {
  //         design[key] = updateDesignDto[key];
  //       }
  //     });

  //     const savedDesign = await design.save();

  //     // Delete old files after successful update
  //     await this.cleanupFilesByUrls(filesToDelete);

  //     return savedDesign;
  //   } catch (error) {
  //     // If update fails, clean up any newly uploaded files
  //     await this.cleanupFilesByUrls(newlyUploadedUrls);
  //     throw new BadRequestException(error.message || 'Failed to update design');
  //   }
  // }

  async update(
    id: string,
    userId: string,
    updateDesignDto: UpdateDesignDto,
    files?: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
      frontElement?: Express.Multer.File[];
      backElement?: Express.Multer.File[];
      leftImage?: Express.Multer.File[];
      leftElement?: Express.Multer.File[];
      rightImage?: Express.Multer.File[];
      rightElement?: Express.Multer.File[];
    },
  ): Promise<Design> {
    const design = await this.designModel.findOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    const filesToDelete: string[] = [];
    const newlyUploadedUrls: string[] = [];

    try {
      // REMOVE color validation since design is no longer tied to a color
      // if (updateDesignDto.color) {
      //   ... color validation code removed
      // }

      // Process uploaded files if provided - THIS PART WAS MISSING
      if (files) {
        if (files.frontImage?.[0]) {
          if (design.frontImage) {
            filesToDelete.push(design.frontImage);
          }
          const newFrontImage = await this.fileUploadService.handleUpload(
            files.frontImage[0],
          );
          newlyUploadedUrls.push(newFrontImage);
          design.frontImage = newFrontImage;
        }

        if (files.backImage?.[0]) {
          if (design.backImage) {
            filesToDelete.push(design.backImage);
          }
          const newBackImage = await this.fileUploadService.handleUpload(
            files.backImage[0],
          );
          newlyUploadedUrls.push(newBackImage);
          design.backImage = newBackImage;
        }

        if (files.frontElement?.[0]) {
          if (design.frontElement) {
            filesToDelete.push(design.frontElement);
          }
          const newFrontElement = await this.fileUploadService.handleUpload(
            files.frontElement[0],
          );
          newlyUploadedUrls.push(newFrontElement);
          design.frontElement = newFrontElement;
        }

        if (files.backElement?.[0]) {
          if (design.backElement) {
            filesToDelete.push(design.backElement);
          }
          const newBackElement = await this.fileUploadService.handleUpload(
            files.backElement[0],
          );
          newlyUploadedUrls.push(newBackElement);
          design.backElement = newBackElement;
        }

        // Process left side files
        if (files.leftImage?.[0]) {
          if (design.leftImage) {
            filesToDelete.push(design.leftImage);
          }
          const newLeftImage = await this.fileUploadService.handleUpload(
            files.leftImage[0],
          );
          newlyUploadedUrls.push(newLeftImage);
          design.leftImage = newLeftImage;
        }

        if (files.leftElement?.[0]) {
          if (design.leftElement) {
            filesToDelete.push(design.leftElement);
          }
          const newLeftElement = await this.fileUploadService.handleUpload(
            files.leftElement[0],
          );
          newlyUploadedUrls.push(newLeftElement);
          design.leftElement = newLeftElement;
        }

        // Process right side files
        if (files.rightImage?.[0]) {
          if (design.rightImage) {
            filesToDelete.push(design.rightImage);
          }
          const newRightImage = await this.fileUploadService.handleUpload(
            files.rightImage[0],
          );
          newlyUploadedUrls.push(newRightImage);
          design.rightImage = newRightImage;
        }

        if (files.rightElement?.[0]) {
          if (design.rightElement) {
            filesToDelete.push(design.rightElement);
          }
          const newRightElement = await this.fileUploadService.handleUpload(
            files.rightElement[0],
          );
          newlyUploadedUrls.push(newRightElement);
          design.rightElement = newRightElement;
        }
      }

      // Update other fields
      Object.keys(updateDesignDto).forEach((key) => {
        if (updateDesignDto[key] !== undefined) {
          design[key] = updateDesignDto[key];
        }
      });

      const savedDesign = await design.save();

      // Delete old files after successful update
      await this.cleanupFilesByUrls(filesToDelete);

      return savedDesign;
    } catch (error) {
      // If update fails, clean up any newly uploaded files
      await this.cleanupFilesByUrls(newlyUploadedUrls);
      throw new BadRequestException(error.message || 'Failed to update design');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const design = await this.designModel.findOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    });

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    // Delete associated files
    const filesToDelete = [
      design.frontImage,
      design.backImage,
      design.frontElement,
      design.backElement,
      design.leftImage,
      design.leftElement,
      design.rightImage,
      design.rightElement,
    ].filter((url): url is string => !!url);

    await this.cleanupFilesByUrls(filesToDelete);
    await this.designModel.findByIdAndDelete(id).exec();
  }

  async getPublicDesigns(query: any): Promise<{ data: Design[]; meta: any }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      isPublic: true,
      isActive: true,
    };

    if (search) {
      filter.$or = [
        { designName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.designModel
        .find(filter)
        .populate('user', 'firstName lastName')
        .populate(
          'baseProduct',
          'productName price discountedPrice variants thumbnail',
        )
        // .populate('color', 'name hexValue') // New: Populate color
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.designModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDesignStats(userId: string) {
    const stats = await this.designModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalDesigns: { $sum: 1 },
          designsWithBack: {
            $sum: {
              $cond: [{ $ifNull: ['$backImage', false] }, 1, 0],
            },
          },
          designsWithLeft: {
            $sum: {
              $cond: [{ $ifNull: ['$leftImage', false] }, 1, 0],
            },
          },
          designsWithRight: {
            $sum: {
              $cond: [{ $ifNull: ['$rightImage', false] }, 1, 0],
            },
          },
          fullDesigns: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ['$frontImage', false] },
                    { $ifNull: ['$backImage', false] },
                    { $ifNull: ['$leftImage', false] },
                    { $ifNull: ['$rightImage', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalDesigns: 0,
        designsWithBack: 0,
        designsWithLeft: 0,
        designsWithRight: 0,
        fullDesigns: 0,
      }
    );
  }
}
