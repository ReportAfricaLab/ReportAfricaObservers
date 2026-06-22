const CURRENCY_RATES: Record<string, number> = {
  NGN: 1500, GHS: 14, KES: 150, ZAR: 18, UGX: 3700, RWF: 1300,
  TZS: 2600, ETB: 57, XOF: 600, XAF: 600, EGP: 48, MAD: 10, USD: 1,
};

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', UG: 'UGX', RW: 'RWF',
  TZ: 'TZS', ET: 'ETB', SN: 'XOF', CM: 'XAF', EG: 'EGP', MA: 'MAD',
};

export function getCurrency(country: string) { return COUNTRY_CURRENCY[country] || 'USD'; }
export function getRate(currency: string) { return CURRENCY_RATES[currency] || 1; }
export function getLocalPrice(usd: number, country: string) {
  const currency = getCurrency(country);
  return { price: Math.round(usd * getRate(currency)), currency };
}
