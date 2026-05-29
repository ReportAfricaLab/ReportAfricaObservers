import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralEntity, UserEntity } from '../../database/entities';
import { TrustService } from '../trust/trust.service';
import { NotificationsService } from '../notifications/notifications.service';

const REFERRAL_REWARD_POINTS = 25; // Trust points for referrer when referee posts first report

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(ReferralEntity)
    private readonly referralRepo: Repository<ReferralEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly trustService: TrustService,
    private readonly notifications: NotificationsService,
  ) {}

  generateCode(userId: string): string {
    // Short, shareable code: first 4 chars of userId + random 4
    const prefix = userId.replace(/-/g, '').substring(0, 4).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RA-${prefix}${suffix}`;
  }

  async getOrCreateCode(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Check if user already has a referral as referrer (use their first code)
    const existing = await this.referralRepo.findOne({ where: { referrerId: userId } });
    if (existing) return existing.referralCode;

    // Generate and return (will be stored when someone uses it)
    return this.generateCode(userId);
  }

  async applyReferralCode(refereeId: string, code: string) {
    // Find who owns this code
    const existingReferral = await this.referralRepo.findOne({ where: { referralCode: code } });

    let referrerId: string;
    if (existingReferral) {
      referrerId = existingReferral.referrerId;
    } else {
      // Code format: RA-XXXX1234 — we can't reverse-lookup, so store as pending
      throw new BadRequestException('Invalid referral code');
    }

    if (referrerId === refereeId) throw new BadRequestException('Cannot refer yourself');

    // Check if referee already has a referral
    const alreadyReferred = await this.referralRepo.findOne({ where: { refereeId } });
    if (alreadyReferred) throw new BadRequestException('Already used a referral code');

    const referral = this.referralRepo.create({
      referrerId,
      refereeId,
      referralCode: code,
      rewardPaid: false,
    });
    return this.referralRepo.save(referral);
  }

  async registerWithReferral(refereeId: string, code: string) {
    // Find any referral with this code to get the referrer
    const anyWithCode = await this.referralRepo.findOne({ where: { referralCode: code } });

    if (!anyWithCode) {
      // First use of this code — we need to find the referrer by code pattern
      // Store a self-referral placeholder so future lookups work
      throw new BadRequestException('Invalid referral code');
    }

    const referrerId = anyWithCode.referrerId;
    if (referrerId === refereeId) throw new BadRequestException('Cannot refer yourself');

    const existing = await this.referralRepo.findOne({ where: { refereeId } });
    if (existing) return existing;

    const referral = this.referralRepo.create({
      referrerId,
      refereeId,
      referralCode: code,
      rewardPaid: false,
    });
    return this.referralRepo.save(referral);
  }

  // Called when a referred user creates their first report
  async checkAndRewardReferrer(refereeId: string) {
    const referral = await this.referralRepo.findOne({
      where: { refereeId, rewardPaid: false },
    });
    if (!referral) return;

    // Award trust points to referrer
    for (let i = 0; i < 5; i++) {
      await this.trustService.addScore(referral.referrerId, 'report_created'); // 5 * 5 = 25 points
    }

    referral.rewardPaid = true;
    await this.referralRepo.save(referral);

    // Notify referrer
    await this.notifications.sendToUser(referral.referrerId, {
      title: '🎉 Referral reward!',
      body: 'Someone you referred just posted their first report. You earned 25 trust points!',
      data: { type: 'referral_reward' },
    });
  }

  async getMyReferrals(userId: string) {
    const referrals = await this.referralRepo.find({
      where: { referrerId: userId },
      order: { createdAt: 'DESC' },
      relations: ['referee'],
    });

    return {
      code: referrals.length > 0 ? referrals[0].referralCode : this.generateCode(userId),
      totalReferred: referrals.length,
      rewardsPaid: referrals.filter((r) => r.rewardPaid).length,
      referrals: referrals.map((r) => ({
        refereeUsername: r.referee?.username,
        rewardPaid: r.rewardPaid,
        createdAt: r.createdAt,
      })),
    };
  }

  // Seed a referral code for a user (called on registration or on demand)
  async seedCode(userId: string) {
    const code = this.generateCode(userId);
    const placeholder = this.referralRepo.create({
      referrerId: userId,
      refereeId: userId, // self-reference as placeholder
      referralCode: code,
      rewardPaid: true, // not a real referral
    });
    await this.referralRepo.save(placeholder);
    return code;
  }
}
