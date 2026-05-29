import { Injectable, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserEntity, ReportEntity } from '../../database/entities';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ReportEntity)
    private readonly reportRepo: Repository<ReportEntity>,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  async getTopReporters(country: string, period: 'week' | 'month' | 'all' = 'week', limit = 20) {
    const cacheKey = `leaderboard:${country}:${period}:${limit}`;
    if (this.cache) {
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const since = this.getPeriodStart(period);

    const qb = this.reportRepo
      .createQueryBuilder('r')
      .select('r.author_id', 'userId')
      .addSelect('COUNT(*)', 'reportCount')
      .addSelect('SUM(r.upvotes)', 'totalUpvotes')
      .addSelect('SUM(r.view_count)', 'totalViews')
      .addSelect('SUM(r.upvotes * 3 + r.comment_count * 2 + r.view_count * 0.1)', 'score')
      .where('r.country = :country', { country });

    if (since) {
      qb.andWhere('r.created_at > :since', { since });
    }

    const rankings = await qb
      .groupBy('r.author_id')
      .orderBy('score', 'DESC')
      .limit(limit)
      .getRawMany();

    // Enrich with user data
    const userIds = rankings.map((r) => r.userId);
    const users = userIds.length > 0
      ? await this.userRepo.findByIds(userIds)
      : [];

    const userMap = new Map(users.map((u: UserEntity) => [u.id, u]));

    const result = rankings.map((r: any, index: number) => {
      const user = userMap.get(r.userId);
      return {
        rank: index + 1,
        userId: r.userId,
        username: user?.username,
        displayName: user?.displayName,
        avatar: user?.avatar,
        trustLevel: user?.trustLevel,
        reportCount: Number(r.reportCount),
        totalUpvotes: Number(r.totalUpvotes || 0),
        totalViews: Number(r.totalViews || 0),
        score: Math.round(Number(r.score || 0)),
      };
    });

    if (this.cache) {
      await this.cache.set(cacheKey, result, 300000); // 5 min cache
    }

    return result;
  }

  async getMyRank(userId: string, country: string, period: 'week' | 'month' | 'all' = 'week') {
    const leaderboard = await this.getTopReporters(country, period, 100);
    const entry = leaderboard.find((e: any) => e.userId === userId);
    return entry || { rank: null, message: 'Not ranked in top 100' };
  }

  private getPeriodStart(period: 'week' | 'month' | 'all'): Date | null {
    const now = new Date();
    if (period === 'week') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return null;
  }
}
