import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as fssync from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import * as sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { UPLOAD_FOLDERS } from 'src/common/constants';

@Injectable()
export class FileUploadService {
  private readonly useS3: boolean;
  private readonly localUploadPath: string;
  private readonly s3?: S3Client;
  private readonly s3Bucket?: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly config: ConfigService) {
    this.useS3 = this.config.get<string>('FILE_STORAGE', 'local') === 's3';
    this.localUploadPath = path.resolve(
      process.cwd(),
      this.config.get<string>('LOCAL_UPLOAD_PATH', 'public/uploads'),
    );
    this.publicBaseUrl =
      this.config.get<string>('FILE_PUBLIC_BASE_URL') ?? undefined;

    if (this.useS3) {
      this.s3 = new S3Client({
        region: this.config.get<string>('AWS_REGION')!,
        credentials: {
          accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID')!,
          secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY')!,
        },
      });
      this.s3Bucket = this.config.get<string>('AWS_S3_BUCKET')!;
    }

    // Ensure local dir exists at boot (for local mode)
    if (!this.useS3) {
      if (!fssync.existsSync(this.localUploadPath)) {
        fssync.mkdirSync(this.localUploadPath, { recursive: true });
      }
    }
  }

  /**
   * Upload a single file that arrived via Multer.
   * For local: saves to disk (if memory storage used, we write buffer; if disk storage used, we return computed URL).
   * For S3: uploads buffer to S3 and returns a public URL or key-based URL.
   */
  async handleUpload(
    file: Express.Multer.File,
    folder: string = UPLOAD_FOLDERS.OTHERS,
  ): Promise<string> {
    if (!file) throw new BadRequestException('No file received');
    if (!file.buffer) throw new BadRequestException('No file buffer received');

    try {
      const isImage =
        file.mimetype.startsWith('image/') && !file.mimetype.includes('svg');
      let finalBuffer = file.buffer;
      let finalExtension = this.safeExt(file.originalname);
      let contentType = file.mimetype;

      if (isImage) {
        // Resize and compress image
        finalBuffer = await sharp(file.buffer)
          .resize(1280, 720, {
            fit: 'inside', // Maintain aspect ratio, do not exceed dimensions
            withoutEnlargement: true, // Do not upscale smaller images
          })
          .webp({ quality: 80 }) // Convert to WebP for better compression
          .toBuffer();
        finalExtension = '.webp';
        contentType = 'image/webp';
      }

      if (this.useS3) {
        // S3 mode: upload buffer to S3
        const key = `${folder}/${this.uniqueName(finalExtension)}`;
        await this.s3!.send(
          new PutObjectCommand({
            Bucket: this.s3Bucket!,
            Key: key,
            Body: finalBuffer,
            ContentType: contentType,
          }),
        );
        return this.publicUrlForKey(key);
      }

      // Local mode: write buffer to disk
      const fileName = this.uniqueName(finalExtension);
      const folderPath = path.join(this.localUploadPath, folder);

      // Ensure folder exists
      if (!fssync.existsSync(folderPath)) {
        fssync.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, fileName);
      await fs.writeFile(filePath, finalBuffer);
      return this.publicUrlForLocal(fileName, folder);
    } catch (err: any) {
      // Log the actual error for debugging
      console.error('FileUploadService Error:', err);
      throw new InternalServerErrorException('Failed to save file');
    }
  }

  /**
   * Delete a file by URL or key (S3) or by public path/local path (local).
   * Accepts:
   *  - S3: full https URL or a key like "uploads/xyz.jpg"
   *  - Local: "/uploads/filename.ext" or an absolute file path inside LOCAL_UPLOAD_PATH
   */
  async deleteFile(fileIdentifier: string): Promise<void> {
    if (!fileIdentifier) return;

    try {
      if (this.useS3) {
        const key = this.extractS3Key(fileIdentifier);
        await this.s3!.send(
          new DeleteObjectCommand({
            Bucket: this.s3Bucket!,
            Key: key,
          }),
        );
        return;
      }

      // Local
      const filePath = this.resolveLocalPath(fileIdentifier);
      await fs.unlink(filePath);
    } catch (err: any) {
      // Ignore not-found deletes; otherwise surface a generic error
      if (err?.code === 'ENOENT' || err?.name === 'NoSuchKey') return;
      throw new InternalServerErrorException('File deletion failed');
    }
  }

  // Helpers
  private uniqueName(ext: string) {
    const id = randomUUID();
    return `${id}${ext}`;
  }

  private safeExt(original: string) {
    // Keep lowercased ext and restrict to a sensible set; fallback to .bin
    const raw = (path.extname(original) || '').toLowerCase();
    if (!raw) return '.bin';
    // Optional stricter filter
    if (!raw.match(/^\.(jpg|jpeg|png|gif|webp|pdf|txt|csv|mp4|mp3|bin)$/)) {
      return '.bin';
    }
    return raw;
  }

  private publicUrlForLocal(
    fileName: string,
    folder: string = UPLOAD_FOLDERS.OTHERS,
  ) {
    // If you run a CDN or proxy, set FILE_PUBLIC_BASE_URL (e.g., https://static.example.com)
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/uploads/${folder}/${encodeURIComponent(fileName)}`;
    }
    // Otherwise assume Nest serves /uploads from LOCAL_UPLOAD_PATH via ServeStatic
    return `/uploads/${folder}/${encodeURIComponent(fileName)}`;
  }

  private publicUrlForKey(key: string) {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    }
    // Default S3 URL; replace if you use a different S3 URL style or CloudFront
    return `https://${this.s3Bucket}.s3.${this.config.get('AWS_REGION')}.amazonaws.com/${key}`;
  }

  private extractS3Key(input: string) {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const url = new URL(input);
      // For path-style URLs: /bucket/key... ; for virtual-hosted: /key...
      // Handle both by stripping leading "/"
      return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    }
    return input;
  }

  private resolveLocalPath(identifier: string) {
    // Supports "/uploads/filename" or an absolute/relative path
    let fileName: string;

    if (identifier.startsWith('/uploads/')) {
      // Remove the leading "/uploads/" and keep the rest (folder + filename)
      fileName = identifier.substring('/uploads/'.length);
    } else {
      // If it's a full path or just a filename, try to keep it relative to localUploadPath
      // but ensure it's not trying to traverse up
      fileName = identifier.replace(/^[\\\/]+/, '');
    }

    const joined = path.join(this.localUploadPath, fileName);
    // Ensure the path stays within localUploadPath (defense-in-depth)
    const normalized = path.normalize(joined);
    if (!normalized.startsWith(path.normalize(this.localUploadPath))) {
      throw new BadRequestException('Invalid file path');
    }
    return normalized;
  }
}
