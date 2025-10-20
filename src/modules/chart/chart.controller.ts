import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UploadedFile,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { ChartsService } from 'src/modules/chart/chart.service';


@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('chartImage'))
  async create(@Request() req, @UploadedFile() file: Express.Multer.File) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      const chart = await this.chartsService.create(userId, file);

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Chart created successfully',
        data: chart,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create chart');
    }
  }

  @Get()
  async findAll() {
    try {
      const charts = await this.chartsService.findAll();

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Charts fetched successfully',
        data: charts,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch charts');
    }
  }

  @Get('latest')
  async getLatestChart() {
    try {
      const chart = await this.chartsService.getLatestChart();

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Latest chart fetched successfully',
        data: chart,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(
        error.message || 'Failed to fetch latest chart',
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const chart = await this.chartsService.findOne(id);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Chart fetched successfully',
        data: chart,
      };
    } catch (error) {
      throw new NotFoundException(error.message || 'Chart not found');
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('chartImage'))
  async update(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      const updatedChart = await this.chartsService.update(id, userId, file);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Chart updated successfully',
        data: updatedChart,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message || 'Failed to update chart');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.chartsService.remove(id);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Chart deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message || 'Failed to delete chart');
    }
  }
}
