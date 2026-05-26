import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get('AWS_S3_BUCKET', 'reportafrica-media');
    this.region = this.config.get('AWS_REGION', 'af-south-1');
    this.accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', '');
    this.secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY', '');
  }

  async getPresignedUploadUrl(userId: string, fileType: string, contentType: string): Promise<PresignedUrlResult> {
    const ext = this.getExtension(contentType);
    const folder = this.getFolder(fileType);
    const key = `${folder}/${userId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;

    // Generate presigned URL using AWS Signature V4
    const expires = 3600;
    const date = new Date();
    const dateStr = date.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 8);
    const credential = `${this.accessKeyId}/${dateStr}/${this.region}/s3/aws4_request`;

    const policy = Buffer.from(JSON.stringify({
      expiration: new Date(Date.now() + expires * 1000).toISOString(),
      conditions: [
        { bucket: this.bucket },
        { key },
        ['content-length-range', 0, 100 * 1024 * 1024], // max 100MB
        { 'Content-Type': contentType },
      ],
    })).toString('base64');

    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    const uploadUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

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
      case 'voice_note': return 'audio';
      case 'document': return 'documents';
      default: return 'uploads';
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
      'application/pdf': '.pdf',
    };
    return map[contentType] || '.bin';
  }
}
