import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IconsService } from './icon.service';
import { IconsController } from './icon.controller';
import { Icon, IconSchema } from './schema/icon.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Icon.name, schema: IconSchema }]),
  ],
  controllers: [IconsController],
  providers: [IconsService],
})
export class IconsModule {}
