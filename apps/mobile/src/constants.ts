export const COUNTRY_CONFIG: Record<string, { name: string; brandName: string; subdomain: string }> = {
  NG: { name: 'Nigeria', brandName: 'ReportNaija', subdomain: 'ng' },
  GH: { name: 'Ghana', brandName: 'ReportGhana', subdomain: 'gh' },
  KE: { name: 'Kenya', brandName: 'ReportKenya', subdomain: 'ke' },
  ZA: { name: 'South Africa', brandName: 'ReportSA', subdomain: 'za' },
  UG: { name: 'Uganda', brandName: 'ReportUganda', subdomain: 'ug' },
  RW: { name: 'Rwanda', brandName: 'ReportRwanda', subdomain: 'rw' },
  TZ: { name: 'Tanzania', brandName: 'ReportTanzania', subdomain: 'tz' },
  ET: { name: 'Ethiopia', brandName: 'ReportEthiopia', subdomain: 'et' },
  SN: { name: 'Senegal', brandName: 'ReportSenegal', subdomain: 'sn' },
  CM: { name: 'Cameroon', brandName: 'ReportCameroon', subdomain: 'cm' },
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
