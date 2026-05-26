import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TranslationMap {
  [key: string]: { [lang: string]: string };
}

const UI_TRANSLATIONS: TranslationMap = {
  'app.tagline': {
    en: "See It. Report It. Change It.",
    fr: "Voyez-le. Signalez-le. Changez-le.",
    sw: "Ione. Ripoti. Ibadilishe.",
    yo: "Ri i. Ròyìn rẹ̀. Yí padà.",
    ha: "Gani. Rahoto. Canza shi.",
    ig: "Hụ ya. Kọọ ya. Gbanwee ya.",
    zu: "Kubona. Kubika. Kushintsha.",
    af: "Sien dit. Rapporteer dit. Verander dit.",
    rw: "Birebe. Bitangaze. Bihindure.",
  },
  'nav.feed': { en: 'Feed', fr: 'Fil', sw: 'Mlisho', yo: 'Ìjábọ̀', ha: 'Labari', ig: 'Nri', zu: 'Ukudla', af: 'Voer', rw: 'Amakuru' },
  'nav.map': { en: 'Map', fr: 'Carte', sw: 'Ramani', yo: 'Maapu', ha: 'Taswira', ig: 'Maapụ', zu: 'Ibalazwe', af: 'Kaart', rw: 'Ikarita' },
  'nav.report': { en: 'Report', fr: 'Signaler', sw: 'Ripoti', yo: 'Ìròyìn', ha: 'Rahoto', ig: 'Akụkọ', zu: 'Umbiko', af: 'Verslag', rw: 'Raporo' },
  'nav.help': { en: 'Helping Hands', fr: 'Entraide', sw: 'Msaada', yo: 'Ìrànlọ́wọ́', ha: 'Taimako', ig: 'Enyemaka', zu: 'Usizo', af: 'Hulp', rw: 'Ubufasha' },
  'report.create': { en: 'Create Report', fr: 'Créer un rapport', sw: 'Unda Ripoti', yo: 'Ṣẹ̀dá Ìròyìn', ha: 'Ƙirƙiri Rahoto', ig: 'Mepụta Akụkọ', zu: 'Dala Umbiko', af: 'Skep Verslag', rw: 'Kora Raporo' },
  'report.title': { en: 'Title', fr: 'Titre', sw: 'Kichwa', yo: 'Àkọlé', ha: 'Take', ig: 'Aha', zu: 'Isihloko', af: 'Titel', rw: 'Umutwe' },
  'report.description': { en: 'Description', fr: 'Description', sw: 'Maelezo', yo: 'Àpèjúwe', ha: 'Bayani', ig: 'Nkọwa', zu: 'Incazelo', af: 'Beskrywing', rw: 'Ibisobanuro' },
  'category.traffic': { en: 'Traffic', fr: 'Circulation', sw: 'Trafiki', yo: 'Ọkọ̀', ha: 'Ababen hanya', ig: 'Okporo ụzọ', zu: 'Ithrafikhi', af: 'Verkeer', rw: 'Ubwikorere' },
  'category.police_security': { en: 'Police & Security', fr: 'Police et Sécurité', sw: 'Polisi na Usalama', yo: 'Ọlọ́pàá àti Ààbò', ha: "Yan sanda da Tsaro", ig: 'Ndị uwe ojii na Nchekwa', zu: 'Amaphoyisa Nokuphepha', af: 'Polisie en Sekuriteit', rw: 'Polisi n\'Umutekano' },
  'category.government': { en: 'Government', fr: 'Gouvernement', sw: 'Serikali', yo: 'Ìjọba', ha: 'Gwamnati', ig: 'Gọọmentị', zu: 'Uhulumeni', af: 'Regering', rw: 'Guverinoma' },
  'category.emergency': { en: 'Emergency', fr: 'Urgence', sw: 'Dharura', yo: 'Pàjáwìrì', ha: 'Gaggawa', ig: 'Mberede', zu: 'Isimo esiphuthumayo', af: 'Noodgeval', rw: 'Ibihutirwa' },
  'category.election': { en: 'Election', fr: 'Élection', sw: 'Uchaguzi', yo: 'Ìdìbò', ha: 'Zaɓe', ig: 'Ntuli aka', zu: 'Ukhetho', af: 'Verkiesing', rw: 'Amatora' },
};

const SUPPORTED_LANGUAGES: Record<string, string[]> = {
  NG: ['en', 'yo', 'ha', 'ig'],
  GH: ['en', 'tw', 'ga'],
  KE: ['en', 'sw'],
  ZA: ['en', 'zu', 'af'],
  UG: ['en', 'sw', 'lg'],
  RW: ['en', 'rw', 'fr'],
};

@Injectable()
export class LocalizationService {
  translate(key: string, lang: string): string {
    const entry = UI_TRANSLATIONS[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  }

  getTranslations(lang: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, translations] of Object.entries(UI_TRANSLATIONS)) {
      result[key] = translations[lang] || translations['en'] || key;
    }
    return result;
  }

  getSupportedLanguages(country: string): string[] {
    return SUPPORTED_LANGUAGES[country] || ['en'];
  }

  getAllCountries() {
    return [
      { code: 'NG', name: 'Nigeria', brandName: 'ReportNaija', languages: ['en', 'yo', 'ha', 'ig'] },
      { code: 'GH', name: 'Ghana', brandName: 'ReportGhana', languages: ['en', 'tw', 'ga'] },
      { code: 'KE', name: 'Kenya', brandName: 'ReportKenya', languages: ['en', 'sw'] },
      { code: 'ZA', name: 'South Africa', brandName: 'ReportSA', languages: ['en', 'zu', 'af'] },
      { code: 'UG', name: 'Uganda', brandName: 'ReportUganda', languages: ['en', 'sw', 'lg'] },
      { code: 'RW', name: 'Rwanda', brandName: 'ReportRwanda', languages: ['en', 'rw', 'fr'] },
      { code: 'TZ', name: 'Tanzania', brandName: 'ReportTanzania', languages: ['en', 'sw'] },
      { code: 'ET', name: 'Ethiopia', brandName: 'ReportEthiopia', languages: ['en', 'am'] },
      { code: 'SN', name: 'Senegal', brandName: 'ReportSenegal', languages: ['fr', 'wo'] },
      { code: 'CM', name: 'Cameroon', brandName: 'ReportCameroon', languages: ['en', 'fr'] },
    ];
  }
}
