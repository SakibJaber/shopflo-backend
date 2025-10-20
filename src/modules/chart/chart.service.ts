import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chart, ChartDocument } from './schema/chart.schema';
import { FileUploadService } from 'src/modules/file-upload/file-upload.service';

@Injectable()
export class ChartsService {
  constructor(
    @InjectModel(Chart.name)
    private readonly chartModel: Model<ChartDocument>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(userId: string, file: Express.Multer.File): Promise<Chart> {
    try {
      if (!file) {
        throw new BadRequestException('Chart image is required');
      }

      // Upload chart image
      const chartImageUrl = await this.fileUploadService.handleUpload(file);

      const chartData = {
        chartImage: chartImageUrl,
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId),
      };

      const createdChart = new this.chartModel(chartData);
      return await createdChart.save();
    } catch (error) {
      // Clean up uploaded file if creation fails
      if (file) {
        try {
          const chartImageUrl = await this.fileUploadService.handleUpload(file);
          await this.fileUploadService.deleteFile(chartImageUrl);
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', cleanupError);
        }
      }
      throw new BadRequestException(error.message || 'Failed to create chart');
    }
  }

  async findAll(): Promise<Chart[]> {
    try {
      return await this.chartModel
        .find()
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch charts');
    }
  }

  async findOne(id: string): Promise<Chart> {
    const chart = await this.chartModel
      .findById(new Types.ObjectId(id))
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .exec();

    if (!chart) {
      throw new NotFoundException('Chart not found');
    }

    return chart;
  }

  async getLatestChart(): Promise<Chart> {
    const chart = await this.chartModel
      .findOne()
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();

    if (!chart) {
      throw new NotFoundException('No chart found');
    }

    return chart;
  }

  async update(
    id: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Chart> {
    const chart = await this.chartModel.findById(new Types.ObjectId(id));

    if (!chart) {
      throw new NotFoundException('Chart not found');
    }

    let newChartImageUrl: string | undefined;
    let oldChartImageUrl: string | undefined;

    try {
      if (file) {
        oldChartImageUrl = chart.chartImage;
        newChartImageUrl = await this.fileUploadService.handleUpload(file);
        chart.chartImage = newChartImageUrl;
        chart.updatedBy = new Types.ObjectId(userId);
      }

      const savedChart = await chart.save();

      // Delete old file after successful update
      if (oldChartImageUrl && newChartImageUrl) {
        try {
          await this.fileUploadService.deleteFile(oldChartImageUrl);
        } catch (deleteError) {
          console.error('Failed to delete old chart image:', deleteError);
        }
      }

      return savedChart;
    } catch (error) {
      // If update fails, clean up newly uploaded file
      if (newChartImageUrl) {
        try {
          await this.fileUploadService.deleteFile(newChartImageUrl);
        } catch (cleanupError) {
          console.error('Failed to cleanup new chart image:', cleanupError);
        }
      }
      throw new BadRequestException(error.message || 'Failed to update chart');
    }
  }

  async remove(id: string): Promise<void> {
    const chart = await this.chartModel.findById(new Types.ObjectId(id));

    if (!chart) {
      throw new NotFoundException('Chart not found');
    }

    // Delete associated file
    if (chart.chartImage) {
      try {
        await this.fileUploadService.deleteFile(chart.chartImage);
      } catch (error) {
        console.error('Failed to delete chart image:', error);
      }
    }

    await this.chartModel.findByIdAndDelete(id).exec();
  }
}
