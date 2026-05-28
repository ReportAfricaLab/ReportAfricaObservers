import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(req.user.id, req.user.country, dto);
  }

  @Get('feed')
  getFeed(
    @Query('country') country: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.reportsService.getFeed(
      country,
      Number(page) || 1,
      Number(limit) || 20,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
    );
  }

  @Get('nearby')
  getNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('page') page?: string,
  ) {
    return this.reportsService.getNearby(
      Number(lat),
      Number(lng),
      Number(radius) || 10,
      Number(page) || 1,
    );
  }

  @Get('category/:category')
  getByCategory(
    @Param('category') category: string,
    @Query('country') country: string,
    @Query('page') page?: string,
  ) {
    return this.reportsService.getByCategory(country, category, Number(page) || 1);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/upvote')
  upvote(@Param('id') id: string) {
    return this.reportsService.upvote(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/downvote')
  downvote(@Param('id') id: string) {
    return this.reportsService.downvote(id);
  }
}
