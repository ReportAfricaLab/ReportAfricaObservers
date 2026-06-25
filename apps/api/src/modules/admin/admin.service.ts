import { Injectable, NotFoundException, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserEntity, ReportEntity, CampaignEntity, MediaLicenseEntity, EarningsEntity, BusinessEntity, LivestreamEntity, ElectionReportEntity, TipEntity } from '../../database/entities';
import { ChallengeEntity } from '../../database/entities/challenge.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ChallengesService } from '../challenges/challenges.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ReportEntity) private readonly reportRepo: Repository<ReportEntity>,
    @InjectRepository(CampaignEntity) private readonly campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(MediaLicenseEntity) private readonly licenseRepo: Repository<MediaLicenseEntity>,
    @InjectRepository(EarningsEntity) private readonly earningsRepo: Repository<EarningsEntity>,
    @InjectRepository(BusinessEntity) private readonly businessRepo: Repository<BusinessEntity>,
    @InjectRepository(LivestreamEntity) private readonly streamRepo: Repository<LivestreamEntity>,
    @InjectRepository(ElectionReportEntity) private readonly electionRepo: Repository<ElectionReportEntity>,
    @InjectRepository(TipEntity) private readonly tipRepo: Repository<TipEntity>,
    @InjectRepository(ChallengeEntity) private readonly challengeRepo: Repository<ChallengeEntity>,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly challengesService?: ChallengesService,
  ) {}

  // === USERS ===
  async getUsers(page = 1, limit = 20, search?: string, role?: string, country?: string) {
    const where: any = {};
    if (search) where.username = Like(`%${search}%`);
    if (role) where.role = role;
    if (country) where.country = country;

    const [users, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateUser(id: string, data: { role?: string; isVerified?: boolean; trustLevel?: string }) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, data);
    return this.userRepo.save(user);
  }

  async banUser(id: string) {
    return this.updateUser(id, { role: 'banned' as any });
  }

  // === REPORTS ===
  async getReports(page = 1, limit = 20, country?: string, category?: string, flagged?: boolean) {
    const query = this.reportRepo.createQueryBuilder('report')
      .leftJoinAndSelect('report.author', 'author')
      .orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (country) query.andWhere('report.country = :country', { country });
    if (category) query.andWhere('report.category = :category', { category });
    if (flagged) query.andWhere('report.verificationLevel = :level', { level: 'unverified' });

    const [reports, total] = await query.getManyAndCount();
    return { reports, total, page, totalPages: Math.ceil(total / limit) };
  }

  async deleteReport(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    await this.reportRepo.remove(report);
    return { deleted: true };
  }

  async updateReportVerification(id: string, level: string) {
    await this.reportRepo.update(id, { verificationLevel: level });
    return this.reportRepo.findOne({ where: { id } });
  }

  // === CAMPAIGNS ===
  async getCampaigns(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status) where.verificationLevel = status;

    const [campaigns, total] = await this.campaignRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });
    return { campaigns, total, page, totalPages: Math.ceil(total / limit) };
  }

  async approveCampaign(id: string) {
    await this.campaignRepo.update(id, { verificationLevel: 'ngo_verified', isActive: true });
    return this.campaignRepo.findOne({ where: { id } });
  }

  async rejectCampaign(id: string) {
    await this.campaignRepo.update(id, { verificationLevel: 'rejected', isActive: false });
    return this.campaignRepo.findOne({ where: { id } });
  }

  // === REVENUE ===
  async getRevenue() {
    const totalLicenseRevenue = await this.earningsRepo
      .createQueryBuilder('e')
      .select('e.currency', 'currency')
      .addSelect('SUM(e.amount)', 'reporterTotal')
      .where('e.source = :source', { source: 'media_license' })
      .groupBy('e.currency')
      .getRawMany();

    const totalLicenses = await this.licenseRepo.count({ where: { status: 'approved' } });
    const pendingLicenses = await this.licenseRepo.count({ where: { status: 'pending' } });

    return {
      platformRevenue: totalLicenseRevenue.map((r) => ({
        currency: r.currency,
        platformEarned: Number(r.reporterTotal), // platform gets same as reporter (50/50)
        reportersPaid: Number(r.reporterTotal),
      })),
      totalLicenses,
      pendingLicenses,
    };
  }

  // === MODERATION QUEUE ===
  async getModerationQueue(page = 1, limit = 20) {
    const [reports, total] = await this.reportRepo.findAndCount({
      where: { verificationLevel: 'unverified' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });
    return { reports, total, page, totalPages: Math.ceil(total / limit) };
  }

  // === OVERVIEW ===
  async getOverview() {
    const [totalUsers, totalReports, totalCampaigns, pendingCampaigns, totalBusinesses, activeChallenges, liveStreams] = await Promise.all([
      this.userRepo.count(),
      this.reportRepo.count(),
      this.campaignRepo.count(),
      this.campaignRepo.count({ where: { verificationLevel: 'pending_review' } }),
      this.businessRepo.count(),
      this.challengeRepo.count({ where: { status: 'active' } }),
      this.streamRepo.count({ where: { status: 'live' } }),
    ]);

    return { totalUsers, totalReports, totalCampaigns, pendingCampaigns, totalBusinesses, activeChallenges, liveStreams };
  }

  // === CIRCUIT BREAKER ===
  async toggleEventMode(active: boolean) {
    if (!this.cache) return { eventMode: false };
    if (active) {
      await this.cache.set('event_mode', 'active', 86400000); // 24h TTL
    } else {
      await this.cache.del('event_mode');
    }
    return { eventMode: active };
  }

  async getEventMode() {
    if (!this.cache) return { eventMode: false };
    const mode = await this.cache.get<string>('event_mode');
    return { eventMode: !!mode };
  }

  async sendSecurityAlert(country: string, message?: string) {
    if (!this.notifications) return { sent: false };
    await this.notifications.sendToCountry(country, {
      title: '🚨 Security Alert',
      body: message || 'For your safety, clear your local app data immediately. Go to Profile → Clear My Data.',
      data: { type: 'security_alert', action: 'clear_data' },
    });
    return { sent: true, country };
  }

  // === BUSINESSES ===
  async getBusinesses(page = 1, limit = 20, search?: string) {
    const qb = this.businessRepo.createQueryBuilder('b').orderBy('b.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    if (search) qb.where('b.name ILIKE :search', { search: `%${search}%` });
    const [businesses, total] = await qb.getManyAndCount();
    return { businesses, total };
  }

  async updateBusiness(id: string, data: any) {
    await this.businessRepo.update(id, data);
    return this.businessRepo.findOne({ where: { id } });
  }

  // === CHALLENGES ===
  async getChallenges() {
    const challenges = await this.challengeRepo.find({ order: { createdAt: 'DESC' }, take: 50 });
    return { challenges };
  }

  async forceCloseChallenge(id: string) {
    const challenge = await this.challengeRepo.findOne({ where: { id } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (this.challengesService) await this.challengesService.closeAndPayout(challenge);
    return { closed: true };
  }

  // === LIVESTREAMS ===
  async getLivestreams() {
    const streams = await this.streamRepo.find({ order: { createdAt: 'DESC' }, take: 50, relations: ['user'] });
    return { streams };
  }

  async forceEndStream(id: string) {
    await this.streamRepo.update(id, { status: 'ended', endedAt: new Date() });
    return { ended: true };
  }

  // === ELECTIONS ===
  async getElections() {
    const reports = await this.electionRepo.find({ order: { createdAt: 'DESC' }, take: 50, relations: ['user'] });
    return { reports };
  }

  async verifyObserver(id: string) {
    await this.electionRepo.update(id, { isVerifiedObserver: true });
    return { verified: true };
  }

  // === NOTIFICATIONS ===
  async sendNotification(data: { target: string; country?: string; username?: string; title: string; body: string }) {
    if (!this.notifications) return { sent: false };
    const payload = { title: data.title, body: data.body, data: { type: 'admin_broadcast' } };

    if (data.target === 'all') {
      const users = await this.userRepo.find({ select: ['fcmToken'] });
      // Send in batches via country
      const countries = [...new Set((await this.userRepo.createQueryBuilder('u').select('DISTINCT u.country', 'country').getRawMany()).map((r: any) => r.country))];
      for (const c of countries) await this.notifications.sendToCountry(c, payload);
    } else if (data.target === 'country' && data.country) {
      await this.notifications.sendToCountry(data.country, payload);
    } else if (data.target === 'businesses') {
      const businesses = await this.businessRepo.find({ where: { isActive: true }, select: ['ownerId'] });
      for (const b of businesses) await this.notifications.sendToUser(b.ownerId, payload);
    } else if (data.target === 'user' && data.username) {
      const user = await this.userRepo.findOne({ where: { username: data.username } });
      if (user) await this.notifications.sendToUser(user.id, payload);
    }
    return { sent: true, target: data.target };
  }

  // === TIPS ===
  async getTips() {
    const tips = await this.tipRepo.find({ order: { createdAt: 'DESC' }, take: 50, relations: ['sender', 'receiver'] });
    const totalTips = await this.tipRepo.count();
    const totalAmountResult = await this.tipRepo.createQueryBuilder('t').select('SUM(t.amount)', 'total').getRawOne();
    return { tips, stats: { totalTips, totalAmount: Number(totalAmountResult?.total) || 0, platformRevenue: Math.round((Number(totalAmountResult?.total) || 0) * 0.1) } };
  }

  // === TEAM MANAGEMENT ===
  private static ADMIN_ROLES = ['super_admin', 'admin', 'content_manager', 'finance_admin', 'support_admin'];
  private static CAN_INVITE = ['super_admin', 'admin'];

  async getTeam() {
    const team = await this.userRepo.find({
      where: { role: In(AdminService.ADMIN_ROLES) },
      select: ['id', 'email', 'username', 'displayName', 'role', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
    return { team };
  }

  async inviteAdmin(currentAdmin: any, email: string, role: string) {
    if (!AdminService.CAN_INVITE.includes(currentAdmin.role)) {
      throw new NotFoundException('You do not have permission to invite admins');
    }
    if (!AdminService.ADMIN_ROLES.includes(role)) {
      throw new NotFoundException('Invalid role');
    }
    if (role === 'super_admin' && currentAdmin.role !== 'super_admin') {
      throw new NotFoundException('Only super_admin can assign super_admin role');
    }

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found. They must register on ReportAfrica first.');
    user.role = role;
    await this.userRepo.save(user);
    return { invited: true, email, role };
  }

  async changeRole(currentAdmin: any, userId: string, newRole: string) {
    if (!AdminService.CAN_INVITE.includes(currentAdmin.role)) {
      throw new NotFoundException('You do not have permission to change roles');
    }
    if (!AdminService.ADMIN_ROLES.includes(newRole)) {
      throw new NotFoundException('Invalid role');
    }
    if (newRole === 'super_admin' && currentAdmin.role !== 'super_admin') {
      throw new NotFoundException('Only super_admin can assign super_admin role');
    }
    if (userId === currentAdmin.id) {
      throw new NotFoundException('Cannot change your own role');
    }

    await this.userRepo.update(userId, { role: newRole });
    return { updated: true, userId, role: newRole };
  }

  async revokeAccess(currentAdmin: any, userId: string) {
    if (!AdminService.CAN_INVITE.includes(currentAdmin.role)) {
      throw new NotFoundException('You do not have permission to revoke access');
    }
    if (userId === currentAdmin.id) {
      throw new NotFoundException('Cannot revoke your own access');
    }
    const target = await this.userRepo.findOne({ where: { id: userId } });
    if (target?.role === 'super_admin' && currentAdmin.role !== 'super_admin') {
      throw new NotFoundException('Cannot revoke super_admin access');
    }

    await this.userRepo.update(userId, { role: 'citizen' });
    return { revoked: true, userId };
  }
}
