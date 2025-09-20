import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { GlobalFileUploadInterceptor } from 'src/modules/file-upload/file-upload.interceptor';

type Opts = Parameters<typeof GlobalFileUploadInterceptor>[0];

export function UseGlobalFileInterceptor(
  options: Opts = { fieldName: 'file' },
) {
  return applyDecorators(UseInterceptors(GlobalFileUploadInterceptor(options)));
}
