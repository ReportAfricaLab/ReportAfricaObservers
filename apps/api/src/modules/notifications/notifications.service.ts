import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '../../database/entities';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly fcmServerKey: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    this.fcmServerKey = this.config.get('FCM_SERVER_KEY', '');
  }

  async sendToUser(userId: string, payload: NotificationPayload) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.fcmToken) return;
    return this.sendToToken(user.fcmToken, payload);
  }

  async sendToCountry(country: string, payload: NotificationPayload) {
    const users = await this.userRepo.find({
      where: { country },
      select: ['fcmToken'],
    });
    const tokens = users.map((u) => u.fcmToken).filter(Boolean);
    if (tokens.length === 0) return;

    // Send in batches of 500 (FCM limit)
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await this.sendToTokens(batch, payload);
    }
    this.logger.log(`Sent notification to ${tokens.length} users in ${country}`);
  }

  async sendNearbyAlert(latitude: number, longitude: number, radiusKm: number, payload: NotificationPayload) {
    const radiusDegrees = radiusKm / 111;
    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.latitude BETWEEN :minLat AND :maxLat', { minLat: latitude - radiusDegrees, maxLat: latitude + radiusDegrees })
      .andWhere('user.longitude BETWEEN :minLng AND :maxLng', { minLng: longitude - radiusDegrees, maxLng: longitude + radiusDegrees })
      .andWhere('user.fcmToken IS NOT NULL')
      .getMany();

    const tokens = users.map((u) => u.fcmToken).filter(Boolean);
    if (tokens.length > 0) {
      await this.sendToTokens(tokens, payload);
      this.logger.log(`Sent nearby alert to ${tokens.length} users`);
    }
  }

  private async sendToToken(token: string, payload: NotificationPayload) {
    return this.sendToTokens([token], payload);
  }

  private async sendToTokens(tokens: string[], payload: NotificationPayload) {
    if (!this.fcmServerKey) {
      this.logger.warn('FCM_SERVER_KEY not set, skipping push notification');
      return;
    }

    try {
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_ids: tokens,
          notification: { title: payload.title, body: payload.body },
          data: payload.data || {},
        }),
      });
    } catch (error) {
      this.logger.error('FCM send failed', error);
    }
  }
}
