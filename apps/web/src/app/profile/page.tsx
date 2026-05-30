'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const TRUST_LABELS: Record<string, { label: string; color: string }> = {
  new_reporter: { label: 'New Reporter', color: '#6B7280' },
  community_reporter: { label: 'Community Reporter', color: '#2563EB' },
  trusted_reporter: { label: 'Trusted Reporter', color: '#059669' },
  elite_reporter: { label: 'Elite Reporter', color: '#7C3AED' },
  investigative_reporter: { label: 'Investigative Reporter', color: '#DC2626' },
};

const COUNTRY_NAMES: Record<string, string> = {
  NG: 'Nigeria', GH: 'Ghana', KE: 'Kenya', ZA: 'South Africa', UG: 'Uganda', RW: 'Rwanda',
  TZ: 'Tanzania', ET: 'Ethiopia', SN: 'Senegal', CM: 'Cameroon', EG: 'Egypt', MA: 'Morocco',
  DZ: 'Algeria', TN: 'Tunisia', CI: "Côte d'Ivoire", AO: 'Angola', MZ: 'Mozambique', CD: 'DR Congo',
  SD: 'Sudan', LY: 'Libya', ZW: 'Zimbabwe', ZM: 'Zambia', MW: 'Malawi', BJ: 'Benin',
  TG: 'Togo', ML: 'Mali', BF: 'Burkina Faso', NE: 'Niger', SL: 'Sierra Leone', LR: 'Liberia',
  SO: 'Somalia', MG: 'Madagascar',
};

