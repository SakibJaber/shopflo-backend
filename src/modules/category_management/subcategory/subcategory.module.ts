import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubcategoryController } from './subcategory.controller';
import { SubcategoryService } from './subcategory.service';
import { Subcategory, SubcategorySchema } from './schema/subcategory.schema';
import { FileUploadModule } from 'src/modules/file-upload/file-upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subcategory.name, schema: SubcategorySchema },
    ]),
    FileUploadModule,
  ],
  controllers: [SubcategoryController],
  providers: [SubcategoryService],
  exports: [SubcategoryService],
})
export class SubcategoryModule {}
