import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = __DEV__ ? 'http://10.162.41.17:3001/api/v1' : 'https://api.reportafrica.com/api/v1';

const COUNTRY_DEFAULT_LANGUAGE: Record<string, string> = {
  NG: 'en', GH: 'en', KE: 'en', ZA: 'en', UG: 'en', RW: 'en',
  TZ: 'sw', ET: 'en', SN: 'fr', CM: 'fr', EG: 'ar', MA: 'ar',
  DZ: 'ar', TN: 'ar', CI: 'fr', AO: 'pt', MZ: 'pt', CD: 'fr',
  SD: 'ar', LY: 'ar', ZW: 'en', ZM: 'en', MW: 'en', BJ: 'fr',
  TG: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', SL: 'en', LR: 'en',
  SO: 'ar', MG: 'fr',
};

interface I18nState {
  language: string;
  translations: Record<string, string>;
  isRTL: boolean;
  setLanguage: (lang: string) => void;
  initFromCountry: (country: string) => void;
  loadTranslations: (lang: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  language: 'en',
  translations: {},
  isRTL: false,

  setLanguage: (lang: string) => {
    const isRTL = lang === 'ar';
    set({ language: lang, isRTL });
    AsyncStorage.setItem('ra_language', lang).catch(() => {});
    get().loadTranslations(lang);
  },

  initFromCountry: (country: string) => {
    AsyncStorage.getItem('ra_language').then((saved) => {
      if (saved) {
        set({ language: saved, isRTL: saved === 'ar' });
        get().loadTranslations(saved);
      } else {
        const defaultLang = COUNTRY_DEFAULT_LANGUAGE[country] || 'en';
        set({ language: defaultLang, isRTL: defaultLang === 'ar' });
        get().loadTranslations(defaultLang);
      }
    }).catch(() => {});
  },

  loadTranslations: async (lang: string) => {
    try {
      const res = await axios.get(`${API_URL}/localization/translations?lang=${lang}`);
      set({ translations: res.data });
    } catch {
      // Fallback — use keys
    }
  },

  t: (key: string, fallback?: string) => {
    const { translations } = get();
    return translations[key] || fallback || key.split('.').pop() || key;
  },
}));
