import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FAQController } from './faq.controller';
import { FAQService } from './faq.service';
import { FAQ, FAQSchema } from 'src/modules/faq/schema/faq.schema';


@Module({
  imports: [MongooseModule.forFeature([{ name: FAQ.name, schema: FAQSchema }])],
  controllers: [FAQController],
  providers: [FAQService],
})
export class FAQModule {}
