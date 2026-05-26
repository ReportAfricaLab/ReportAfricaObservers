import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { LivestreamService } from './livestream.service';

class CreateStreamDto {
  @IsString() title: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() category?: string;
  @IsNumber() @IsOptional() latitude?: number;
  @IsNumber() @IsOptional() longitude?: number;
}

@Controller('livestream')
export class LivestreamController {
  constructor(private readonly service: LivestreamService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  createStream(@Request() req: any, @Body() dto: CreateStreamDto) {
    return this.service.createStream(req.user.id, req.user.country, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/go-live')
  goLive(@Param('id') id: string, @Request() req: any) {
    return this.service.goLive(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/end')
  endStream(@Param('id') id: string, @Request() req: any) {
    return this.service.endStream(id, req.user.id);
  }

  @Get('live')
  getLiveStreams(@Query('country') country: string, @Query('page') page?: string) {
    return this.service.getLiveStreams(country || 'NG', Number(page) || 1);
  }

  @Get('recordings')
  getRecordings(@Query('country') country: string, @Query('page') page?: string) {
    return this.service.getRecordings(country || 'NG', Number(page) || 1);
  }

  @Get(':id')
  getStream(@Param('id') id: string) {
    return this.service.getStreamById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my/streams')
  getMyStreams(@Request() req: any) {
    return this.service.getUserStreams(req.user.id);
  }
}
