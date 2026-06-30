import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObserverEntity } from '../../database/entities/observer.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { PaystackService } from '../donations/paystack.service';
import { KoraPayService } from '../payments/korapay.service';
import { EmailService } from '../email/email.service';

const TIER_CONFIG: Record<string, { price: number; seats: number }> = {
  individual: { price: 500, seats: 1 },
  organization: { price: 2000, seats: 5 },
  enterprise: { price: 10000, seats: 20 },
};

@Injectable()
export class ObserverService {
  constructor(
    @InjectRepository(ObserverEntity)
    private readonly observerRepo: Repository<ObserverEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly paystackService: PaystackService,
    private readonly koraPayService: KoraPayService,
    private readonly emailService: EmailService,
  ) {}

  async register(userId: string, dto: { orgName?: string; country: string; tier: string; accreditationUrl: string }) {
    const existing = await this.observerRepo.findOne({ where: { userId, country: dto.country } });
    if (existing) throw new BadRequestException('Already registered for this country');

    const tier = TIER_CONFIG[dto.tier] ? dto.tier : 'individual';
    const observer = this.observerRepo.create({
      userId,
      orgName: dto.orgName,
      country: dto.country,
      tier,
      accreditationUrl: dto.accreditationUrl,
      seats: TIER_CONFIG[tier].seats,
      status: 'observer_pending',
    });

    return this.observerRepo.save(observer);
  }

  async getMyProfile(userId: string) {
    const observers = await this.observerRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return observers;
  }

  async getMySubscription(userId: string, country: string) {
    const observer = await this.observerRepo.findOne({ where: { userId, country } });
    if (!observer) return null;

    // Check expiry
    if (observer.status === 'observer_active' && observer.expiresAt && new Date() > observer.expiresAt) {
      observer.status = 'observer_expired';
      await this.observerRepo.save(observer);
    }

    return observer;
  }

  async initPayment(userId: string, country: string, email: string) {
    const observer = await this.observerRepo.findOne({ where: { userId, country } });
    if (!observer) throw new BadRequestException('No registration found');
    if (observer.status !== 'observer_approved') throw new ForbiddenException('Not yet approved');

    const amount = TIER_CONFIG[observer.tier]?.price || 500;
    const reference = `obs_${observer.id}_${Date.now()}`;

    // Try Paystack first
    const paystackRes = await this.paystackService.initializePayment({
      email,
      amount: amount * 100,
      currency: 'USD',
      reference,
      metadata: { type: 'observer_subscription', observerId: observer.id, tier: observer.tier, country },
    });

    if (paystackRes.status && paystackRes.data?.authorization_url) {
      observer.paystackReference = reference;
      await this.observerRepo.save(observer);
      return { authorizationUrl: paystackRes.data.authorization_url, reference, provider: 'paystack' };
    }

    // Fallback to KoraPay
    const koraRes = await this.koraPayService.initializePayment({
      amount,
      currency: 'USD',
      email,
      reference,
      metadata: { type: 'observer_subscription', observerId: observer.id, tier: observer.tier, country },
    });

    if (koraRes.status && koraRes.data?.checkout_url) {
      observer.paystackReference = reference;
      await this.observerRepo.save(observer);
      return { authorizationUrl: koraRes.data.checkout_url, reference, provider: 'korapay' };
    }

    throw new BadRequestException('Payment initialization failed. Please try again later.');
  }

  async verifyPayment(reference: string) {
    // Try Paystack first
    const paystackRes = await this.paystackService.verifyPayment(reference);
    if (paystackRes.data?.status === 'success') {
      return this.activateAfterPayment(reference);
    }

    // Try KoraPay
    const koraRes = await this.koraPayService.verifyTransaction(reference);
    if (koraRes.status && koraRes.data?.status === 'success') {
      return this.activateAfterPayment(reference);
    }

    throw new BadRequestException('Payment not confirmed');
  }

  private async activateAfterPayment(reference: string) {
    const observer = await this.observerRepo.findOne({ where: { paystackReference: reference } });
    if (!observer) throw new BadRequestException('Observer not found');

    observer.status = 'observer_active';
    observer.paidAt = new Date();
    observer.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await this.observerRepo.save(observer);

    return observer;
  }

  async inviteSeat(ownerId: string, country: string, inviteeUserId: string) {
    const owner = await this.observerRepo.findOne({ where: { userId: ownerId, country, status: 'observer_active' } });
    if (!owner) throw new ForbiddenException('No active subscription');

    const usedSeats = await this.observerRepo.count({ where: { invitedBy: ownerId, country } });
    if (usedSeats + 1 >= owner.seats) throw new BadRequestException('All seats used');

    const seat = this.observerRepo.create({
      userId: inviteeUserId,
      country,
      tier: owner.tier,
      orgName: owner.orgName,
      status: 'observer_active',
      paidAt: owner.paidAt,
      expiresAt: owner.expiresAt,
      invitedBy: ownerId,
      seats: 0,
    });

    return this.observerRepo.save(seat);
  }

  async getSeats(ownerId: string, country: string) {
    return this.observerRepo.find({ where: { invitedBy: ownerId, country } });
  }

  // Admin methods
  async getPending() {
    return this.observerRepo.find({ where: { status: 'observer_pending' }, relations: ['user'], order: { createdAt: 'DESC' } });
  }

  async approve(observerId: string) {
    const observer = await this.observerRepo.findOne({ where: { id: observerId } });
    if (!observer) throw new BadRequestException('Not found');
    observer.status = 'observer_approved';
    await this.observerRepo.save(observer);

    // Send approval email
    const user = await this.userRepo.findOne({ where: { id: observer.userId } });
    if (user) this.emailService.sendObserverApproved(user.email, user.displayName, observer.tier, observer.country).catch(() => {});

    return observer;
  }

  async reject(observerId: string) {
    const observer = await this.observerRepo.findOne({ where: { id: observerId } });
    if (!observer) throw new BadRequestException('Not found');
    observer.status = 'observer_rejected';
    return this.observerRepo.save(observer);
  }

  async activate(observerId: string, tier?: string, days?: number) {
    const observer = await this.observerRepo.findOne({ where: { id: observerId } });
    if (!observer) throw new BadRequestException('Not found');
    if (tier) observer.tier = tier;
    observer.status = 'observer_active';
    observer.paidAt = new Date();
    observer.expiresAt = new Date(Date.now() + (days || 90) * 24 * 60 * 60 * 1000);
    if (tier && TIER_CONFIG[tier]) observer.seats = TIER_CONFIG[tier].seats;
    await this.observerRepo.save(observer);

    // Send activation email
    const user = await this.userRepo.findOne({ where: { id: observer.userId } });
    if (user) this.emailService.sendObserverActivated(user.email, user.displayName, observer.tier, days || 90, observer.expiresAt.toISOString()).catch(() => {});

    return observer;
  }

  async getAllActive() {
    return this.observerRepo.find({ where: { status: 'observer_active' }, relations: ['user'], order: { createdAt: 'DESC' } });
  }
}
