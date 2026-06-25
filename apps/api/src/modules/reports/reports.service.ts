import { Injectable, BadRequestException, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ReportEntity } from '../../database/entities';
import { CreateReportDto } from './dto/create-report.dto';
import { ModerationService } from '../moderation/moderation.service';
import { TrustService } from '../trust/trust.service';
import { FollowsService } from '../follows/follows.service';
import { WatchlistService } from '../watchlist/watchlist.service';
import { ReferralService } from '../referral/referral.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportEntity)
    private readonly reportRepo: Repository<ReportEntity>,
    private readonly moderationService: ModerationService,
    private readonly trustService: TrustService,
    private readonly followsService: FollowsService,
    private readonly watchlistService: WatchlistService,
    private readonly referralService: ReferralService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  async create(authorId: string, country: string, dto: CreateReportDto): Promise<ReportEntity> {
    const isAnon = dto.isAnonymous === true;

    // Duplicate detection (skip for anonymous — no user link)
    if (!isAnon) {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      const duplicate = await this.reportRepo
        .createQueryBuilder('r')
        .where('r.authorId = :authorId', { authorId })
        .andWhere('r.title = :title', { title: dto.title })
        .andWhere('r.createdAt > :tenMinAgo', { tenMinAgo })
        .getOne();
      if (duplicate) {
        throw new BadRequestException('You already submitted a similar report. Please wait before posting again.');
      }
    }

    // AI moderation check
    const modResult = await this.moderationService.moderateReport(dto.title, dto.description, dto.category);

    if (!modResult.isApproved) {
      if (modResult.flags.includes('hate_speech')) {
        if (!isAnon) await this.trustService.addScore(authorId, 'report_flagged_fake');
        throw new BadRequestException('Report rejected: contains hate speech or incitement to violence');
      }
      if (modResult.flags.includes('spam')) {
        if (!isAnon) await this.trustService.addScore(authorId, 'report_flagged_spam');
        throw new BadRequestException('Report rejected: appears to be spam or irrelevant content');
      }
      if (modResult.flags.includes('dangerous_misinformation')) {
        throw new BadRequestException('Report rejected: contains dangerous misinformation');
      }
    }

    const report = this.reportRepo.create({
      ...dto,
      authorId: isAnon ? (null as any) : authorId,
      isAnonymous: isAnon,
      country,
      severity: dto.severity || 'medium',
      media: dto.media || [],
      verificationLevel: modResult.suggestedVerification || 'unverified',
      aiHeadline: modResult.aiHeadline || undefined,
      aiModerationScore: modResult.confidence ? Math.round(modResult.confidence * 100) : undefined,
      aiFlags: modResult.flags?.length > 0 ? modResult.flags.join(',') : undefined,
    } as any);

    const saved = await this.reportRepo.save(report);

    // Only link activity to user for non-anonymous reports
    if (!isAnon) {
      await this.trustService.addScore(authorId, 'report_created');
      this.followsService.notifyFollowers(authorId, saved.title, saved.id).catch(() => {});
      this.watchlistService.matchAndNotify({
        id: saved.id,
        title: saved.title,
        category: saved.category,
        latitude: saved.latitude,
        longitude: saved.longitude,
        authorId,
      }).catch(() => {});
      this.referralService.checkAndRewardReferrer(authorId).catch(() => {});
    } else {
      // Anonymous: still notify watchlists (location-based) but without author link
      this.watchlistService.matchAndNotify({
        id: saved.id,
        title: saved.title,
        category: saved.category,
        latitude: saved.latitude,
        longitude: saved.longitude,
        authorId: null as any,
      }).catch(() => {});
    }

    await this.invalidateFeedCache(country);
    return saved;
  }

  async findById(id: string): Promise<ReportEntity | null> {
    const cacheKey = `report:${id}`;
    if (this.cache) {
      const cached = await this.cache.get<ReportEntity>(cacheKey);
      if (cached) return cached;
    }

    const report = await this.reportRepo.findOne({ where: { id }, relations: ['author'] });

    // Strip author data for anonymous reports
    if (report?.isAnonymous) {
      report.author = null as any;
      report.authorId = null;
    }

    if (this.cache && report) {
      await this.cache.set(cacheKey, report, 30000);
    }

    return report;
  }

  async getFeed(country: string, page = 1, limit = 20, lat?: number, lng?: number, sort?: string) {
    const cacheKey = `feed:${country}:${page}:${limit}:${sort || 'smart'}`;
    if (this.cache && !lat) {
      const cached = await this.cache.get<{ data: ReportEntity[]; meta: any }>(cacheKey);
      if (cached) return cached;
    }

    // Check if circuit breaker (event mode) is active
    const eventMode = this.cache ? await this.cache.get<string>('event_mode') : null;

    if (sort === 'latest') {
      const [data, total] = await this.reportRepo.findAndCount({
        where: { country },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
        relations: ['author'],
      });

      const result = { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
      if (this.cache) await this.cache.set(cacheKey, result, 60000);
      return result;
    }

    // Smart feed — use raw query to avoid DISTINCT/ORDER BY conflict
    // Circuit breaker: when event_mode is active, boost verified x5, demote unverified
    const verifiedBoost = eventMode ? 5.0 : 1.0;
    const unverifiedPenalty = eventMode ? -100 : 0;

    let scoreExpr = `
      (r.upvotes * 3) +
      (r.comment_count * 2) +
      (r.view_count * 0.1) -
      (r.downvotes * 2) +
      (COALESCE(a.trust_score, 0) * 0.5) +
      (CASE WHEN a.subscription_tier IN ('pro','elite','legend') THEN 30 ELSE 0 END) +
      (CASE r.verification_level
        WHEN 'officially_verified' THEN ${50 * verifiedBoost}
        WHEN 'ai_verified' THEN ${30 * verifiedBoost}
        WHEN 'community_verified' THEN ${20 * verifiedBoost}
        WHEN 'trusted_reporter_verified' THEN ${25 * verifiedBoost}
        ELSE ${unverifiedPenalty}
      END) +
      (CASE r.severity
        WHEN 'critical' THEN 40
        WHEN 'high' THEN 20
        WHEN 'medium' THEN 5
        ELSE 0
      END) +
      (CASE WHEN r.is_breaking = true AND r.created_at > NOW() - INTERVAL '6 hours' THEN 50 ELSE 0 END) -
      (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600 * 0.5)
    `;

    if (lat && lng) {
      const radiusDegrees = 10 / 111;
      scoreExpr += ` + (CASE WHEN r.latitude BETWEEN ${lat - radiusDegrees} AND ${lat + radiusDegrees}
        AND r.longitude BETWEEN ${lng - radiusDegrees} AND ${lng + radiusDegrees}
      THEN 30 ELSE 0 END)`;
    }

    // Get total count
    const countResult = await this.reportRepo
      .createQueryBuilder('r')
      .where('r.country = :country', { country })
      .getCount();

    // Get scored IDs
    const scoredIds = await this.reportRepo.query(`
      SELECT r.id FROM reports r
      LEFT JOIN users a ON a.id = r.author_id
      WHERE r.country = $1
      ORDER BY (${scoreExpr}) DESC
      LIMIT $2 OFFSET $3
    `, [country, limit, (page - 1) * limit]);

    const ids = scoredIds.map((row: any) => row.id);

    let data: ReportEntity[] = [];
    if (ids.length > 0) {
      data = await this.reportRepo
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.author', 'author')
        .whereInIds(ids)
        .getMany();

      // Preserve score order
      data.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    }

    const result = {
      data,
      meta: { page, limit, total: countResult, totalPages: Math.ceil(countResult / limit) },
    };

    if (this.cache && !lat) {
      await this.cache.set(cacheKey, result, 60000);
    }

    return result;
  }

  async getNearby(latitude: number, longitude: number, radiusKm = 10, page = 1, limit = 20) {
    const cacheKey = `nearby:${latitude.toFixed(2)}:${longitude.toFixed(2)}:${radiusKm}:${page}`;
    if (this.cache) {
      const cached = await this.cache.get<{ data: ReportEntity[]; meta: any }>(cacheKey);
      if (cached) return cached;
    }

    const radiusDegrees = radiusKm / 111;
    const qb = this.reportRepo
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.author', 'author')
      .where('report.latitude BETWEEN :minLat AND :maxLat', {
        minLat: latitude - radiusDegrees,
        maxLat: latitude + radiusDegrees,
      })
      .andWhere('report.longitude BETWEEN :minLng AND :maxLng', {
        minLng: longitude - radiusDegrees,
        maxLng: longitude + radiusDegrees,
      })
      .orderBy('report.createdAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    const result = {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    if (this.cache) {
      await this.cache.set(cacheKey, result, 30000); // 30s cache for nearby
    }

    return result;
  }

  async getByCategory(country: string, category: string, page = 1, limit = 20) {
    const cacheKey = `category:${country}:${category}:${page}:${limit}`;
    if (this.cache) {
      const cached = await this.cache.get<{ data: ReportEntity[]; meta: any }>(cacheKey);
      if (cached) return cached;
    }

    const [data, total] = await this.reportRepo.findAndCount({
      where: { country, category },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });

    const result = {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    if (this.cache) {
      await this.cache.set(cacheKey, result, 60000);
    }

    return result;
  }

  async upvote(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) return null;

    await this.reportRepo.increment({ id }, 'upvotes', 1);
    if (report.authorId) await this.trustService.addScore(report.authorId, 'report_upvoted');
    await this.invalidateFeedCache(report.country);

    return this.findById(id);
  }

  async downvote(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) return null;

    await this.reportRepo.increment({ id }, 'downvotes', 1);
    if (report.authorId) await this.trustService.addScore(report.authorId, 'report_downvoted');

    return this.findById(id);
  }

  private async invalidateFeedCache(country: string) {
    if (!this.cache) return;
    // Invalidate first 5 pages of feed cache
    for (let p = 1; p <= 5; p++) {
      await this.cache.del(`feed:${country}:${p}:20`);
    }
  }
}
