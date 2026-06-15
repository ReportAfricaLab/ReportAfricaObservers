'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';

const COUNTRY_CONFIG: Record<string, { brandName: string }> = {
  NG: { brandName: 'Nigeria' }, GH: { brandName: 'Ghana' }, KE: { brandName: 'Kenya' },
  ZA: { brandName: 'South Africa' }, UG: { brandName: 'Uganda' }, RW: { brandName: 'Rwanda' },
  TZ: { brandName: 'Tanzania' }, ET: { brandName: 'Ethiopia' }, SN: { brandName: 'Senegal' },
  CM: { brandName: 'Cameroon' }, EG: { brandName: 'Egypt' }, MA: { brandName: 'Morocco' },
  DZ: { brandName: 'Algeria' }, TN: { brandName: 'Tunisia' }, CI: { brandName: "Côte d'Ivoire" },
  AO: { brandName: 'Angola' }, MZ: { brandName: 'Mozambique' }, CD: { brandName: 'DR Congo' },
  SD: { brandName: 'Sudan' }, LY: { brandName: 'Libya' }, ZW: { brandName: 'Zimbabwe' },
  ZM: { brandName: 'Zambia' }, MW: { brandName: 'Malawi' }, BJ: { brandName: 'Benin' },
  TG: { brandName: 'Togo' }, ML: { brandName: 'Mali' }, BF: { brandName: 'Burkina Faso' },
  NE: { brandName: 'Niger' }, SL: { brandName: 'Sierra Leone' }, LR: { brandName: 'Liberia' },
  SO: { brandName: 'Somalia' }, MG: { brandName: 'Madagascar' },
};

const TRUST_LABELS: Record<string, { label: string; color: string }> = {
  new_reporter: { label: 'New Reporter', color: '#6B7280' },
  community_reporter: { label: 'Community Reporter', color: '#2563EB' },
  trusted_reporter: { label: 'Trusted Reporter', color: '#059669' },
  elite_reporter: { label: 'Elite Reporter', color: '#7C3AED' },
  investigative_reporter: { label: 'Investigative Reporter', color: '#DC2626' },
};

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useI18n();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const brandName = user?.country ? COUNTRY_CONFIG[user.country]?.brandName || 'Africa' : 'Africa';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userProfile = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('ra_user') || '{}' : '{}');
  const trustInfo = TRUST_LABELS[userProfile.trustLevel || 'new_reporter'] || TRUST_LABELS.new_reporter;

  const guestNavLinks = [
    { href: '/feed', label: t('nav.feed', 'Feed') },
    { href: '/donations', label: t('nav.donations', 'Helping Hands') },
    { href: '/live', label: '🔴 ' + t('nav.live', 'Live') },
  ];

  const authNavLinks = [
    { href: '/feed', label: t('nav.feed', 'Feed') },
    { href: '/search', label: t('nav.search', 'Search') },
    { href: '/donations', label: t('nav.donations', 'Helping Hands') },
    { href: '/elections', label: t('nav.elections', 'Elections') },
    { href: '/media-licensing', label: t('nav.media', 'Media') },
    { href: '/map', label: t('nav.map', 'Map') },
    { href: '/live', label: '🔴 ' + t('nav.live', 'Live') },
  ];

  const navLinks = isAuthenticated ? authNavLinks : guestNavLinks;

  return (
    <header className="fixed top-0 w-full bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="ReportAfrica" width={300} height={80} className="h-[50px] sm:h-[80px] w-auto" priority />
          <div className="flex flex-col">
            <span className="text-sm sm:text-lg font-bold text-[#0F7B6C]">{brandName}</span>
            <span className="text-[10px] sm:text-xs text-gray-500">Live Reports</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[#0F7B6C] transition">{link.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link href="/create-report" className="px-3 py-2 text-xs font-semibold text-white bg-[#D92D20] rounded-lg hover:bg-red-700 transition">
                + Report
              </Link>
              <Link href="/emergency" className="px-2 py-2 text-xs font-semibold text-[#D92D20] border border-[#D92D20] rounded-lg hover:bg-red-50 transition">
                🚨 SOS
              </Link>

              {/* Desktop Profile Dropdown */}
              <div className="hidden lg:block relative" ref={dropdownRef}>
                <button onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition">
                  <div className="w-8 h-8 rounded-full bg-[#0F7B6C] flex items-center justify-center text-white text-sm font-bold">
                    {user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <svg className={`w-3.5 h-3.5 text-gray-500 transition ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-12 w-64 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{user?.username || 'Reporter'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{user?.username}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: trustInfo.color }} />
                        <span className="text-[11px] font-medium" style={{ color: trustInfo.color }}>{trustInfo.label}</span>
                      </div>
                    </div>
                    <div className="py-1">
                      {[
                        { href: '/profile', icon: '👤', label: 'My Profile' },
                        { href: '/notifications', icon: '🔔', label: 'Notifications' },
                        { href: '/earnings', icon: '💰', label: 'My Earnings' },
                        { href: '/trust', icon: '🛡️', label: 'Trust Profile' },
                        { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
                        { href: '/tip-packs', icon: '💳', label: 'Tip Packs' },
                        { href: '/watchlist', icon: '📍', label: 'Watchlists' },
                        { href: '/referral', icon: '🎁', label: 'Referral' },
                        { href: 'https://reportafrica-academy-amber.vercel.app', icon: '🎓', label: 'Academy' },
                        { href: '/profile/licenses', icon: '📄', label: 'Licenses' },
                      ].map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                      <button onClick={() => { logout(); setShowDropdown(false); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition w-full text-left">
                        <span>🚪</span><span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[#0F7B6C] border border-[#0F7B6C] rounded-lg hover:bg-[#0F7B6C]/5">
                Log In
              </Link>
              <Link href="/register" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F7B6C] rounded-lg hover:bg-[#0B6E4F]">
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile Hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-gray-600 hover:text-[#0F7B6C]">
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu — includes nav links + profile */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1E293B] max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="flex flex-col px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="py-3 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Profile section inside mobile menu */}
          {isAuthenticated && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#0F7B6C] flex items-center justify-center text-white text-sm font-bold">
                  {user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.username}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: trustInfo.color }} />
                    <span className="text-[10px] font-medium" style={{ color: trustInfo.color }}>{trustInfo.label}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {[
                  { href: '/profile', icon: '👤', label: 'My Profile' },
                  { href: '/notifications', icon: '🔔', label: 'Notifications' },
                  { href: '/earnings', icon: '💰', label: 'My Earnings' },
                  { href: '/trust', icon: '🛡️', label: 'Trust Profile' },
                  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
                  { href: '/tip-packs', icon: '💳', label: 'Tip Packs' },
                  { href: '/watchlist', icon: '📍', label: 'Watchlists' },
                  { href: '/referral', icon: '🎁', label: 'Referral' },
                  { href: 'https://reportafrica-academy-amber.vercel.app', icon: '🎓', label: 'Academy' },
                ].map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2.5 px-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition">
                    <span>{item.icon}</span><span>{item.label}</span>
                  </Link>
                ))}
              </div>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 py-2.5 px-3 mt-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition w-full">
                <span>🚪</span><span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

