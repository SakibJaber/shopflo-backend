import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Chart, ChartSchema } from './schema/chart.schema';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { ChartsController } from 'src/modules/chart/chart.controller';
import { ChartsService } from 'src/modules/chart/chart.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chart.name, schema: ChartSchema }]),
    FileUploadModule,
  ],
  controllers: [ChartsController],
  providers: [ChartsService],
  exports: [ChartsService],
})
export class ChartModule {}
