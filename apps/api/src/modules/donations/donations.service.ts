import { Injectable, NotFoundException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CampaignEntity, DonationEntity } from '../../database/entities';
import { PaystackService } from './paystack.service';
import { KoraPayService } from '../payments/korapay.service';
import { FraudDetectionService } from '../fraud-detection/fraud-detection.service';
import { CreateCampaignDto, InitiateDonationDto } from './dto/donations.dto';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(DonationEntity)
    private readonly donationRepo: Repository<DonationEntity>,
    private readonly paystackService: PaystackService,
    private readonly koraPayService: KoraPayService,
    @Optional() private readonly fraudService?: FraudDetectionService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  // === CAMPAIGNS ===

  async createCampaign(authorId: string, country: string, dto: CreateCampaignDto): Promise<CampaignEntity> {
    if (!dto.agreedToPlatformFee) {
      throw new BadRequestException('You must agree to the platform fee');
    }
    if (!dto.beneficiaryBank || !dto.beneficiaryAccount) {
      throw new BadRequestException('Bank details are required for campaign payout');
    }

    // Gatekeeping: check requirements
    const user = await this.campaignRepo.manager.getRepository('UserEntity').findOne({ where: { id: authorId } }) as any;
    if (!user || user.trustScore < 50) {
      throw new BadRequestException('Trust score must be at least 50 to create campaigns. Keep reporting accurately to build trust.');
    }

    // Must have completed Course 3 (Investigative Journalism)
    const enrollment = await this.campaignRepo.manager.getRepository('EnrollmentEntity').findOne({ where: { userId: authorId, courseId: this.getInvestigativeCourseId() } }) as any;
    if (!enrollment || !enrollment.completedAt) {
      throw new BadRequestException('You must complete the "Investigative Journalism & Emergency Reporting" course in the Academy before creating campaigns.');
    }

    // Must link to a report with evidence
    if (!dto.reportId) {
      throw new BadRequestException('Campaign must be linked to a verified report with evidence.');
    }
    const report = await this.campaignRepo.manager.getRepository('ReportEntity').findOne({ where: { id: dto.reportId } }) as any;
    if (!report || !report.media || report.media.length === 0) {
      throw new BadRequestException('Linked report must have evidence (photos or videos).');
    }
    if (report.authorId !== authorId) {
      throw new BadRequestException('You can only create campaigns for your own reports.');
    }

    // Auto-calculate target: beneficiaryAmount * 1.25 (10% reporter + 15% platform)
    const beneficiaryAmount = dto.beneficiaryAmount || Number(dto.targetAmount);
    const targetAmount = Math.round(beneficiaryAmount * 1.25);

    const campaign = this.campaignRepo.create({
      ...dto,
      authorId,
      country,
      reportId: dto.reportId,
      reporterId: authorId,
      beneficiaryAmount,
      targetAmount,
      currency: dto.currency || this.getCurrencyForCountry(country),
      media: dto.media || [],
      documents: dto.documents || [],
    });
    const saved = await this.campaignRepo.save(campaign);

    // Auto fraud analysis (async, non-blocking)
    if (this.fraudService) {
      this.fraudService.analyzeCampaign(saved.id).then((result) => {
        if (result.recommendation === 'reject') {
          this.campaignRepo.update(saved.id, { isActive: false, verificationLevel: 'fraud_flagged' });
        } else if (result.recommendation === 'review') {
          this.campaignRepo.update(saved.id, { verificationLevel: 'pending_review' });
        }
      }).catch(() => {});
    }

    return saved;
  }

  private getInvestigativeCourseId(): string {
    // Course 3: Investigative Journalism & Emergency Reporting
    // This will be resolved dynamically in production
    return 'f7879978-70d2-4f72-8002-52d99488240c';
  }

  async getCampaignById(id: string): Promise<CampaignEntity> {
    const campaign = await this.campaignRepo.findOne({ where: { id }, relations: ['author'] });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async getCampaignFeed(country: string, page = 1, limit = 20) {
    const cacheKey = `campaigns:${country}:${page}`;
    if (this.cache) {
      const cached = await this.cache.get<{ data: CampaignEntity[]; meta: any }>(cacheKey);
      if (cached) return cached;
    }

    const [data, total] = await this.campaignRepo.findAndCount({
      where: { country, isActive: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });

    const result = { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };

    if (this.cache) {
      await this.cache.set(cacheKey, result, 90000); // 90s cache
    }

    return result;
  }

  async getEmergencyCampaigns(country: string) {
    const cacheKey = `campaigns:emergency:${country}`;
    if (this.cache) {
      const cached = await this.cache.get<CampaignEntity[]>(cacheKey);
      if (cached) return cached;
    }

    const results = await this.campaignRepo.find({
      where: { country, isActive: true, isEmergency: true },
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['author'],
    });

    if (this.cache) {
      await this.cache.set(cacheKey, results, 60000);
    }

    return results;
  }

  async getCampaignsByCategory(country: string, category: string, page = 1, limit = 20) {
    return this.campaignRepo.find({
      where: { country, category, isActive: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });
  }

  // === DONATIONS ===

  async initiateDonation(campaignId: string, donorId: string | null, dto: InitiateDonationDto) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign.isActive) throw new BadRequestException('Campaign is no longer active');

    const reference = this.paystackService.generateReference();

    // Create donation record
    const donation = this.donationRepo.create({
      campaignId,
      donorId,
      amount: dto.amount,
      currency: campaign.currency,
      isAnonymous: dto.isAnonymous || false,
      message: dto.message,
      status: 'pending',
      paymentReference: reference,
    });
    await this.donationRepo.save(donation);

    // Initialize Paystack payment
    const paymentResult = await this.paystackService.initializePayment({
      email: dto.email,
      amount: dto.amount * 100, // Convert to kobo/pesewas
      currency: campaign.currency,
      reference,
      metadata: { campaignId, donorId, donationId: donation.id },
    });

    return {
      donation,
      paymentUrl: paymentResult.data?.authorization_url,
      reference,
    };
  }

  async verifyDonation(reference: string) {
    const donation = await this.donationRepo.findOne({ where: { paymentReference: reference } });
    if (!donation) throw new NotFoundException('Donation not found');

    const verification = await this.paystackService.verifyPayment(reference);

    if (verification.data?.status === 'success') {
      donation.status = 'success';
      donation.paystackReference = verification.data.reference;
      await this.donationRepo.save(donation);

      // Update campaign raised amount and donor count
      await this.campaignRepo
        .createQueryBuilder()
        .update(CampaignEntity)
        .set({
          raisedAmount: () => `raised_amount + ${donation.amount}`,
          donorCount: () => `donor_count + 1`,
        })
        .where('id = :id', { id: donation.campaignId })
        .execute();

      // Check if target reached → auto-payout
      await this.checkAndPayoutCampaign(donation.campaignId);

      return { status: 'success', donation };
    }

    donation.status = 'failed';
    await this.donationRepo.save(donation);
    return { status: 'failed', donation };
  }

  private async checkAndPayoutCampaign(campaignId: string) {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign || !campaign.isActive) return;

    const target = Number(campaign.targetAmount);
    if (Number(campaign.raisedAmount) < target) return;

    // Target reached! Split payout:
    // Beneficiary gets 100% of their stated need (80% of target)
    // Reporter gets 10% of beneficiary amount (8% of target)
    // Platform keeps 15% of beneficiary amount (12% of target)
    if (!campaign.beneficiaryBank || !campaign.beneficiaryAccount) return;

    const beneficiaryAmount = Number(campaign.beneficiaryAmount) || Math.round(target * 0.80);
    const reporterAmount = Math.round(beneficiaryAmount * 0.10);
    const reference = this.koraPayService.generateReference();

    try {
      // Pay beneficiary
      await this.koraPayService.initializeSplitPayment({
        amount: beneficiaryAmount,
        currency: campaign.currency,
        customerEmail: 'payout@reportafrica.africa',
        customerName: campaign.beneficiaryName || 'Campaign Beneficiary',
        reference,
        reporterBankAccount: {
          bankCode: campaign.beneficiaryBank,
          accountNumber: campaign.beneficiaryAccount,
          accountName: campaign.beneficiaryName || '',
        },
        platformSplitPercent: 0,
        metadata: { type: 'campaign_payout', campaignId },
      });

      // Pay reporter (if different from beneficiary and has bank details)
      if (campaign.reporterId) {
        const reporter = await this.campaignRepo.manager.getRepository('UserEntity').findOne({ where: { id: campaign.reporterId } }) as any;
        if (reporter && reporter.bankAccountNumber && reporter.bankCode) {
          const reporterRef = this.koraPayService.generateReference();
          await this.koraPayService.initializeSplitPayment({
            amount: reporterAmount,
            currency: campaign.currency,
            customerEmail: 'reporter-payout@reportafrica.africa',
            customerName: reporter.displayName || 'Reporter',
            reference: reporterRef,
            reporterBankAccount: {
              bankCode: reporter.bankCode,
              accountNumber: reporter.bankAccountNumber,
              accountName: reporter.bankAccountName || reporter.displayName || '',
            },
            platformSplitPercent: 0,
            metadata: { type: 'reporter_campaign_commission', campaignId, reporterId: campaign.reporterId },
          });
        } else {
          // No bank details — add to tip balance
          await this.campaignRepo.manager.getRepository('UserEntity').increment({ id: campaign.reporterId }, 'tipBalance', reporterAmount);
        }
      }

      // Mark campaign as paid out
      await this.campaignRepo.update(campaignId, { isActive: false, verificationLevel: 'funded_paid' });
    } catch {
      // Payout failed — will retry on next donation or manual intervention
    }
  }

  private getCurrencyForCountry(country: string): string {
    const map: Record<string, string> = {
      NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', UG: 'UGX', RW: 'RWF',
      TZ: 'TZS', ET: 'ETB', SN: 'XOF', CM: 'XAF', EG: 'EGP', MA: 'USD',
      DZ: 'USD', TN: 'USD', CI: 'XOF', AO: 'USD', MZ: 'USD', CD: 'USD',
      SD: 'USD', LY: 'USD', ZW: 'USD', ZM: 'USD', MW: 'USD', BJ: 'XOF',
      TG: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', SL: 'USD', LR: 'USD',
      SO: 'USD', MG: 'USD',
    };
    return map[country] || 'USD';
  }

  async handleWebhook(event: string, data: any) {
    if (event === 'charge.success') {
      await this.verifyDonation(data.reference);
    }
  }

  async getCampaignDonations(campaignId: string, page = 1, limit = 20) {
    return this.donationRepo.find({
      where: { campaignId, status: 'success' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['donor'],
    });
  }
}
