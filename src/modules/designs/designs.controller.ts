import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFiles,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Request,
} from '@nestjs/common';
import { DesignsService } from './designs.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { UseGuards } from '@nestjs/common';

@Controller('designs')
@UseGuards(JwtAuthGuard)
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @Post()
  @UseGlobalFileInterceptor({
    fieldName: [
      'frontImage',
      'backImage',
      'frontElement',
      'backElement',
      'leftImage',
      'leftElement',
      'rightImage',
      'rightElement',
    ],
    maxCount: 8,
  })
  async create(
    @Request() req,
    @Body() createDesignDto: CreateDesignDto,
    @UploadedFiles()
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
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      const design = await this.designsService.create(
        userId,
        createDesignDto,
        files,
      );

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Design created successfully',
        data: design,
        designType: this.getDesignType(files),
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create design');
    }
  }

  private getDesignType(files: any): string {
    const hasFront = !!files.frontImage?.[0];
    const hasBack = !!files.backImage?.[0];
    const hasLeft = !!files.leftImage?.[0];
    const hasRight = !!files.rightImage?.[0];

    if (hasFront && hasBack && hasLeft && hasRight) return 'full-design';
    if (hasFront && hasBack) return 'front-and-back';
    if (hasFront && hasLeft && hasRight) return 'front-with-sides';
    if (hasFront) return 'front-only';
    return 'custom';
  }

  @Get()
  async findAllByUser(@Request() req, @Query() query: any) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      const result = await this.designsService.findAllByUser(userId, query);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Designs fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch designs');
    }
  }

  @Get('public')
  async getPublicDesigns(@Query() query: any) {
    try {
      const result = await this.designsService.getPublicDesigns(query);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Public designs fetched successfully',
        data: result.data,
        meta: result.meta,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch public designs',
      );
    }
  }

  @Get('stats')
  async getDesignStats(@Request() req) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      const stats = await this.designsService.getUserDesignStats(userId);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Design stats fetched successfully',
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch design stats',
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user?.userId;
      const design = await this.designsService.findOne(id, userId);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Design fetched successfully',
        data: design,
      };
    } catch (error) {
      throw new NotFoundException(error.message || 'Design not found');
    }
  }

  @Put(':id')
  @UseGlobalFileInterceptor({
    fieldName: [
      'frontImage',
      'backImage',
      'frontElement',
      'backElement',
      'leftImage',
      'leftElement',
      'rightImage',
      'rightElement',
    ],
    maxCount: 1,
  })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDesignDto: UpdateDesignDto,
    @UploadedFiles()
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
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      const updatedDesign = await this.designsService.update(
        id,
        userId,
        updateDesignDto,
        files,
      );

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Design updated successfully',
        data: updatedDesign,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message || 'Failed to update design');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      await this.designsService.remove(id, userId);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Design deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message || 'Failed to delete design');
    }
  }
}
