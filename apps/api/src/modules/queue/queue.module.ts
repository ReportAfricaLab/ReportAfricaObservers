import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationProcessor, MediaProcessor, ModerationProcessor } from './queue.processors';
import { NotificationsModule } from '../notifications/notifications.module';
import { FaceBlurModule } from '../face-blur/face-blur.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'media-processing' },
      { name: 'moderation' },
    ),
    NotificationsModule,
    FaceBlurModule,
  ],
  providers: [NotificationProcessor, MediaProcessor, ModerationProcessor],
  exports: [BullModule],
})
export class QueueModule {}
