import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaticPageController } from './static-page.controller';
import { StaticPageService } from './static-page.service';
import {
  StaticPage,
  StaticPageSchema,
} from 'src/modules/static-page/schema/static-page.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StaticPage.name, schema: StaticPageSchema },
    ]),
  ],
  controllers: [StaticPageController],
  providers: [StaticPageService],
})
export class StaticPageModule {}
