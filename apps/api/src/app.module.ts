import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
