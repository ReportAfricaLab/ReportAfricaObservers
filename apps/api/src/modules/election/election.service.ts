import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionReportEntity } from '../../database/entities';

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
    const report = this.electionRepo.create({
      ...dto,
      userId,
      country,
      results: dto.results || {},
      media: dto.media || [],
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
    });
    return this.electionRepo.save(report);
  }

  async getFeed(country: string, electionName?: string, page = 1, limit = 20) {
    const where: any = { country };
    if (electionName) where.electionName = electionName;

    return this.electionRepo.find({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });
  }

  async getIncidents(country: string, page = 1, limit = 20) {
    return this.electionRepo
      .createQueryBuilder('e')
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
