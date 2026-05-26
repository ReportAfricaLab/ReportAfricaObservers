'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function formatAmount(amount: number | string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString()}`;
}

function CampaignContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { token, isAuthenticated } = useAuth();
  const [campaign, setCampaign] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonateForm, setShowDonateForm] = useState(false);
  const [donateForm, setDonateForm] = useState({ amount: '', email: '', message: '', isAnonymous: false });
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.donations.getById(id),
      api.donations.getDonations(id),
    ]).then(([c, d]) => {
      setCampaign(c);
      setDonations(d);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setDonating(true);
    setError('');
    try {
      const result = await api.donations.donate(token, id, {
        amount: Number(donateForm.amount),
        email: donateForm.email,
        message: donateForm.message || undefined,
        isAnonymous: donateForm.isAnonymous,
      });
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Donation failed');
    } finally {
      setDonating(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading...</div>;
  if (!campaign) return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Campaign not found</div>;

  const pct = Math.min((Number(campaign.raisedAmount) / Number(campaign.targetAmount)) * 100, 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        {/* Header */}
        {campaign.isEmergency && (
          <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#D92D20] text-white rounded mb-4">🚨 EMERGENCY</span>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{campaign.title}</h1>
        <p className="text-gray-600 leading-relaxed mb-6">{campaign.description}</p>

        {/* Progress */}
        <div className="mb-6">
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#F97316] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-lg font-bold text-[#F97316]">{formatAmount(campaign.raisedAmount, campaign.currency)}</span>
            <span className="text-sm text-gray-500">of {formatAmount(campaign.targetAmount, campaign.currency)}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{campaign.donorCount} donors · {Math.round(pct)}% funded</p>
        </div>

        {/* Campaign Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg text-sm">
          <div><span className="text-gray-500">Category:</span> <span className="font-medium capitalize">{campaign.category.replace('_', ' ')}</span></div>
          <div><span className="text-gray-500">Status:</span> <span className="font-medium capitalize">{campaign.verificationLevel.replace('_', ' ')}</span></div>
          <div><span className="text-gray-500">By:</span> <span className="font-medium">{campaign.author?.displayName || 'Anonymous'}</span></div>
          {campaign.beneficiaryName && <div><span className="text-gray-500">For:</span> <span className="font-medium">{campaign.beneficiaryName}</span></div>}
        </div>

        {/* Donate Button */}
        {campaign.isActive && (
          <button onClick={() => setShowDonateForm(!showDonateForm)}
            className="w-full py-4 bg-[#F97316] text-white font-bold rounded-xl hover:bg-orange-600 transition text-lg">
            💛 Donate Now
          </button>
        )}

        {/* Donate Form */}
        {showDonateForm && isAuthenticated && (
          <form onSubmit={handleDonate} className="mt-6 p-5 border border-orange-100 rounded-xl bg-orange-50/30 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({campaign.currency})</label>
              <input type="number" value={donateForm.amount} onChange={(e) => setDonateForm({ ...donateForm, amount: e.target.value })}
                required min="100" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] outline-none" placeholder="5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (for receipt)</label>
              <input type="email" value={donateForm.email} onChange={(e) => setDonateForm({ ...donateForm, email: e.target.value })}
                required className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
              <input type="text" value={donateForm.message} onChange={(e) => setDonateForm({ ...donateForm, message: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] outline-none" placeholder="Stay strong!" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={donateForm.isAnonymous} onChange={(e) => setDonateForm({ ...donateForm, isAnonymous: e.target.checked })}
                className="w-4 h-4 rounded text-[#F97316]" />
              <span className="text-sm text-gray-600">Donate anonymously</span>
            </label>
            <button type="submit" disabled={donating}
              className="w-full py-3 bg-[#F97316] text-white font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
              {donating ? 'Processing...' : `Donate ${donateForm.amount ? formatAmount(donateForm.amount, campaign.currency) : ''}`}
            </button>
          </form>
        )}

        {showDonateForm && !isAuthenticated && (
          <p className="mt-4 text-center text-sm text-gray-500">Please <a href="/login" className="text-[#0F7B6C] font-semibold">sign in</a> to donate.</p>
        )}
      </div>

      {/* Donors */}
      {donations.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Donors</h3>
          <div className="space-y-3">
            {donations.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.isAnonymous ? 'Anonymous' : d.donor?.displayName || 'Someone'}</p>
                  {d.message && <p className="text-xs text-gray-400">{d.message}</p>}
                </div>
                <span className="text-sm font-semibold text-[#F97316]">{formatAmount(d.amount, campaign.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading...</div>}>
      <CampaignContent />
    </Suspense>
  );
}
