import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FraudDetectionService } from './fraud-detection.service';

@Controller('fraud')
export class FraudDetectionController {
  constructor(private readonly fraudService: FraudDetectionService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('analyze/:campaignId')
  analyzeCampaign(@Param('campaignId') campaignId: string) {
    return this.fraudService.analyzeCampaign(campaignId);
  }
}
