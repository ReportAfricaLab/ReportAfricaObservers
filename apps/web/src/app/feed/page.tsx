'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ReportCard from '@/components/ReportCard';

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
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
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [country, category, location]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Country Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {COUNTRIES.map((c) => (
          <button key={c.code} onClick={() => setCountry(c.code)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition ${country === c.code ? 'bg-[#0F7B6C] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0F7B6C]'}`}>
            {c.name}
          </button>
        ))}
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
        <div className="text-center py-20 text-gray-400">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No reports yet</p>
          <p className="text-gray-300 text-sm mt-2">Be the first to report what&apos;s happening in your area</p>
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
