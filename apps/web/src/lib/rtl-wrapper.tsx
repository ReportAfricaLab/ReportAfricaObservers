'use client';
import { useEffect, ReactNode } from 'react';

export function RTLWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lang = localStorage.getItem('ra_language') || 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  // Listen for language changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const lang = localStorage.getItem('ra_language') || 'en';
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    });

    // Re-check on storage events (when language changes)
    const handleStorage = () => {
      const lang = localStorage.getItem('ra_language') || 'en';
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    };

    window.addEventListener('storage', handleStorage);
    // Also poll every 2s for same-tab changes
    const interval = setInterval(handleStorage, 2000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
