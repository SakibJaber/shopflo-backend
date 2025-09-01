import { Global, Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class FileUploadModule {}
