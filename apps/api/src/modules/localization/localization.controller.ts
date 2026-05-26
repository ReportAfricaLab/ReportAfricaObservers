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
  getLanguages(@Query('country') country: string) {
    return this.service.getSupportedLanguages(country || 'NG');
  }

  @Get('countries')
  getCountries() {
    return this.service.getAllCountries();
  }
}
