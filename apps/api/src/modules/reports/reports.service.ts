import { Injectable, BadRequestException, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ReportEntity } from '../../database/entities';
import { CreateReportDto } from './dto/create-report.dto';
import { ModerationService } from '../moderation/moderation.service';
import { TrustService } from '../trust/trust.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportEntity)
    private readonly reportRepo: Repository<ReportEntity>,
    private readonly moderationService: ModerationService,
    private readonly trustService: TrustService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  async create(authorId: string, country: string, dto: CreateReportDto): Promise<ReportEntity> {
    // AI moderation check
    const modResult = await this.moderationService.moderateReport(dto.title, dto.description, dto.category);

    if (!modResult.isApproved && modResult.flags.includes('hate_speech')) {
      throw new BadRequestException('Report rejected: violates community guidelines');
    }

    const report = this.reportRepo.create({
      ...dto,
      authorId,
      country,
      severity: dto.severity || 'medium',
      media: dto.media || [],
      verificationLevel: modResult.suggestedVerification || 'unverified',
    });

    const saved = await this.reportRepo.save(report);

    // Award trust points for creating a report
    await this.trustService.addScore(authorId, 'report_created');

    // If AI flagged as spam, deduct points
    if (modResult.flags.includes('spam')) {
      await this.trustService.addScore(authorId, 'report_flagged_spam');
    }

    // Invalidate feed cache for this country
    await this.invalidateFeedCache(country);

    return saved;
  }

  async findById(id: string): Promise<ReportEntity | null> {
    return this.reportRepo.findOne({ where: { id }, relations: ['author'] });
  }

  async getFeed(country: string, page = 1, limit = 20, lat?: number, lng?: number) {
    const cacheKey = `feed:${country}:${page}:${limit}`;
    if (this.cache && !lat) {
      const cached = await this.cache.get<{ data: ReportEntity[]; meta: any }>(cacheKey);
      if (cached) return cached;
    }

    // Advanced feed algorithm with scoring
    const qb = this.reportRepo
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.author', 'author')
      .where('report.country = :country', { country })
      .addSelect(`(
        (report.upvotes * 3) +
        (report."comment_count" * 2) +
        (report."view_count" * 0.1) -
        (report.downvotes * 2) +
        (COALESCE(author."trustScore", 0) * 0.5) +
        (CASE report."verification_level"
          WHEN 'officially_verified' THEN 50
          WHEN 'ai_verified' THEN 30
          WHEN 'community_verified' THEN 20
          WHEN 'trusted_reporter_verified' THEN 25
          ELSE 0
        END) +
        (CASE report.severity
          WHEN 'critical' THEN 40
          WHEN 'high' THEN 20
          WHEN 'medium' THEN 5
          ELSE 0
        END) -
        (EXTRACT(EPOCH FROM (NOW() - report."created_at")) / 3600 * 2)
      )`, 'feed_score')
      .orderBy('feed_score', 'DESC');

    // Geographic boost
    if (lat && lng) {
      const radiusDegrees = 10 / 111;
      qb.addSelect(`(
        CASE WHEN report.latitude BETWEEN ${lat - radiusDegrees} AND ${lat + radiusDegrees}
          AND report.longitude BETWEEN ${lng - radiusDegrees} AND ${lng + radiusDegrees}
        THEN 30 ELSE 0 END
      )`, 'geo_bonus');
      qb.orderBy('feed_score + geo_bonus', 'DESC');
    }

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    const result = {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
    const [data, total] = await this.reportRepo.findAndCount({
      where: { country, category },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author'],
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async upvote(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) return null;

    await this.reportRepo.increment({ id }, 'upvotes', 1);
    await this.trustService.addScore(report.authorId, 'report_upvoted');
    await this.invalidateFeedCache(report.country);

    return this.findById(id);
  }

  async downvote(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) return null;

    await this.reportRepo.increment({ id }, 'downvotes', 1);
    await this.trustService.addScore(report.authorId, 'report_downvoted');

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
