import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

export interface PresignedUrlResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly bucket: string;
  private readonly region: string;
  private readonly s3Client: S3Client | null;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get('AWS_S3_BUCKET', 'reportafrica-media-prod');
    this.region = this.config.get('AWS_REGION', 'eu-west-1');

    const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY', '');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({ region: this.region, credentials: { accessKeyId, secretAccessKey } });
    } else {
      this.s3Client = null;
    }
  }

  async getPresignedUploadUrl(userId: string, fileType: string, contentType: string): Promise<PresignedUrlResult> {
    const ext = this.getExtension(contentType);
    const folder = this.getFolder(fileType);
    const key = `${folder}/${userId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;

    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    if (!this.s3Client) {
      // Dev mode — return unsigned URL
      return { uploadUrl: fileUrl, fileUrl, key };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    this.logger.log(`Presigned URL generated: ${key}`);
    return { uploadUrl, fileUrl, key };
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private getFolder(fileType: string): string {
    switch (fileType) {
      case 'image': return 'images';
      case 'video': return 'videos';
      case 'audio':
      case 'voice_note': return 'audio';
      case 'document': return 'documents';
      default: return 'uploads';
    }
  }

  private getMaxSize(fileType: string): number {
    switch (fileType) {
      case 'image': return 10 * 1024 * 1024; // 10MB
      case 'video': return 100 * 1024 * 1024; // 100MB
      case 'audio':
      case 'voice_note': return 25 * 1024 * 1024; // 25MB
      case 'document': return 20 * 1024 * 1024; // 20MB
      default: return 10 * 1024 * 1024;
    }
  }

  private getExtension(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/m4a': '.m4a',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'application/pdf': '.pdf',
    };
    return map[contentType] || '.bin';
  }
}
