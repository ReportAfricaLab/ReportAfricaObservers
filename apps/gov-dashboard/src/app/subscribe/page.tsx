'use client';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.reportafrica.africa/api/v1';

const PLANS = [
  { tier: 'basic', label: 'Agency Basic', price: '$500', period: '/month', features: ['90 day history', 'CSV export', 'Real-time alerts', 'State filter'] },
  { tier: 'pro', label: 'Agency Pro', price: '$2,000', period: '/month', features: ['1 year history', 'PDF reports', 'API access', 'Priority support', 'Trend analysis'], popular: true },
  { tier: 'enterprise', label: 'Enterprise', price: '$5,000', period: '/month', features: ['Unlimited history', 'Multi-user seats', 'Custom integration', 'Webhook alerts', 'Dedicated support', 'Full country access'] },
];

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [govUser, setGovUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('gov_token');
    if (!token) { window.location.href = '/login'; return; }
    fetch(`${API_URL}/gov/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setGovUser(data); setEmail(data.email || ''); })
      .catch(() => {});
  }, []);

  const handleSubscribe = async (tier: string) => {
    if (!email) { setError('Enter your email'); return; }
    setLoading(tier); setError('');
    const token = localStorage.getItem('gov_token');

    const res = await fetch(`${API_URL}/gov/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier, email }),
    }).then(r => r.json());

    if (res.paymentUrl) {
      window.location.href = res.paymentUrl;
    } else {
      setError(res.message || 'Payment initialization failed. Please try again later.');
      setLoading('');
    }
  };

  const trialExpired = govUser && !govUser.trialActive && govUser.role === 'gov_agency';
  const daysLeft = govUser?.trialDaysLeft || 0;

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        {trialExpired && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-400 font-semibold">Your free trial has expired</p>
            <p className="text-red-300 text-sm mt-1">Subscribe to a plan below to continue accessing the dashboard.</p>
          </div>
        )}

        {!trialExpired && daysLeft > 0 && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 mb-6 text-center">
            <p className="text-amber-400 font-semibold">Free trial: {daysLeft} days remaining</p>
            <p className="text-amber-300 text-sm mt-1">Upgrade now to unlock full features and avoid interruption.</p>
          </div>
        )}

        <h1 className="text-2xl font-bold text-white text-center mb-2">Choose Your Plan</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Select a subscription to continue using the Government Intelligence Dashboard.</p>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {PLANS.map((plan) => (
            <div key={plan.tier} className={`bg-[#1E293B] rounded-xl border p-6 ${plan.popular ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700'}`}>
              {plan.popular && <p className="text-[10px] font-bold text-blue-400 mb-2">RECOMMENDED</p>}
              <h3 className="text-lg font-bold text-white">{plan.label}</h3>
              <p className="text-2xl font-bold text-blue-400 mt-2">{plan.price}<span className="text-sm font-normal text-gray-500">{plan.period}</span></p>
              <ul className="mt-4 space-y-2 text-sm text-gray-300">
                {plan.features.map(f => <li key={f} className="flex items-center gap-2"><span className="text-blue-400">✓</span>{f}</li>)}
              </ul>
              <button onClick={() => handleSubscribe(plan.tier)} disabled={!!loading}
                className={`w-full mt-5 py-2.5 text-sm font-semibold rounded-lg transition ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'} disabled:opacity-50`}>
                {loading === plan.tier ? 'Redirecting...' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-[#1E293B] rounded-xl border border-gray-700 p-4 max-w-md mx-auto">
          <label className="text-xs text-gray-400 block mb-2">Email for payment receipt</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 outline-none focus:border-blue-500 text-sm" />
        </div>

        {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}

        <p className="text-xs text-gray-500 text-center mt-6">Secure payment via Paystack. Card, bank transfer, or mobile money.</p>

        {!trialExpired && (
          <p className="text-center mt-4">
            <a href="/" className="text-sm text-gray-400 hover:text-white transition">← Back to Dashboard</a>
          </p>
        )}
      </div>
    </div>
  );
}
