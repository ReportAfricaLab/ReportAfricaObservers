import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly service: LeaderboardService) {}

  @Get()
  getTopReporters(
    @Query('country') country: string,
    @Query('period') period?: 'week' | 'month' | 'all',
    @Query('limit') limit?: string,
  ) {
    return this.service.getTopReporters(country || 'NG', period || 'week', Number(limit) || 20);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMyRank(
    @Request() req: any,
    @Query('country') country?: string,
    @Query('period') period?: 'week' | 'month' | 'all',
  ) {
    return this.service.getMyRank(req.user.id, country || req.user.country, period || 'week');
  }
}
