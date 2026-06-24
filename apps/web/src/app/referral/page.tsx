'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ReferralPage() {
  const { token } = useAuth();
  const [code, setCode] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [applyCode, setApplyCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/referral/my-code`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setCode(d.code || '')).catch(() => {});
    fetch(`${API_URL}/referral/my-referrals`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setStats).catch(() => {});
  }, [token]);

  const handleGenerate = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/referral/generate`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    const data = await res.json();
    setCode(data.code || '');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setMessage('Copied!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleApply = async () => {
    if (!token || !applyCode.trim()) return;
    try {
      const res = await fetch(`${API_URL}/referral/apply`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: applyCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setMessage('Code applied!'); setApplyCode(''); }
      else setMessage(data.message || 'Invalid code');
    } catch { setMessage('Failed to apply code'); }
    setTimeout(() => setMessage(''), 3000);
  };

  if (!token) return <div className="max-w-md mx-auto px-4 py-20 text-center text-gray-400">Please log in</div>;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">🎁 Referral Program</h1>
      <p className="text-gray-500 text-sm mb-6">Invite friends. Earn 25 trust points when they post their first report.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center mb-6">
        <p className="text-xs text-gray-500 mb-2">Your Referral Code</p>
        <p className="text-2xl font-bold text-[#0F7B6C] tracking-wider mb-4">{code || '—'}</p>
        <div className="flex flex-col gap-2">
          {!code && <button onClick={handleGenerate} className="px-4 py-2 bg-[#0F7B6C] text-white rounded-lg text-sm font-medium">Generate Code</button>}
          {code && (
            <>
              <div className="flex gap-2 justify-center">
                <button onClick={handleCopy} className="px-4 py-2 bg-[#0F7B6C] text-white rounded-lg text-sm font-medium">📋 Copy Code</button>
                <button onClick={() => {
                  const msg = `Join ReportAfrica — Africa's citizen reporting platform! Use my referral code ${code} when you sign up. https://www.reportafrica.africa/register`;
                  navigator.clipboard.writeText(msg); setMessage('Invite message copied!'); setTimeout(() => setMessage(''), 2000);
                }} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">📋 Copy Invite</button>
              </div>
              <div className="flex gap-2 justify-center">
                <a href={`https://wa.me/?text=${encodeURIComponent(`Join ReportAfrica — Africa's citizen reporting platform! Use my referral code ${code} when you sign up. https://www.reportafrica.africa/register`)}`} target="_blank" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">WhatsApp</a>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join @ReportAfrica! Use my referral code ${code} to sign up: https://www.reportafrica.africa/register`)}`} target="_blank" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium">𝕏</a>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button onClick={() => navigator.share({ text: `Join ReportAfrica — Africa's citizen reporting platform! Use my referral code ${code} when you sign up. https://www.reportafrica.africa/register` }).catch(() => {})} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">📤 More</button>
                )}
              </div>
            </>
          )}
        </div>
        {message && <p className="text-xs text-green-600 mt-2">{message}</p>}
      </div>

      {stats && (
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.totalReferred || 0}</p>
            <p className="text-xs text-gray-500">Referred</p>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.rewardsPaid || 0}</p>
            <p className="text-xs text-gray-500">Rewards</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-sm font-medium text-gray-900 mb-3">Have a referral code?</p>
        <div className="flex gap-2">
          <input value={applyCode} onChange={(e) => setApplyCode(e.target.value)} placeholder="RA-XXXX1234"
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm uppercase" />
          <button onClick={handleApply} className="px-4 py-2.5 bg-[#0F7B6C] text-white rounded-lg text-sm font-medium">Apply</button>
        </div>
      </div>
    </div>
  );
}