export default function ProfilePage() {
  const { token, user, logout, login } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [tipBalance, setTipBalance] = useState(0);
  const [tipCurrency, setTipCurrency] = useState('NGN');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => { setProfile(d); setEditName(d.displayName || ''); }).catch(() => {});
    fetch(`${API_URL}/follows/${user?.id}/counts`)
      .then((r) => r.json()).then((d) => { setFollowers(d.followers || 0); setFollowing(d.following || 0); }).catch(() => {});
    fetch(`${API_URL}/tips/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => { setTipBalance(d.balance || 0); setTipCurrency(d.currency || 'NGN'); }).catch(() => {});
  }, [token, user]);

  const handleSaveName = async () => {
    if (!token || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editName.trim() }),
      });
      const updated = await res.json();
      setProfile(updated);
      if (user) login({ ...user, username: updated.username }, token);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handlePhotoUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file || !token) return;
      try {
        // Get presigned URL
        const presignRes = await fetch(`${API_URL}/upload/presigned-url`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileType: 'image', contentType: file.type }),
        });
        const { uploadUrl, fileUrl } = await presignRes.json();

        // Upload to S3
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

        // Update profile
        const updateRes = await fetch(`${API_URL}/users/me`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: fileUrl }),
        });
        const updated = await updateRes.json();
        setProfile(updated);
        alert('Profile photo updated!');
      } catch { alert('Failed to upload photo'); }
    };
    input.click();
  };

  if (!token) return <div className="max-w-md mx-auto px-4 py-20 text-center text-gray-400">Please log in to view your profile</div>;

  const trustInfo = TRUST_LABELS[profile?.trustLevel || 'new_reporter'] || TRUST_LABELS.new_reporter;
  const displayName = profile?.displayName || user?.username || 'Reporter';
  const username = profile?.username || user?.username || '';
  const country = profile?.country || user?.country || 'NG';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-[#0F7B6C] to-[#0B6E4F]" />

        {/* Profile Info */}
        <div className="flex flex-col items-center -mt-10 pb-6">
          <div className="relative cursor-pointer" onClick={handlePhotoUpload}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt={displayName} className="w-20 h-20 rounded-full border-4 border-white object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white bg-[#0F7B6C] flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{displayName[0]}</span>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center text-xs">
              📷
            </div>
          </div>

          {editing ? (
            <div className="flex items-center gap-2 mt-3">
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="border border-[#0F7B6C] rounded-lg px-3 py-1.5 text-center font-bold text-lg w-48" maxLength={50} />
              <button onClick={handleSaveName} disabled={saving}
                className="w-8 h-8 bg-[#0F7B6C] text-white rounded-full text-sm font-bold">{saving ? '...' : '✓'}</button>
              <button onClick={() => { setEditing(false); setEditName(profile?.displayName || ''); }}
                className="w-8 h-8 bg-red-50 text-red-600 rounded-full text-sm font-bold">✕</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="mt-3 group">
              <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
              <p className="text-[10px] text-[#0F7B6C] opacity-0 group-hover:opacity-100 transition">Click to edit</p>
            </button>
          )}
          <p className="text-sm text-gray-500">@{username}</p>

          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-gray-50 rounded-full">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: trustInfo.color }} />
            <span className="text-xs font-semibold" style={{ color: trustInfo.color }}>{trustInfo.label}</span>
          </div>

          <p className="text-sm text-gray-500 mt-2">📍 {COUNTRY_NAMES[country] || country}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 border-t border-gray-100 divide-x divide-gray-100">
          <Link href={`/profile?tab=followers`} className="py-4 text-center hover:bg-gray-50 transition">
            <p className="text-lg font-bold text-gray-900">{followers}</p>
            <p className="text-xs text-gray-500">Followers</p>
          </Link>
          <Link href={`/profile?tab=following`} className="py-4 text-center hover:bg-gray-50 transition">
            <p className="text-lg font-bold text-gray-900">{following}</p>
            <p className="text-xs text-gray-500">Following</p>
          </Link>
          <div className="py-4 text-center">
            <p className="text-lg font-bold text-gray-900">{profile?.trustScore || 0}</p>
            <p className="text-xs text-gray-500">Trust Score</p>
          </div>
          <Link href="/tip-packs" className="py-4 text-center hover:bg-gray-50 transition">
            <p className="text-lg font-bold text-gray-900">{tipBalance}</p>
            <p className="text-xs text-gray-500">Tip Balance</p>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
        <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase">Activity</p>
        {[
          { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
          { href: '/tip-packs', icon: '💰', label: 'Buy Tip Pack' },
          { href: '/watchlist', icon: '📍', label: 'Watchlists & Alerts' },
          { href: '/referral', icon: '🎁', label: 'Referral Program' },
          { href: '/profile/licenses', icon: '📄', label: 'License Requests' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center px-5 py-4 hover:bg-gray-50 transition">
            <span className="text-lg mr-3">{item.icon}</span>
            <span className="flex-1 text-sm font-medium text-gray-900">{item.label}</span>
            <span className="text-gray-400">›</span>
          </Link>
        ))}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
        <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase">{t('settings.title', 'Settings')}</p>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{t('settings.language', 'Language')}</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 outline-none focus:ring-2 focus:ring-[#0F7B6C]">
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="pt">Português</option>
              <option value="sw">Kiswahili</option>
            </select>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">{t('profile.yourCountry', 'Your Country')}</span>
          <span className="text-sm text-gray-500">{COUNTRY_NAMES[country] || country}</span>
        </div>
      </div>

      {/* Info Links */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
        <p className="px-5 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase">More</p>
        {[
          { href: '/about', label: 'About' },
          { href: '/how-it-works', label: 'How It Works' },
          { href: '/faq', label: 'FAQ' },
          { href: '/guidelines', label: 'Community Guidelines' },
          { href: '/privacy', label: 'Privacy Policy' },
          { href: '/terms', label: 'Terms of Service' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center px-5 py-3 hover:bg-gray-50 transition">
            <span className="flex-1 text-sm text-gray-700">{item.label}</span>
            <span className="text-gray-400">›</span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button onClick={logout} className="w-full py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition">
        Sign Out
      </button>
    </div>
  );
}
