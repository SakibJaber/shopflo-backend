import {
  FileInterceptor,
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';

export interface FileInterceptorOptions {
  fieldName?: string;
  maxCount?: number;
  any?: boolean;
  allowedMimes?: RegExp; // optional override
  maxFileSizeBytes?: number; // optional override
}

export function GlobalFileUploadInterceptor(
  options: FileInterceptorOptions = {},
) {
  const field = options.fieldName || 'file';
  const maxCount = options.maxCount ?? 1;
  const isMultiple = maxCount > 1;
  const isAny = options.any === true;

  const config = new ConfigService();
  const storageType = config.get<string>('FILE_STORAGE', 'local');
  const localUploadPath = path.resolve(
    process.cwd(),
    config.get<string>('LOCAL_UPLOAD_PATH', 'public/uploads'),
  );

  let storage: multer.StorageEngine;

  if (storageType === 's3') {
    // Use memory storage; service will push to S3
    storage = multer.memoryStorage();
  } else {
    if (!fs.existsSync(localUploadPath)) {
      fs.mkdirSync(localUploadPath, { recursive: true });
    }
    storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, localUploadPath),
      filename: (req, file, cb) => {
        // keep original base name sanitized (service will otherwise generate)
        const safeName = file.originalname.replace(/\s+/g, '-');
        const name = `${Date.now()}-${safeName}`;
        cb(null, name);
      },
    });
  }

  const allowed = options.allowedMimes ?? /\/(jpg|jpeg|png|gif|webp|pdf)$/i;
  const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
    if (allowed.test(file.mimetype)) return cb(null, true);
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  };

  const limits: multer.Options['limits'] = {
    fileSize: options.maxFileSizeBytes ?? 5 * 1024 * 1024, // 5MB default
    files: isAny ? undefined : maxCount,
  };

  if (isAny) return AnyFilesInterceptor({ storage, limits, fileFilter });
  if (isMultiple)
    return FilesInterceptor(field, maxCount, { storage, limits, fileFilter });
  return FileInterceptor(field, { storage, limits, fileFilter });
}
