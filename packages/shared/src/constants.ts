import { Country } from './types';

export const COUNTRY_CONFIG: Record<Country, { name: string; brandName: string; subdomain: string; currency: string; languages: string[] }> = {
  [Country.NIGERIA]: { name: 'Nigeria', brandName: 'ReportNaija', subdomain: 'ng', currency: 'NGN', languages: ['en', 'yo', 'ha', 'ig'] },
  [Country.GHANA]: { name: 'Ghana', brandName: 'ReportGhana', subdomain: 'gh', currency: 'GHS', languages: ['en', 'tw', 'ga'] },
  [Country.KENYA]: { name: 'Kenya', brandName: 'ReportKenya', subdomain: 'ke', currency: 'KES', languages: ['en', 'sw'] },
  [Country.SOUTH_AFRICA]: { name: 'South Africa', brandName: 'ReportSA', subdomain: 'za', currency: 'ZAR', languages: ['en', 'zu', 'af'] },
  [Country.UGANDA]: { name: 'Uganda', brandName: 'ReportUganda', subdomain: 'ug', currency: 'UGX', languages: ['en', 'sw', 'lg'] },
  [Country.RWANDA]: { name: 'Rwanda', brandName: 'ReportRwanda', subdomain: 'rw', currency: 'RWF', languages: ['en', 'rw', 'fr'] },
};

export const REPORT_CATEGORY_LABELS: Record<string, string> = {
  traffic: 'Traffic Report',
  police_security: 'Police & Security',
  government: 'Government Accountability',
  construction: 'Construction & Infrastructure',
  election: 'Election & Voting',
  emergency: 'Community Emergency',
  environmental: 'Environmental',
  market_consumer: 'Market & Consumer',
};

export const COLORS = {
  primary: '#0F7B6C',
  secondary: '#F4B400',
  emergency: '#D92D20',
  humanitarian: '#F97316',
  info: '#2563EB',
  lightBg: '#F8FAFC',
  darkBg: '#0F172A',
  cardLight: '#FFFFFF',
  cardDark: '#1E293B',
  border: '#E5E7EB',
} as const;

// Tip Packs: defined in USD base, auto-calculated per currency
// Markup: Starter 25%, Popular 20%, Supporter 15%, Champion 12%, Elite 10%, Legend 8%
const TIP_PACK_BASE_USD = [
  { label: 'Starter', usdCost: 1.5, markup: 0.25 },
  { label: 'Popular', usdCost: 3.5, markup: 0.20 },
  { label: 'Supporter', usdCost: 7, markup: 0.15 },
  { label: 'Champion', usdCost: 16, markup: 0.12 },
  { label: 'Elite', usdCost: 33, markup: 0.10 },
  { label: 'Legend', usdCost: 65, markup: 0.08 },
];

// Approximate USD exchange rates (rounded for clean pricing)
const CURRENCY_RATES: Record<string, number> = {
  NGN: 1500, GHS: 14, KES: 150, ZAR: 18, UGX: 3700, RWF: 1300,
  TZS: 2600, ETB: 57, XOF: 600, XAF: 600, EGP: 48, MAD: 10,
  DZD: 135, TND: 3.1, AOA: 850, MZN: 64, CDF: 2700, SDG: 600,
  LYD: 4.8, USD: 1, ZMW: 26, MWK: 1700, SLE: 22, LRD: 190,
  SOS: 570, MGA: 4500,
};

// Country to currency mapping (all 32 countries)
export const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', UG: 'UGX', RW: 'RWF',
  TZ: 'TZS', ET: 'ETB', SN: 'XOF', CM: 'XAF', EG: 'EGP', MA: 'MAD',
  DZ: 'DZD', TN: 'TND', CI: 'XOF', AO: 'AOA', MZ: 'MZN', CD: 'CDF',
  SD: 'SDG', LY: 'LYD', ZW: 'USD', ZM: 'ZMW', MW: 'MWK', BJ: 'XOF',
  TG: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', SL: 'SLE', LR: 'LRD',
  SO: 'SOS', MG: 'MGA',
};

// Generate tip packs for any currency
function generatePacks(currency: string): { cost: number; value: number }[] {
  const rate = CURRENCY_RATES[currency] || 1;
  return TIP_PACK_BASE_USD.map((pack) => {
    const cost = Math.round(pack.usdCost * rate / 100) * 100 || Math.round(pack.usdCost * rate);
    const value = Math.round(cost * (1 - pack.markup));
    return { cost, value };
  });
}

// Pre-generated packs for all currencies
export const TIP_PACKS: Record<string, { cost: number; value: number }[]> = Object.fromEntries(
  Object.keys(CURRENCY_RATES).map((cur) => [cur, generatePacks(cur)]),
);

// Preset tip amounts (first 4 pack values as quick-pick)
export const TIP_PRESETS: Record<string, number[]> = Object.fromEntries(
  Object.keys(CURRENCY_RATES).map((cur) => {
    const packs = TIP_PACKS[cur];
    return [cur, packs.slice(0, 4).map((p) => p.value)];
  }),
);

export const PACK_LABELS = ['Starter', 'Popular', 'Supporter', 'Champion', 'Elite', 'Legend'];
export const BEST_VALUE_INDEX = 3; // Champion

// Currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', GHS: 'GH₵', KES: 'KSh', ZAR: 'R', UGX: 'USh', RWF: 'RWF',
  TZS: 'TSh', ETB: 'Br', XOF: 'CFA', XAF: 'FCFA', EGP: 'E£', MAD: 'MAD',
  DZD: 'DA', TND: 'DT', AOA: 'Kz', MZN: 'MT', CDF: 'FC', SDG: 'SDG',
  LYD: 'LD', USD: '$', ZMW: 'ZK', MWK: 'MK', SLE: 'Le', LRD: 'L$',
  SOS: 'Sh', MGA: 'Ar',
};
