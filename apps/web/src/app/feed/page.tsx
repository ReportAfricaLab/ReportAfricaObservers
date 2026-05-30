'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import ReportCard from '@/components/ReportCard';

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'UG', name: 'Uganda' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'EG', name: 'Egypt' },
  { code: 'MA', name: 'Morocco' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'CI', name: 'C\u00f4te d\'Ivoire' },
  { code: 'AO', name: 'Angola' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'CD', name: 'DR Congo' },
  { code: 'SD', name: 'Sudan' },
  { code: 'LY', name: 'Libya' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'MW', name: 'Malawi' },
  { code: 'BJ', name: 'Benin' },
  { code: 'TG', name: 'Togo' },
  { code: 'ML', name: 'Mali' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'NE', name: 'Niger' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'LR', name: 'Liberia' },
  { code: 'SO', name: 'Somalia' },
  { code: 'MG', name: 'Madagascar' },
];

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'traffic', label: '🚗 Traffic' },
  { key: 'police_security', label: '🚨 Security' },
  { key: 'government', label: '🏛️ Government' },
  { key: 'election', label: '🗳️ Election' },
  { key: 'emergency', label: '🚨 Emergency' },
  { key: 'environmental', label: '🌍 Environment' },
];

export default function FeedPage() {
  const { t } = useI18n();
  const [country, setCountry] = useState('NG');
  const [category, setCategory] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetchReports = category
      ? api.reports.byCategory(country, category)
      : api.reports.feed(country, 1, location?.lat, location?.lng);

    fetchReports
      .then((res: any) => setReports(Array.isArray(res) ? res : res.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [country, category, location]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Country Selector */}
      <div className="flex items-center gap-3 mb-6">
        <select value={country} onChange={(e) => setCountry(e.target.value)}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#0F7B6C] cursor-pointer">
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{t('nav.live', 'Live Reports')}</span>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button key={cat.key} onClick={() => setCategory(cat.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition ${category === cat.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Reports */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">{t('feed.empty', 'Loading reports...')}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">{t('feed.empty', 'No reports yet')}</p>
          <p className="text-gray-300 text-sm mt-2">{t('report.create', 'Be the first to report what\'s happening in your area')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
