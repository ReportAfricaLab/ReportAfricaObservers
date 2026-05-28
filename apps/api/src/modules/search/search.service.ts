import { Injectable, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ReportEntity, UserEntity } from '../../database/entities';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(ReportEntity) private readonly reportRepo: Repository<ReportEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  async searchReports(query: string, country?: string, category?: string, page = 1, limit = 20) {
    const tsQuery = this.toTsQuery(query);

    const qb = this.reportRepo.createQueryBuilder('report')
      .leftJoinAndSelect('report.author', 'author');

    if (tsQuery) {
      // Use PostgreSQL full-text search with ranking
      qb.addSelect(`ts_rank(to_tsvector('english', report.title || ' ' || report.description), to_tsquery('english', :tsQuery))`, 'rank')
        .where(`to_tsvector('english', report.title || ' ' || report.description) @@ to_tsquery('english', :tsQuery)`, { tsQuery })
        .orderBy('rank', 'DESC');
    } else {
      // Fallback to ILIKE for short queries
      qb.where('(report.title ILIKE :q OR report.description ILIKE :q)', { q: `%${query}%` })
        .orderBy('report.createdAt', 'DESC');
    }

    if (country) qb.andWhere('report.country = :country', { country });
    if (category) qb.andWhere('report.category = :category', { category });

    const [results, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { results, total, page, totalPages: Math.ceil(total / limit) };
  }

  async searchUsers(query: string, page = 1, limit = 20) {
    const qb = this.userRepo.createQueryBuilder('user')
      .where('(user.username ILIKE :q OR user.displayName ILIKE :q)', { q: `%${query}%` })
      .orderBy('user.trustScore', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [results, total] = await qb.getManyAndCount();
    return { results, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getTrending(country: string, hours = 24) {
    const cacheKey = `trending:${country}:${hours}`;
    if (this.cache) {
      const cached = await this.cache.get<ReportEntity[]>(cacheKey);
      if (cached) return cached;
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const results = await this.reportRepo
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.author', 'author')
      .where('report.country = :country', { country })
      .andWhere('report.createdAt > :since', { since })
      .orderBy('report.upvotes + report.commentCount + report.viewCount', 'DESC')
      .take(20)
      .getMany();

    if (this.cache) {
      await this.cache.set(cacheKey, results, 120000); // 2 min cache
    }

    return results;
  }

  async getSuggestions(query: string, country?: string) {
    const reports = await this.reportRepo
      .createQueryBuilder('report')
      .select('report.title')
      .where('report.title ILIKE :q', { q: `%${query}%` })
      .andWhere(country ? 'report.country = :country' : '1=1', { country })
      .orderBy('report.createdAt', 'DESC')
      .take(5)
      .getMany();

    return reports.map((r) => r.title);
  }

  private toTsQuery(query: string): string {
    // Convert user query to PostgreSQL tsquery format
    const words = query.trim().split(/\s+/).filter((w) => w.length > 1);
    if (words.length === 0) return '';
    return words.map((w) => `${w}:*`).join(' & ');
  }
}
