import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralEntity, UserEntity } from '../../database/entities';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { TrustModule } from '../trust/trust.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralEntity, UserEntity]),
    TrustModule,
    NotificationsModule,
  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
