import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionReportEntity } from '../../database/entities';
import * as crypto from 'crypto';

const OVER_VOTING_THRESHOLD = 500;

@Injectable()
export class ElectionService {
  constructor(
    @InjectRepository(ElectionReportEntity)
    private readonly electionRepo: Repository<ElectionReportEntity>,
  ) {}

  async submitReport(userId: string, country: string, dto: {
    type: string;
    electionName: string;
    pollingUnit?: string;
    state?: string;
    lga?: string;
    ward?: string;
    description?: string;
    results?: Record<string, number>;
    media?: { type: string; url: string }[];
    latitude?: number;
    longitude?: number;
    recordedAt?: string;
  }) {
    // Generate result hash for result_upload type
    let resultHash: string | undefined;
    let overVotingFlag = false;
    let prevHash: string | undefined;

    if (dto.type === 'result_upload' && dto.results) {
      // Result chain hash
      const hashInput = `${dto.pollingUnit || ''}|${dto.electionName}|${JSON.stringify(dto.results)}|${Date.now()}`;
      resultHash = crypto.createHash('sha256').update(hashInput).digest('hex');

      // Over-voting detection
      const totalVotes = Object.values(dto.results).reduce((sum, v) => sum + v, 0);
      if (totalVotes > OVER_VOTING_THRESHOLD) overVotingFlag = true;

      // Hash chain - get previous report hash
      const lastReport = await this.electionRepo.findOne({
        where: { country, electionName: dto.electionName, type: 'result_upload' },
        order: { createdAt: 'DESC' },
        select: ['resultHash'],
      });
      prevHash = lastReport?.resultHash || 'genesis';
    }

    const report = this.electionRepo.create({
      ...dto,
      userId,
      country,
      results: dto.results || {},
      media: dto.media || [],
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
      resultHash,
      overVotingFlag,
      prevHash,
    } as any);

    const saved = await this.electionRepo.save(report) as ElectionReportEntity;

    // Multi-source verification - check if other results exist for same PU
    if (dto.type === 'result_upload' && dto.pollingUnit) {
      await this.verifyMultiSource(saved.id, dto.pollingUnit, dto.electionName, dto.results || {});
    }

    return saved;
  }

  private async verifyMultiSource(currentId: string, pollingUnit: string, electionName: string, currentResults: Record<string, number>) {
    const others = await this.electionRepo.find({
      where: { pollingUnit, electionName, type: 'result_upload' },
    });

    if (others.length < 2) return; // Need at least 2 to verify

    // Check if results match
    const matching = others.filter(o => {
      if (o.id === currentId) return true;
      const oResults = o.results || {};
      return JSON.stringify(oResults) === JSON.stringify(currentResults);
    });

    if (matching.length >= 2) {
      // Results match - mark all as citizen_verified
      const ids = matching.map(m => m.id);
      await this.electionRepo.update(ids, { verificationStatus: 'citizen_verified' } as any);
    } else if (others.length >= 2) {
      // Results conflict - mark as disputed
      const ids = others.map(m => m.id);
      await this.electionRepo.update(ids, { verificationStatus: 'disputed' } as any);
    }
  }

  // Parallel Vote Tabulation
  async getParallelCount(country: string, electionName: string) {
    const results = await this.electionRepo.find({
      where: { country, electionName, type: 'result_upload' },
      select: ['state', 'results', 'pollingUnit', 'verificationStatus'],
    });

    // Group by state and sum party votes
    const stateResults: Record<string, { parties: Record<string, number>; puCount: number; verified: number; disputed: number }> = {};

    for (const r of results) {
      const state = r.state || 'Unknown';
      if (!stateResults[state]) stateResults[state] = { parties: {}, puCount: 0, verified: 0, disputed: 0 };
      stateResults[state].puCount++;
      if (r.verificationStatus === 'citizen_verified') stateResults[state].verified++;
      if (r.verificationStatus === 'disputed') stateResults[state].disputed++;

      for (const [party, votes] of Object.entries(r.results || {})) {
        stateResults[state].parties[party] = (stateResults[state].parties[party] || 0) + Number(votes);
      }
    }

    return { stateResults, totalPUs: results.length, election: electionName };
  }

  async getFeed(country: string, electionName?: string, page = 1, limit = 20) {
    const where: any = { country };
    if (electionName) where.electionName = electionName;

    return this.electionRepo.createQueryBuilder('e')
      .leftJoin('e.user', 'user')
      .addSelect(['user.id', 'user.displayName', 'user.username', 'user.avatar', 'user.trustLevel', 'user.isCertified'])
      .where(electionName ? 'e.country = :country AND e.electionName = :electionName' : 'e.country = :country', { country, electionName })
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  async getIncidents(country: string, page = 1, limit = 20) {
    return this.electionRepo
      .createQueryBuilder('e')
      .leftJoin('e.user', 'user')
      .addSelect(['user.id', 'user.displayName', 'user.username', 'user.avatar', 'user.trustLevel'])
      .where('e.country = :country', { country })
      .andWhere('e.type IN (:...types)', { types: ['violence', 'vote_buying', 'intimidation', 'ballot_snatching'] })
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  async getResults(country: string, electionName: string, state?: string) {
    const query = this.electionRepo.createQueryBuilder('e')
      .where('e.country = :country', { country })
      .andWhere('e.electionName = :electionName', { electionName })
      .andWhere('e.type = :type', { type: 'result_upload' });

    if (state) query.andWhere('e.state = :state', { state });

    return query.orderBy('e.createdAt', 'DESC').getMany();
  }

  async getHotspots(country: string, electionName: string) {
    return this.electionRepo
      .createQueryBuilder('e')
      .select('e.state', 'state')
      .addSelect('e.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('e.country = :country', { country })
      .andWhere('e.electionName = :electionName', { electionName })
      .groupBy('e.state')
      .addGroupBy('e.type')
      .orderBy('count', 'DESC')
      .getRawMany();
  }
}
