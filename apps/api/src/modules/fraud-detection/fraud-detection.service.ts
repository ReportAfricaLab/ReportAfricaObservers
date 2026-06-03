import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CampaignEntity } from '../../database/entities';
import { UserEntity } from '../../database/entities';
import { AiService } from '../ai/ai.service';

export interface FraudScore {
  score: number; // 0-100, higher = more suspicious
  level: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  recommendation: 'approve' | 'review' | 'reject';
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly config: ConfigService,
    private readonly ai: AiService,
  ) {}

  async analyzeCampaign(campaignId: string): Promise<FraudScore> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId }, relations: ['author'] });
    if (!campaign) return { score: 0, level: 'low', flags: [], recommendation: 'approve' };

    const flags: string[] = [];
    let score = 0;

    // Rule-based checks
    score += this.checkAccountAge(campaign.author, flags);
    score += await this.checkDuplicateCampaigns(campaign, flags);
    score += this.checkTargetAmount(campaign, flags);
    score += this.checkDescription(campaign, flags);
    score += this.checkDocuments(campaign, flags);
    score += this.checkUserHistory(campaign.author, flags);

    // AI analysis
    score += await this.aiAnalysis(campaign, flags);

    score = Math.min(100, Math.max(0, score));
    const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
    const recommendation = score >= 60 ? 'reject' : score >= 30 ? 'review' : 'approve';

    this.logger.log(`Campaign ${campaignId} fraud score: ${score} (${level}) - ${flags.length} flags`);
    return { score, level, flags, recommendation };
  }

  private checkAccountAge(author: UserEntity, flags: string[]): number {
    if (!author) { flags.push('no_author'); return 20; }
    const ageHours = (Date.now() - new Date(author.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) { flags.push('account_less_than_24h'); return 25; }
    if (ageHours < 72) { flags.push('account_less_than_3_days'); return 10; }
    return 0;
  }

  private async checkDuplicateCampaigns(campaign: CampaignEntity, flags: string[]): Promise<number> {
    const recentCampaigns = await this.campaignRepo.count({
      where: { authorId: campaign.authorId },
    });
    if (recentCampaigns > 5) { flags.push('excessive_campaigns'); return 20; }
    if (recentCampaigns > 3) { flags.push('multiple_campaigns'); return 10; }
    return 0;
  }

  private checkTargetAmount(campaign: CampaignEntity, flags: string[]): number {
    const amount = Number(campaign.targetAmount);
    if (amount > 50000000) { flags.push('extremely_high_target'); return 25; }
    if (amount > 10000000) { flags.push('very_high_target'); return 10; }
    return 0;
  }

  private checkDescription(campaign: CampaignEntity, flags: string[]): number {
    let score = 0;
    const desc = (campaign.description || '').toLowerCase();
    const title = (campaign.title || '').toLowerCase();

    // Very short description
    if (desc.length < 50) { flags.push('short_description'); score += 15; }

    // Urgency manipulation keywords
    const urgencyWords = ['urgent', 'dying', 'last chance', 'only hours left', 'act now', 'send immediately'];
    const urgencyCount = urgencyWords.filter(w => desc.includes(w) || title.includes(w)).length;
    if (urgencyCount >= 3) { flags.push('excessive_urgency_language'); score += 15; }

    // Contact info in description (bypassing platform)
    const contactPatterns = /(\d{10,}|whatsapp|telegram|send to|account number)/i;
    if (contactPatterns.test(desc)) { flags.push('external_contact_info'); score += 20; }

    return score;
  }

  private checkDocuments(campaign: CampaignEntity, flags: string[]): number {
    // Medical/emergency campaigns without documents are suspicious
    const needsDocs = ['medical', 'legal_aid', 'abuse_survivor'].includes(campaign.category);
    if (needsDocs && (!campaign.documents || campaign.documents.length === 0)) {
      flags.push('no_supporting_documents');
      return 15;
    }
    return 0;
  }

  private checkUserHistory(author: UserEntity, flags: string[]): number {
    if (!author) return 0;
    if (author.trustScore < 10) { flags.push('very_low_trust_score'); return 15; }
    if (!author.isVerified && author.trustScore < 30) { flags.push('unverified_low_trust'); return 5; }
    return 0;
  }

  private async aiAnalysis(campaign: CampaignEntity, flags: string[]): Promise<number> {
    try {
      const systemPrompt = 'You are a fraud detection system. Analyze this donation campaign and respond with ONLY a JSON object: {"suspicious": true/false, "reason": "brief reason"}';
      const userMessage = `Title: ${campaign.title}\nCategory: ${campaign.category}\nTarget: ${campaign.currency} ${campaign.targetAmount}\nDescription: ${campaign.description?.substring(0, 500)}\nHas documents: ${(campaign.documents?.length || 0) > 0}\nHas media: ${(campaign.media?.length || 0) > 0}`;

      const response = await this.ai.chat(systemPrompt, userMessage);
      if (response) {
        const parsed = JSON.parse(response);
        if (parsed.suspicious) {
          flags.push(`ai_flagged: ${parsed.reason}`);
          return 20;
        }
      }
    } catch { /* AI analysis failed — skip */ }
    return 0;
  }
}
