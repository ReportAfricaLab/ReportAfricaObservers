import { Controller, Post, Get, Param, Body, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNumber, IsOptional, IsEmail, Min, IsInt } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TipsService } from './tips.service';

class BuyPackDto {
  @IsInt() packIndex: number;
  @IsEmail() email: string;
  @IsString() country: string;
}

class SendTipDto {
  @IsString() @IsOptional() reportId?: string;
  @IsString() @IsOptional() livestreamId?: string;
  @IsNumber() @Min(1) amount: number;
  @IsString() @IsOptional() message?: string;
}

@Controller('tips')
export class TipsController {
  constructor(
    private readonly service: TipsService,
    private readonly config: ConfigService,
  ) {}

  @Post('buy-pack')
  buyPack(@Request() req: any, @Body() dto: BuyPackDto) {
    const userId = req.user?.id || null;
    return this.service.buyPack(userId, dto);
  }

  @Get('verify-pack/:reference')
  verifyPack(@Param('reference') reference: string, @Request() req: any) {
    return this.service.verifyPackPurchase(reference, req.user?.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  sendTip(@Request() req: any, @Body() dto: SendTipDto) {
    return this.service.sendTip(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  getBalance(@Request() req: any) {
    return this.service.getBalance(req.user.id);
  }

  @Get('report/:reportId')
  getReportTips(@Param('reportId') reportId: string) {
    return this.service.getReportTips(reportId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('received')
  getMyTips(@Request() req: any, @Query('page') page?: string) {
    return this.service.getReporterTipsReceived(req.user.id, Number(page) || 1);
  }

  @Post('webhook/paystack')
  handleWebhook(@Body() body: any, @Headers('x-paystack-signature') signature: string) {
    const secret = this.config.get('PAYSTACK_SECRET_KEY', '');
    if (secret) {
      const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');
      if (hash !== signature) return { status: 'invalid signature' };
    }

    if (body.event === 'charge.success') {
      this.service.handleWebhook(body.event, body.data);
    }
    return { status: 'ok' };
  }
}
