import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipEntity, ReportEntity, UserEntity } from '../../database/entities';
import { PaystackService } from '../donations/paystack.service';
import { KoraPayService } from '../payments/korapay.service';
import { CurrencyConversionService } from '../payments/currency-conversion.service';
import { EarningsService } from '../earnings/earnings.service';
import { NotificationsService } from '../notifications/notifications.service';

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', UG: 'UGX', RW: 'RWF',
  TZ: 'TZS', ET: 'ETB', SN: 'XOF', CM: 'XAF', EG: 'EGP', MA: 'MAD',
  DZ: 'DZD', TN: 'TND', CI: 'XOF', AO: 'AOA', MZ: 'MZN', CD: 'CDF',
  SD: 'SDG', LY: 'LYD', ZW: 'USD', ZM: 'ZMW', MW: 'MWK', BJ: 'XOF',
  TG: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', SL: 'SLE', LR: 'LRD',
  SO: 'SOS', MG: 'MGA',
};

const CURRENCY_RATES: Record<string, number> = {
  NGN: 1500, GHS: 14, KES: 150, ZAR: 18, UGX: 3700, RWF: 1300,
  TZS: 2600, ETB: 57, XOF: 600, XAF: 600, EGP: 48, MAD: 10,
  DZD: 135, TND: 3.1, AOA: 850, MZN: 64, CDF: 2700, SDG: 600,
  LYD: 4.8, USD: 1, ZMW: 26, MWK: 1700, SLE: 22, LRD: 190,
  SOS: 570, MGA: 4500,
};

const PLATFORM_FEE = 0.05; // 5% platform fee on all packs

// Pack values in USD equivalent (used to calculate local currency amounts)
const PACK_USD_VALUES = [3.3, 6.7, 16.7, 33.3, 50, 66.7];
const PACK_LABELS_INTERNAL = ['Starter', 'Basic', 'Popular', 'Supporter', 'Champion', 'Legend'];

function getPacksForCurrency(currency: string): { value: number; fee: number; cost: number }[] {
  const rate = CURRENCY_RATES[currency] || 1;
  return PACK_USD_VALUES.map((usdValue) => {
    const value = Math.round(usdValue * rate / 1000) * 1000 || Math.round(usdValue * rate);
    const fee = Math.round(value * PLATFORM_FEE);
    const cost = value + fee;
    return { value, fee, cost };
  });
}

