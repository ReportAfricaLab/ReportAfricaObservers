import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportEntity } from '../../database/entities';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ModerationModule } from '../moderation/moderation.module';
import { TrustModule } from '../trust/trust.module';
import { FollowsModule } from '../follows/follows.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { ReferralModule } from '../referral/referral.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportEntity]),
    ModerationModule,
    TrustModule,
    FollowsModule,
    WatchlistModule,
    ReferralModule,
    NotificationsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
