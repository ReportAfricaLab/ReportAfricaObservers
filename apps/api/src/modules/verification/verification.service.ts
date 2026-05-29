import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationEntity, ReportEntity } from '../../database/entities';
import { TrustService } from '../trust/trust.service';

const COMMUNITY_VERIFY_THRESHOLD = 5;

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationEntity)
    private readonly verificationRepo: Repository<VerificationEntity>,
    @InjectRepository(ReportEntity)
    private readonly reportRepo: Repository<ReportEntity>,
    private readonly trustService: TrustService,
  ) {}

  async vote(reportId: string, userId: string, vote: 'confirm' | 'dispute', comment?: string) {
    const existing = await this.verificationRepo.findOne({ where: { reportId, userId } });
    if (existing) throw new ConflictException('You have already voted on this report');

    const verification = this.verificationRepo.create({ reportId, userId, vote, comment });
    await this.verificationRepo.save(verification);

    // Check if report should be promoted to community_verified
    const promoted = await this.checkAndUpdateVerificationLevel(reportId);

    // Reward verifier with trust points for participating
    await this.trustService.addScore(userId, 'report_created'); // +5 for participating

    // If the report just got community_verified, reward all confirming voters
    if (promoted) {
      await this.rewardAccurateVerifiers(reportId);
    }

    return this.getReportVerificationStats(reportId);
  }

  async getReportVerificationStats(reportId: string) {
    const confirms = await this.verificationRepo.count({ where: { reportId, vote: 'confirm' } });
    const disputes = await this.verificationRepo.count({ where: { reportId, vote: 'dispute' } });
    const report = await this.reportRepo.findOne({ where: { id: reportId } });

    return {
      reportId,
      confirms,
      disputes,
      verificationLevel: report?.verificationLevel || 'unverified',
      credibilityScore: confirms > 0 ? Math.round((confirms / (confirms + disputes)) * 100) : 0,
    };
  }

  private async checkAndUpdateVerificationLevel(reportId: string): Promise<boolean> {
    const confirms = await this.verificationRepo.count({ where: { reportId, vote: 'confirm' } });
    const disputes = await this.verificationRepo.count({ where: { reportId, vote: 'dispute' } });

    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report || report.verificationLevel === 'community_verified') return false;

    if (confirms >= COMMUNITY_VERIFY_THRESHOLD && confirms > disputes * 2) {
      await this.reportRepo.update(reportId, { verificationLevel: 'community_verified' });

      // Reward the report author for getting verified
      await this.trustService.addScore(report.authorId, 'report_verified');
      return true;
    }

    return false;
  }

  private async rewardAccurateVerifiers(reportId: string) {
    // Reward users who voted 'confirm' on a now-verified report
    const confirmVoters = await this.verificationRepo.find({
      where: { reportId, vote: 'confirm' },
      select: ['userId'],
    });

    for (const voter of confirmVoters) {
      await this.trustService.addScore(voter.userId, 'report_upvoted'); // +2 bonus for accurate verification
    }
  }
}
