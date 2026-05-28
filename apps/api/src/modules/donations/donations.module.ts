import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEntity, DonationEntity } from '../../database/entities';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PaystackService } from './paystack.service';
import { FraudDetectionModule } from '../fraud-detection/fraud-detection.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignEntity, DonationEntity]),
    FraudDetectionModule,
  ],
  controllers: [DonationsController],
  providers: [DonationsService, PaystackService],
  exports: [DonationsService],
})
export class DonationsModule {}
