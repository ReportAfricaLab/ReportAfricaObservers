import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationEntity, ReportEntity } from '../../database/entities';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { TrustModule } from '../trust/trust.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationEntity, ReportEntity]),
    TrustModule,
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
