import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Color, ColorSchema } from './schema/color.schema';
import { ColorsController } from 'src/modules/color/color.controller';
import { ColorsService } from 'src/modules/color/color.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Color.name, schema: ColorSchema }])],
  controllers: [ColorsController],
  providers: [ColorsService],
  exports: [ColorsService],
})
export class ColorsModule {}
