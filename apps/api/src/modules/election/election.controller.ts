import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional, IsNumber, IsObject, IsArray, IsIn } from 'class-validator';
import { ElectionService } from './election.service';
import { LivestreamService } from '../livestream/livestream.service';

class SubmitElectionReportDto {
  @IsString() @IsIn(['result_upload', 'violence', 'vote_buying', 'intimidation', 'ballot_snatching', 'observer_report'])
  type: string;
  @IsString() electionName: string;
  @IsString() @IsOptional() pollingUnit?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() lga?: string;
  @IsString() @IsOptional() ward?: string;
  @IsString() @IsOptional() description?: string;
  @IsObject() @IsOptional() results?: Record<string, number>;
  @IsArray() @IsOptional() media?: { type: string; url: string }[];
  @IsNumber() @IsOptional() latitude?: number;
  @IsNumber() @IsOptional() longitude?: number;
  @IsString() @IsOptional() recordedAt?: string;
}

@Controller('elections')
export class ElectionController {
  constructor(
    private readonly service: ElectionService,
    private readonly livestreamService: LivestreamService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('report')
  submit(@Request() req: any, @Body() dto: SubmitElectionReportDto) {
    return this.service.submitReport(req.user.id, req.user.country, dto);
  }

  @Get('feed')
  getFeed(@Query('country') country: string, @Query('election') election?: string, @Query('page') page?: string) {
    return this.service.getFeed(country || 'NG', election, Number(page) || 1);
  }

  @Get('incidents')
  getIncidents(@Query('country') country: string, @Query('page') page?: string) {
    return this.service.getIncidents(country || 'NG', Number(page) || 1);
  }

  @Get('results')
  getResults(@Query('country') country: string, @Query('election') election: string, @Query('state') state?: string) {
    return this.service.getResults(country || 'NG', election, state);
  }

  @Get('hotspots')
  getHotspots(@Query('country') country: string, @Query('election') election: string) {
    return this.service.getHotspots(country || 'NG', election);
  }

  @Get('live')
  getElectionLive(@Query('country') country: string, @Query('election') election?: string) {
    return this.livestreamService.getElectionLiveStreams(country || 'NG', election);
  }
}
