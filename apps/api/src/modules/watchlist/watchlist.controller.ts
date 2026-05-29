import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNumber, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { WatchlistService } from './watchlist.service';

class CreateWatchlistDto {
  @IsString() name: string;
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;
  @IsNumber() @IsOptional() radiusKm?: number;
  @IsArray() @IsOptional() categories?: string[];
}

class UpdateWatchlistDto {
  @IsString() @IsOptional() name?: string;
  @IsNumber() @IsOptional() latitude?: number;
  @IsNumber() @IsOptional() longitude?: number;
  @IsNumber() @IsOptional() radiusKm?: number;
  @IsArray() @IsOptional() categories?: string[];
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@Controller('watchlist')
@UseGuards(AuthGuard('jwt'))
export class WatchlistController {
  constructor(private readonly service: WatchlistService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateWatchlistDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  getMyWatchlists(@Request() req: any) {
    return this.service.getMyWatchlists(req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateWatchlistDto) {
    return this.service.update(id, req.user.id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.service.delete(id, req.user.id);
  }
}
