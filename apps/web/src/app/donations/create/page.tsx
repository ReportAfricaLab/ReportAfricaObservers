'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const CATEGORIES = [
  { key: 'medical', label: '🏥 Medical Emergency' },
  { key: 'disaster', label: '🌊 Disaster Relief' },
  { key: 'abuse_survivor', label: '🛡️ Survivor Support' },
  { key: 'education', label: '📚 Education' },
  { key: 'legal_aid', label: '⚖️ Legal Aid' },
  { key: 'community', label: '🤝 Community Support' },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', category: '', targetAmount: '', currency: 'NGN',
    isEmergency: false, beneficiaryName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { setError('Please select a category'); return; }
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await api.donations.create(token, { ...form, targetAmount: Number(form.targetAmount) });
      router.push('/donations');
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Support Campaign</h1>
      <p className="text-gray-500 mb-8">Request help from the community for a genuine cause</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat.key} type="button" onClick={() => update('category', cat.key)}
                className={`px-3 py-2.5 text-xs font-medium rounded-lg border transition ${form.category === cat.key ? 'bg-[#F97316] text-white border-[#F97316]' : 'border-gray-200 text-gray-600 hover:border-[#F97316]'}`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Title</label>
          <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} required maxLength={200}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none"
            placeholder="e.g. Help Amina get surgery for her child" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Story / Description</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} required rows={6}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none resize-none"
            placeholder="Tell the community what happened and why you need help..." />
        </div>

        {/* Target Amount */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount</label>
            <input type="number" value={form.targetAmount} onChange={(e) => update('targetAmount', e.target.value)} required min={1000}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none"
              placeholder="3500000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select value={form.currency} onChange={(e) => update('currency', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] outline-none">
              <option value="NGN">NGN</option>
              <option value="GHS">GHS</option>
              <option value="KES">KES</option>
              <option value="ZAR">ZAR</option>
            </select>
          </div>
        </div>

        {/* Beneficiary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name (optional)</label>
          <input type="text" value={form.beneficiaryName} onChange={(e) => update('beneficiaryName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none"
            placeholder="Who will receive the funds?" />
        </div>

        {/* Emergency */}
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-red-50 rounded-lg border border-red-100">
          <input type="checkbox" checked={form.isEmergency} onChange={(e) => update('isEmergency', e.target.checked)}
            className="w-4 h-4 rounded text-[#D92D20]" />
          <div>
            <span className="text-sm font-medium text-gray-700">🚨 Mark as Emergency</span>
            <p className="text-xs text-gray-500">Emergency campaigns get priority visibility</p>
          </div>
        </label>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-[#F97316] text-white font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
          {loading ? 'Creating...' : 'Submit Campaign for Review'}
        </button>

        <p className="text-xs text-gray-400 text-center">Campaigns are reviewed before going live to prevent fraud.</p>
      </form>
    </div>
  );
}
