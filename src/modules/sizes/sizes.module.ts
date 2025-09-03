import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SizesController } from './sizes.controller';
import { SizesService } from './sizes.service';
import { Size, SizeSchema } from './schema/size.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Size.name, schema: SizeSchema }])],
  controllers: [SizesController],
  providers: [SizesService],
  exports: [SizesService],
})
export class SizesModule {}
