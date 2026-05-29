import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchlistEntity } from '../../database/entities';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistEntity)
    private readonly watchlistRepo: Repository<WatchlistEntity>,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: { name: string; latitude: number; longitude: number; radiusKm?: number; categories?: string[] }) {
    const watchlist = this.watchlistRepo.create({
      userId,
      name: dto.name,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radiusKm: dto.radiusKm || 5,
      categories: dto.categories || [],
    });
    return this.watchlistRepo.save(watchlist);
  }

  async getMyWatchlists(userId: string) {
    return this.watchlistRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, userId: string, dto: Partial<{ name: string; latitude: number; longitude: number; radiusKm: number; categories: string[]; isActive: boolean }>) {
    const watchlist = await this.watchlistRepo.findOne({ where: { id, userId } });
    if (!watchlist) throw new NotFoundException('Watchlist not found');
    Object.assign(watchlist, dto);
    return this.watchlistRepo.save(watchlist);
  }

  async delete(id: string, userId: string) {
    const watchlist = await this.watchlistRepo.findOne({ where: { id, userId } });
    if (!watchlist) throw new NotFoundException('Watchlist not found');
    await this.watchlistRepo.remove(watchlist);
    return { deleted: true };
  }

  // Called when a new report is created — check all active watchlists for matches
  async matchAndNotify(report: { id: string; title: string; category: string; latitude: number; longitude: number; authorId: string }) {
    const watchlists = await this.watchlistRepo.find({ where: { isActive: true } });

    for (const wl of watchlists) {
      // Skip notifying the report author about their own report
      if (wl.userId === report.authorId) continue;

      // Check category filter
      if (wl.categories.length > 0 && !wl.categories.includes(report.category)) continue;

      // Check distance (approximate using degrees)
      const radiusDegrees = wl.radiusKm / 111;
      const latDiff = Math.abs(Number(wl.latitude) - report.latitude);
      const lngDiff = Math.abs(Number(wl.longitude) - report.longitude);

      if (latDiff <= radiusDegrees && lngDiff <= radiusDegrees) {
        await this.notifications.sendToUser(wl.userId, {
          title: `📍 Alert: ${wl.name}`,
          body: report.title.substring(0, 100),
          data: { type: 'watchlist_alert', reportId: report.id, watchlistId: wl.id },
        });
      }
    }
  }
}
