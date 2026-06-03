import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RekognitionClient, DetectModerationLabelsCommand, DetectFacesCommand, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

export interface RekognitionResult {
  isApproved: boolean;
  labels: { name: string; confidence: number }[];
  moderationLabels: { name: string; confidence: number; parentName?: string }[];
  flags: string[];
}

@Injectable()
export class RekognitionService {
  private readonly logger = new Logger(RekognitionService.name);
  private readonly client: RekognitionClient | null;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY', '');
    const region = this.config.get('AWS_REGION', 'eu-west-1');
    this.bucket = this.config.get('AWS_S3_BUCKET', 'reportafrica-media-prod');

    if (accessKeyId && secretAccessKey) {
      this.client = new RekognitionClient({ region, credentials: { accessKeyId, secretAccessKey } });
    } else {
      this.client = null;
    }
  }

  async moderateImage(s3Key: string): Promise<RekognitionResult> {
    if (!this.client) return this.mockModeration();

    try {
      const command = new DetectModerationLabelsCommand({
        Image: { S3Object: { Bucket: this.bucket, Name: s3Key } },
        MinConfidence: 60,
      });
      const response = await this.client.send(command);
      const moderationLabels = (response.ModerationLabels || []).map((l) => ({
        name: l.Name || '',
        confidence: l.Confidence || 0,
        parentName: l.ParentName,
      }));

      const flags = this.extractFlags(moderationLabels);
      return { isApproved: flags.length === 0, labels: [], moderationLabels, flags };
    } catch (error) {
      this.logger.error('Rekognition moderation failed', error);
      return this.mockModeration();
    }
  }

  async detectFaces(s3Key: string): Promise<{ count: number; hasFaces: boolean; boundingBoxes: any[] }> {
    if (!this.client) return { count: 0, hasFaces: false, boundingBoxes: [] };

    try {
      const command = new DetectFacesCommand({
        Image: { S3Object: { Bucket: this.bucket, Name: s3Key } },
        Attributes: ['DEFAULT'],
      });
      const response = await this.client.send(command);
      const faces = response.FaceDetails || [];
      return {
        count: faces.length,
        hasFaces: faces.length > 0,
        boundingBoxes: faces.map((f) => f.BoundingBox),
      };
    } catch (error) {
      this.logger.error('Rekognition face detection failed', error);
      return { count: 0, hasFaces: false, boundingBoxes: [] };
    }
  }

  async detectLabels(s3Key: string): Promise<{ name: string; confidence: number }[]> {
    if (!this.client) return [];

    try {
      const command = new DetectLabelsCommand({
        Image: { S3Object: { Bucket: this.bucket, Name: s3Key } },
        MaxLabels: 10,
        MinConfidence: 70,
      });
      const response = await this.client.send(command);
      return (response.Labels || []).map((l) => ({ name: l.Name || '', confidence: l.Confidence || 0 }));
    } catch (error) {
      this.logger.error('Rekognition label detection failed', error);
      return [];
    }
  }

  private extractFlags(moderationLabels: { name: string; confidence: number }[]): string[] {
    const flags: string[] = [];
    for (const label of moderationLabels) {
      const name = label.name.toLowerCase();
      if (name.includes('nudity') || name.includes('explicit')) flags.push('nudity');
      if (name.includes('violence') || name.includes('gore')) flags.push('violence');
      if (name.includes('weapon') || name.includes('firearms')) flags.push('weapons');
      if (name.includes('hate') || name.includes('extremist')) flags.push('hate_symbols');
      if (name.includes('drugs') || name.includes('tobacco')) flags.push('drugs');
    }
    return [...new Set(flags)];
  }

  private mockModeration(): RekognitionResult {
    return { isApproved: true, labels: [], moderationLabels: [], flags: [] };
  }
}
