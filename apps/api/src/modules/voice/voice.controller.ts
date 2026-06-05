import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional } from 'class-validator';
import { VoiceService } from './voice.service';
import { AiService } from '../ai/ai.service';

class TranscribeDto {
  @IsString() audioUrl: string;
  @IsString() @IsOptional() language?: string;
}

class TranslateDto {
  @IsString() text: string;
  @IsString() @IsOptional() targetLanguage?: string;
}

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly service: VoiceService,
    private readonly ai: AiService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('transcribe')
  transcribe(@Body() dto: TranscribeDto) {
    return this.service.processVoiceNote(dto.audioUrl, dto.language || 'en');
  }

  @Post('translate')
  async translate(@Body() dto: TranslateDto) {
    const response = await this.ai.chatPlain(
      'You are a translator. Translate the following text to English. Return ONLY the translated text, nothing else.',
      dto.text,
    );

    return {
      originalText: dto.text,
      translatedText: response || dto.text,
    };
  }
}
