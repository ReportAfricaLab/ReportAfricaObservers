import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { RekognitionService } from '../rekognition/rekognition.service';

export interface ModerationResult {
  isApproved: boolean;
  flags: string[];
  confidence: number;
  suggestedVerification: string;
  aiSummary?: string;
  aiHeadline?: string;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly ai: AiService,
    private readonly rekognition: RekognitionService,
  ) {}

  async moderateReport(title: string, description: string, category: string): Promise<ModerationResult> {
    const systemPrompt = `You are a content moderation AI for ReportAfrica, a citizen journalism platform. Analyze reports for:
1. Fake/misleading content
2. Hate speech or incitement
3. Spam or irrelevant content
4. Dangerous misinformation
5. Credibility assessment

Also generate a news headline and brief summary.

Respond in JSON: { "isApproved": boolean, "flags": string[], "confidence": 0-1, "suggestedVerification": "unverified"|"ai_verified", "aiHeadline": string, "aiSummary": string }`;

    const userMessage = `Category: ${category}\nTitle: ${title}\nDescription: ${description}`;

    const response = await this.ai.chat(systemPrompt, userMessage);

    if (response) {
      try {
        const result = JSON.parse(response);
        this.logger.log(`AI moderation for "${title}": approved=${result.isApproved}, confidence=${result.confidence}`);
        return result;
      } catch {
        this.logger.warn('Failed to parse AI moderation response');
      }
    }

    // Fallback to rule-based
    return this.ruleBasedModeration(title, description);
  }

  async moderateImage(s3Key: string): Promise<{ isApproved: boolean; flags: string[] }> {
    const result = await this.rekognition.moderateImage(s3Key);
    return { isApproved: result.isApproved, flags: result.flags };
  }

  private ruleBasedModeration(title: string, description: string): ModerationResult {
    const flags: string[] = [];
    const text = `${title} ${description}`.toLowerCase();

    const spamPatterns = ['buy now', 'click here', 'free money', 'whatsapp me', 'dm me'];
    const hatePatterns = ['kill all', 'death to'];
    const suspiciousPatterns = ['i heard that', 'someone told me', 'rumor has it'];

    spamPatterns.forEach((p) => { if (text.includes(p)) flags.push('spam'); });
    hatePatterns.forEach((p) => { if (text.includes(p)) flags.push('hate_speech'); });
    suspiciousPatterns.forEach((p) => { if (text.includes(p)) flags.push('unverified_claim'); });

    if (text.length < 20) flags.push('low_quality');

    return {
      isApproved: flags.length === 0,
      flags,
      confidence: flags.length === 0 ? 0.7 : 0.5,
      suggestedVerification: 'unverified',
    };
  }
}
