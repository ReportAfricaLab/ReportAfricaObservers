import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEntity, DonationEntity } from '../../database/entities';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PaystackService } from './paystack.service';
import { PaymentsModule } from '../payments/payments.module';
import { FraudDetectionModule } from '../fraud-detection/fraud-detection.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignEntity, DonationEntity]),
    PaymentsModule,
    FraudDetectionModule,
  ],
  controllers: [DonationsController],
  providers: [DonationsService, PaystackService],
  exports: [DonationsService, PaystackService],
})
export class DonationsModule {}
