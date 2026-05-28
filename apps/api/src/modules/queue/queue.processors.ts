import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../notifications/notifications.service';
import { FaceBlurService } from '../face-blur/face-blur.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notifications: NotificationsService) {}

  @Process('send-to-user')
  async handleSendToUser(job: Job<{ userId: string; title: string; body: string; data?: Record<string, string> }>) {
    await this.notifications.sendToUser(job.data.userId, { title: job.data.title, body: job.data.body, data: job.data.data });
    this.logger.log(`Notification sent to user ${job.data.userId}`);
  }

  @Process('send-to-country')
  async handleSendToCountry(job: Job<{ country: string; title: string; body: string; data?: Record<string, string> }>) {
    await this.notifications.sendToCountry(job.data.country, { title: job.data.title, body: job.data.body, data: job.data.data });
    this.logger.log(`Notification sent to country ${job.data.country}`);
  }

  @Process('send-nearby')
  async handleSendNearby(job: Job<{ latitude: number; longitude: number; radiusKm: number; title: string; body: string; data?: Record<string, string> }>) {
    await this.notifications.sendNearbyAlert(job.data.latitude, job.data.longitude, job.data.radiusKm, { title: job.data.title, body: job.data.body, data: job.data.data });
    this.logger.log(`Nearby notification sent (${job.data.latitude}, ${job.data.longitude})`);
  }
}

@Processor('media-processing')
export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(private readonly faceBlurService: FaceBlurService) {}

  @Process('transcode-video')
  async handleTranscode(job: Job<{ fileUrl: string; reportId: string; userId: string }>) {
    this.logger.log(`Video transcoding queued: ${job.data.fileUrl} for report ${job.data.reportId}`);
  }

  @Process('generate-thumbnail')
  async handleThumbnail(job: Job<{ fileUrl: string; reportId: string }>) {
    this.logger.log(`Thumbnail generation queued: ${job.data.fileUrl}`);
  }

  @Process('blur-faces')
  async handleBlurFaces(job: Job<{ s3Key: string; reportId: string }>) {
    this.logger.log(`Face blur queued: ${job.data.s3Key} for report ${job.data.reportId}`);
    const result = await this.faceBlurService.blurFacesInImage(job.data.s3Key);
    if (result) {
      this.logger.log(`Blurred ${result.facesDetected} face(s) → ${result.blurredKey}`);
    }
  }
}

@Processor('moderation')
export class ModerationProcessor {
  private readonly logger = new Logger(ModerationProcessor.name);

  @Process('moderate-image')
  async handleModerateImage(job: Job<{ fileUrl: string; reportId: string }>) {
    // In production: call AWS Rekognition
    this.logger.log(`Image moderation queued: ${job.data.fileUrl} for report ${job.data.reportId}`);
  }

  @Process('moderate-text')
  async handleModerateText(job: Job<{ text: string; reportId: string }>) {
    this.logger.log(`Text moderation queued for report ${job.data.reportId}`);
  }
}

// Combined export for module providers
export const QueueProcessors = [NotificationProcessor, MediaProcessor, ModerationProcessor];
