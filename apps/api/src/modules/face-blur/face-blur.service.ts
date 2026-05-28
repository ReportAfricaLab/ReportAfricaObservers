import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { RekognitionService } from '../rekognition/rekognition.service';

interface FaceBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

@Injectable()
export class FaceBlurService {
  private readonly logger = new Logger(FaceBlurService.name);
  private readonly bucket: string;
  private readonly region: string;

  constructor(
    private readonly config: ConfigService,
    private readonly rekognition: RekognitionService,
  ) {
    this.bucket = this.config.get('AWS_S3_BUCKET', 'reportafrica-media');
    this.region = this.config.get('AWS_REGION', 'af-south-1');
  }

  async blurFacesInImage(s3Key: string): Promise<{ blurredKey: string; facesDetected: number } | null> {
    try {
      // 1. Download image from S3
      const imageBuffer = await this.downloadFromS3(s3Key);
      if (!imageBuffer) return null;

      // 2. Get image dimensions
      const metadata = await sharp(imageBuffer).metadata();
      const imgWidth = metadata.width || 0;
      const imgHeight = metadata.height || 0;
      if (!imgWidth || !imgHeight) return null;

      // 3. Detect faces via Rekognition
      const faces = await this.detectFaceBoundingBoxes(s3Key);
      if (faces.length === 0) return null;

      // 4. Blur each face region
      const blurredBuffer = await this.applyBlur(imageBuffer, faces, imgWidth, imgHeight);

      // 5. Upload blurred image to S3
      const blurredKey = s3Key.replace(/(\.[^.]+)$/, '_blurred$1');
      await this.uploadToS3(blurredKey, blurredBuffer, metadata.format || 'jpeg');

      this.logger.log(`Blurred ${faces.length} face(s) in ${s3Key} → ${blurredKey}`);
      return { blurredKey, facesDetected: faces.length };
    } catch (error) {
      this.logger.error(`Face blur failed for ${s3Key}`, error);
      return null;
    }
  }

  private async detectFaceBoundingBoxes(s3Key: string): Promise<FaceBox[]> {
    const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', '');
    if (!accessKeyId || accessKeyId === 'your_access_key') {
      return []; // Dev mode — no faces
    }

    try {
      const response = await fetch(`https://rekognition.${this.region}.amazonaws.com`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'RekognitionService.DetectFaces',
        },
        body: JSON.stringify({
          Image: { S3Object: { Bucket: this.bucket, Name: s3Key } },
          Attributes: ['DEFAULT'],
        }),
      });

      const data = await response.json();
      return (data.FaceDetails || []).map((face: any) => ({
        left: face.BoundingBox.Left,
        top: face.BoundingBox.Top,
        width: face.BoundingBox.Width,
        height: face.BoundingBox.Height,
      }));
    } catch {
      return [];
    }
  }

  private async applyBlur(imageBuffer: Buffer, faces: FaceBox[], imgWidth: number, imgHeight: number): Promise<Buffer> {
    let image = sharp(imageBuffer);

    // Create blur composites for each face
    const composites: sharp.OverlayOptions[] = [];

    for (const face of faces) {
      const x = Math.round(face.left * imgWidth);
      const y = Math.round(face.top * imgHeight);
      const w = Math.round(face.width * imgWidth);
      const h = Math.round(face.height * imgHeight);

      // Extract face region, blur it heavily, then composite back
      const faceRegion = await sharp(imageBuffer)
        .extract({ left: x, top: y, width: w, height: h })
        .blur(30)
        .toBuffer();

      composites.push({ input: faceRegion, left: x, top: y });
    }

    return image.composite(composites).toBuffer();
  }

  private async downloadFromS3(key: string): Promise<Buffer | null> {
    try {
      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  private async uploadToS3(key: string, buffer: Buffer, format: string): Promise<void> {
    const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: new Uint8Array(buffer),
    });
  }
}
