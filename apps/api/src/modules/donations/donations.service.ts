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
      throw new BadRequestException('You must agree to the 15% platform fee');
    }
    if (!dto.beneficiaryBank || !dto.beneficiaryAccount) {
      throw new BadRequestException('Bank details are required for campaign payout');
    }

    const campaign = this.campaignRepo.create({
      ...dto,
      authorId,
      country,
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

    const targetWithFee = Number(campaign.targetAmount) * 1.15; // target + 15% fee
    if (Number(campaign.raisedAmount) < targetWithFee) return;

    // Target reached! Payout 85% to campaign creator, keep 15%
    if (!campaign.beneficiaryBank || !campaign.beneficiaryAccount) return;

    const payoutAmount = Math.round(Number(campaign.raisedAmount) * 0.85);
    const reference = this.koraPayService.generateReference();

    try {
      await this.koraPayService.initializeSplitPayment({
        amount: payoutAmount,
        currency: campaign.currency,
        customerEmail: 'payout@reportafrica.com',
        customerName: campaign.beneficiaryName || 'Campaign Beneficiary',
        reference,
        reporterBankAccount: {
          bankCode: campaign.beneficiaryBank,
          accountNumber: campaign.beneficiaryAccount,
          accountName: campaign.beneficiaryName || '',
        },
        platformSplitPercent: 0, // Full amount goes to beneficiary (15% already deducted)
        metadata: { type: 'campaign_payout', campaignId },
      });

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
