import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as redisStore from 'cache-manager-redis-yet';
import { HealthModule } from './modules/health/health.module';
import { FaceBlurModule } from './modules/face-blur/face-blur.module';
import { FraudDetectionModule } from './modules/fraud-detection/fraud-detection.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { TrustModule } from './modules/trust/trust.module';
import { VerificationModule } from './modules/verification/verification.module';
import { DonationsModule } from './modules/donations/donations.module';
import { MediaLicensingModule } from './modules/media-licensing/media-licensing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { EarningsModule } from './modules/earnings/earnings.module';
import { AdminModule } from './modules/admin/admin.module';
import { LocalizationModule } from './modules/localization/localization.module';
import { UploadModule } from './modules/upload/upload.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { LivestreamModule } from './modules/livestream/livestream.module';
import { ElectionModule } from './modules/election/election.module';
import { SearchModule } from './modules/search/search.module';
import { QueueModule } from './modules/queue/queue.module';
import { RekognitionModule } from './modules/rekognition/rekognition.module';
import { CommentsModule } from './modules/comments/comments.module';
import { TipsModule } from './modules/tips/tips.module';
import { FollowsModule } from './modules/follows/follows.module';
import { ReportUpdatesModule } from './modules/report-updates/report-updates.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { ReferralModule } from './modules/referral/referral.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { VoiceModule } from './modules/voice/voice.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        ttl: 60000,
      }),
    }),
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 10,
    }, {
      name: 'medium',
      ttl: 60000,
      limit: 100,
    }, {
      name: 'long',
      ttl: 3600000,
      limit: 1000,
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'postgres'),
        password: config.get('DATABASE_PASSWORD', ''),
        database: config.get('DATABASE_NAME', 'reportafrica'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: config.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    AuthModule,
    UsersModule,
    ReportsModule,
    ModerationModule,
    TrustModule,
    VerificationModule,
    DonationsModule,
    MediaLicensingModule,
    AnalyticsModule,
    PaymentsModule,
    EarningsModule,
    AdminModule,
    LocalizationModule,
    UploadModule,
    RealtimeModule,
    NotificationsModule,
    EmergencyModule,
    LivestreamModule,
    ElectionModule,
    SearchModule,
    QueueModule,
    RekognitionModule,
    HealthModule,
    FaceBlurModule,
    FraudDetectionModule,
    CommentsModule,
    TipsModule,
    FollowsModule,
    ReportUpdatesModule,
    LeaderboardModule,
    ReferralModule,
    WatchlistModule,
    VoiceModule,
    AiModule,
  ],
})
export class AppModule {}
