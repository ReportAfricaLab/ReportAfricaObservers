'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'medical', label: '🏥 Medical' },
  { key: 'disaster', label: '🌊 Disaster' },
  { key: 'abuse_survivor', label: '🛡️ Survivors' },
  { key: 'education', label: '📚 Education' },
  { key: 'legal_aid', label: '⚖️ Legal Aid' },
  { key: 'community', label: '🤝 Community' },
];

function formatAmount(amount: number | string, currency: string) {
  const num = Number(amount);
  if (num >= 1000000) return `${currency} ${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${currency} ${(num / 1000).toFixed(0)}K`;
  return `${currency} ${num.toLocaleString()}`;
}

function ProgressBar({ raised, target }: { raised: number; target: number }) {
  const pct = Math.min((raised / target) * 100, 100);
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-[#F97316] rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function DonationsPage() {
  const [country, setCountry] = useState('NG');
  const [category, setCategory] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = category
      ? api.donations.byCategory(country, category)
      : api.donations.campaignFeed(country);
    fetch.then(setCampaigns).catch(() => setCampaigns([])).finally(() => setLoading(false));
  }, [country, category]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Helping Hands</h1>
          <p className="text-sm text-gray-500 mt-1">Support fellow Africans facing real hardship</p>
        </div>
        <Link href="/donations/create" className="px-4 py-2 text-sm font-semibold text-white bg-[#F97316] rounded-lg hover:bg-orange-600 transition">
          + Create Campaign
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button key={cat.key} onClick={() => setCategory(cat.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition ${category === cat.key ? 'bg-[#F97316] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#F97316]'}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Campaigns */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🤝</p>
          <p className="text-gray-400">No campaigns yet in this category</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {campaigns.map((c: any) => (
            <Link key={c.id} href={`/donations/campaign?id=${c.id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition block">
              {/* Emergency badge */}
              {c.isEmergency && (
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#D92D20] text-white rounded mb-3">
                  🚨 EMERGENCY
                </span>
              )}
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{c.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">{c.description}</p>

              {/* Progress */}
              <ProgressBar raised={Number(c.raisedAmount)} target={Number(c.targetAmount)} />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className="font-semibold text-[#F97316]">{formatAmount(c.raisedAmount, c.currency)} raised</span>
                <span>of {formatAmount(c.targetAmount, c.currency)}</span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400">
                <span>{c.donorCount} donors</span>
                <span className="capitalize">{c.category.replace('_', ' ')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
