import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsNumber, IsString, IsOptional, IsIn } from 'class-validator';
import { EmergencyService } from './emergency.service';

class TriggerSOSDto {
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;
  @IsString() @IsIn(['fire', 'violence', 'accident', 'flood', 'security_threat', 'building_collapse', 'medical'])
  type: string;
  @IsString() @IsOptional() description?: string;
}

@Controller('emergency')
export class EmergencyController {
  constructor(private readonly service: EmergencyService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('sos')
  triggerSOS(@Request() req: any, @Body() dto: TriggerSOSDto) {
    return this.service.triggerSOS(req.user.id, req.user.country, dto);
  }

  @Get('active')
  getActiveEmergencies(@Query('country') country: string) {
    return this.service.getActiveEmergencies(country || 'NG');
  }
}
