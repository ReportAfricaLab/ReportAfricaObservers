import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString } from 'class-validator';
import { ReferralService } from './referral.service';

class ApplyCodeDto {
  @IsString() code: string;
}

@Controller('referral')
export class ReferralController {
  constructor(private readonly service: ReferralService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('my-code')
  async getMyCode(@Request() req: any) {
    const code = await this.service.getOrCreateCode(req.user.id);
    return { code };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate')
  async generateCode(@Request() req: any) {
    const code = await this.service.seedCode(req.user.id);
    return { code };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('apply')
  applyCode(@Request() req: any, @Body() dto: ApplyCodeDto) {
    return this.service.registerWithReferral(req.user.id, dto.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-referrals')
  getMyReferrals(@Request() req: any) {
    return this.service.getMyReferrals(req.user.id);
  }
}
