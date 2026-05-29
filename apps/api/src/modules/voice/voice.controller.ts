import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional } from 'class-validator';
import { VoiceService } from './voice.service';

class TranscribeDto {
  @IsString() audioUrl: string;
  @IsString() @IsOptional() language?: string;
}

@Controller('voice')
export class VoiceController {
  constructor(private readonly service: VoiceService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('transcribe')
  transcribe(@Body() dto: TranscribeDto) {
    return this.service.processVoiceNote(dto.audioUrl, dto.language || 'en');
  }
}
