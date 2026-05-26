import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'http://10.162.41.17:3001/api/v1';

interface I18nState {
  language: string;
  translations: Record<string, string>;
  setLanguage: (lang: string) => void;
  loadTranslations: (lang: string) => Promise<void>;
  t: (key: string) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  language: 'en',
  translations: {},

  setLanguage: (lang: string) => {
    set({ language: lang });
    get().loadTranslations(lang);
  },

  loadTranslations: async (lang: string) => {
    try {
      const res = await axios.get(`${API_URL}/localization/translations?lang=${lang}`);
      set({ translations: res.data });
    } catch {
      // Fallback to empty, will use keys
    }
  },

  t: (key: string) => {
    const { translations } = get();
    return translations[key] || key.split('.').pop() || key;
  },
}));