// Get currency for country - USD fallback for unsupported
function getCurrencyForCountry(country: string): string {
  const supported = COUNTRY_CURRENCY[country];
  const paystackSupported = ['NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'RWF', 'XOF', 'XAF', 'EGP', 'USD'];
  if (supported && paystackSupported.includes(supported)) return supported;
  return 'USD'; // Fallback for unsupported countries
}

const PLATFORM_CUT = 0.20; // 20%

@Injectable()
export class TipsService {
  constructor(
    @InjectRepository(TipEntity)
    private readonly tipRepo: Repository<TipEntity>,
    @InjectRepository(ReportEntity)
    private readonly reportRepo: Repository<ReportEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly paystackService: PaystackService,
    private readonly koraPayService: KoraPayService,
    private readonly currencyService: CurrencyConversionService,
    private readonly earningsService: EarningsService,
    private readonly notifications: NotificationsService,
  ) {}

  // === BUY TIP PACK ===

  async buyPack(userId: string | null, dto: { packIndex: number; email: string; country: string }) {
    const currency = getCurrencyForCountry(dto.country);
    const packs = getPacksForCurrency(currency);
    if (dto.packIndex < 0 || dto.packIndex >= packs.length) {
      throw new BadRequestException('Invalid pack selection');
    }

    const pack = packs[dto.packIndex];
    const reference = this.paystackService.generateReference();

    const payment = await this.paystackService.initializePayment({
      email: dto.email,
      amount: pack.cost * 100, // kobo/pesewas
      currency,
      reference,
      metadata: { type: 'tip_pack', userId, packIndex: dto.packIndex, packValue: pack.value, packFee: pack.fee, currency },
    });

    return { paymentUrl: payment.data?.authorization_url, reference, pack };
  }

  async verifyPackPurchase(reference: string, userId?: string) {
    const verification = await this.paystackService.verifyPayment(reference);
    if (verification.data?.status !== 'success') {
      return { status: 'failed' };
    }

    const metadata = verification.data?.metadata;
    if (!metadata || metadata.type !== 'tip_pack') {
      return { status: 'failed', message: 'Not a tip pack payment' };
    }

    const targetUserId = userId || metadata.userId;
    if (!targetUserId) return { status: 'failed', message: 'No user to credit' };

    // Credit balance
    const currency = metadata.currency || 'NGN';
    await this.userRepo
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        tipBalance: () => `tip_balance + ${metadata.packValue}`,
        tipCurrency: currency,
      })
      .where('id = :id', { id: targetUserId })
      .execute();

    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    return { status: 'success', newBalance: user?.tipBalance || 0, currency };
  }

  // === SEND TIP ===

  async sendTip(tipperId: string, dto: { reportId: string; amount: number; message?: string }) {
    const report = await this.reportRepo.findOne({ where: { id: dto.reportId } });
    if (!report) throw new NotFoundException('Report not found');

    // Self-tip prevention
    if (tipperId === report.authorId) {
      throw new ForbiddenException('Cannot tip your own report');
    }

    // Check tipper balance
    const tipper = await this.userRepo.findOne({ where: { id: tipperId } });
    if (!tipper) throw new NotFoundException('User not found');
    if (tipper.tipBalance < dto.amount) {
      throw new BadRequestException('Insufficient tip balance. Buy a tip pack first.');
    }

    // Get reporter for payout
    const reporter = await this.userRepo.findOne({ where: { id: report.authorId } });
    if (!reporter) throw new NotFoundException('Reporter not found');

    const tipperCurrency = tipper.tipCurrency || getCurrencyForCountry(tipper.country);

    // Reporter MUST have bank details to receive tips
    if (!reporter.bankAccountNumber || !reporter.bankCode) {
      // Still deduct from tipper but hold tip until reporter adds bank
      const tip = this.tipRepo.create({
        reportId: dto.reportId,
        reporterId: report.authorId,
        tipperId,
        amount: dto.amount,
        currency: tipperCurrency,
        message: dto.message,
        status: 'pending_bank',
        paymentReference: `TIP_${Date.now()}`,
      });
      await this.tipRepo.save(tip);

      await this.notifications.sendToUser(report.authorId, {
        title: '💰 Tip pending — add bank details!',
        body: `You received a tip but need to add your bank details to get paid.`,
        data: { type: 'tip_pending', reportId: dto.reportId },
      });

      return { status: 'pending_bank', message: 'Tip sent! Reporter needs to add bank details to receive it.', remainingBalance: tipper.tipBalance - dto.amount };
    }

    const reporterCurrency = getCurrencyForCountry(reporter.country);
    const isCrossCurrency = tipperCurrency !== reporterCurrency;

    // Check if cross-currency is supported
    if (isCrossCurrency && !this.currencyService.isSupported(tipperCurrency, reporterCurrency)) {
      throw new BadRequestException('Cross-country tipping is not yet available for this region. Coming soon!');
    }

    const reporterAmount = Math.round(dto.amount * (1 - PLATFORM_CUT));

    // Convert to reporter's currency if needed
    let payoutAmount = reporterAmount;
    let payoutCurrency = tipperCurrency;
    let conversionRate = 1;

    if (isCrossCurrency) {
      const conversion = await this.currencyService.convert(reporterAmount, tipperCurrency, reporterCurrency);
      payoutAmount = conversion.convertedAmount;
      payoutCurrency = reporterCurrency;
      conversionRate = conversion.rate;
    }

    // Deduct from tipper balance
    await this.userRepo
      .createQueryBuilder()
      .update(UserEntity)
      .set({ tipBalance: () => `tip_balance - ${dto.amount}` })
      .where('id = :id AND tip_balance >= :amount', { id: tipperId, amount: dto.amount })
      .execute();

    // Create tip record
    const tip = this.tipRepo.create({
      reportId: dto.reportId,
      reporterId: report.authorId,
      tipperId,
      amount: dto.amount,
      currency: tipperCurrency,
      message: dto.message,
      status: 'success',
      paymentReference: `TIP_${Date.now()}`,
    });
    await this.tipRepo.save(tip);

    // Pay reporter via KoraPay (bank details confirmed above)
    try {
      await this.koraPayService.initializeSplitPayment({
        amount: payoutAmount,
        currency: payoutCurrency,
        customerEmail: reporter.email,
        customerName: reporter.displayName,
        reference: this.koraPayService.generateReference(),
        reporterBankAccount: {
          bankCode: reporter.bankCode,
          accountNumber: reporter.bankAccountNumber,
          accountName: reporter.bankAccountName,
        },
        platformSplitPercent: 0,
        metadata: { tipId: tip.id, reporterId: reporter.id, crossCurrency: isCrossCurrency, conversionRate },
      });
    } catch {
      // If payout fails, earnings are still recorded
    }

    // Record earnings in reporter's currency
    await this.earningsService.recordEarning({
      reporterId: report.authorId,
      amount: payoutAmount,
      currency: payoutCurrency,
      source: 'tip',
      sourceId: tip.id,
      description: dto.message ? `Tip: "${dto.message}"` : `Tip received${isCrossCurrency ? ` (converted from ${tipperCurrency})` : ''}`,
      paymentReference: tip.paymentReference,
      payerName: tipper.displayName,
    });

    // Notify reporter
    await this.notifications.sendToUser(report.authorId, {
      title: '💰 You received a tip!',
      body: `${tipper.displayName} tipped ${payoutCurrency} ${payoutAmount} on your report${dto.message ? `: "${dto.message}"` : ''}`,
      data: { type: 'tip', reportId: dto.reportId },
    });

    return { status: 'success', tip, remainingBalance: tipper.tipBalance - dto.amount };
  }

  // === QUERIES ===

  async getBalance(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { balance: user.tipBalance, currency: user.tipCurrency || COUNTRY_CURRENCY[user.country] || 'NGN' };
  }

  async getReportTips(reportId: string) {
    const tips = await this.tipRepo.find({
      where: { reportId, status: 'success' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const total = tips.reduce((sum, t) => sum + Number(t.amount), 0);
    return { tips, total, count: tips.length };
  }

  async getReporterTipsReceived(reporterId: string, page = 1, limit = 20) {
    return this.tipRepo.find({
      where: { reporterId, status: 'success' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['report'],
    });
  }

  // === WEBHOOK ===

  async handleWebhook(event: string, data: any) {
    if (event === 'charge.success' && data.metadata?.type === 'tip_pack') {
      await this.verifyPackPurchase(data.reference, data.metadata.userId);
    }
  }
}
