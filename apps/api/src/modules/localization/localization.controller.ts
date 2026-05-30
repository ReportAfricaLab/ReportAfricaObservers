import { Controller, Get, Query } from '@nestjs/common';
import { LocalizationService } from './localization.service';

@Controller('localization')
export class LocalizationController {
  constructor(private readonly service: LocalizationService) {}

  @Get('translations')
  getTranslations(@Query('lang') lang: string) {
    return this.service.getTranslations(lang || 'en');
  }

  @Get('languages')
  getLanguages() {
    return this.service.getSupportedLanguages();
  }

  @Get('default-language')
  getDefaultLanguage(@Query('country') country: string) {
    return { language: this.service.getDefaultLanguage(country || 'NG') };
  }
}
