'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const NAV = [
  { label: 'Dashboard', href: '/', icon: '📊', roles: ['super_admin', 'admin', 'content_manager', 'finance_admin', 'support_admin'] },
  { label: 'Users', href: '/users', icon: '👥', roles: ['super_admin', 'admin', 'support_admin'] },
  { label: 'Reports', href: '/reports', icon: '📰', roles: ['super_admin', 'admin', 'content_manager'] },
  { label: 'Campaigns', href: '/campaigns', icon: '🤝', roles: ['super_admin', 'admin', 'finance_admin'] },
  { label: 'Businesses', href: '/businesses', icon: '🏪', roles: ['super_admin', 'admin', 'finance_admin'] },
  { label: 'Promo Challenges', href: '/challenges', icon: '🎯', roles: ['super_admin', 'admin', 'finance_admin'] },
  { label: 'Livestreams', href: '/livestreams', icon: '🔴', roles: ['super_admin', 'admin', 'content_manager'] },
  { label: 'Elections', href: '/elections', icon: '🗳️', roles: ['super_admin', 'admin', 'content_manager'] },
  { label: 'Notifications', href: '/notifications', icon: '🔔', roles: ['super_admin', 'admin', 'support_admin'] },
  { label: 'Tips & Earnings', href: '/tips', icon: '💰', roles: ['super_admin', 'admin', 'finance_admin'] },
  { label: 'Academy', href: '/courses', icon: '🎓', roles: ['super_admin', 'admin', 'content_manager'] },
  { label: 'Revenue', href: '/revenue', icon: '💎', roles: ['super_admin', 'admin', 'finance_admin'] },
  { label: 'Moderation', href: '/moderation', icon: '⚠️', roles: ['super_admin', 'admin', 'content_manager', 'support_admin'] },
  { label: 'Team', href: '/team', icon: '🔑', roles: ['super_admin', 'admin'] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState('');

  useEffect(() => {
    if (pathname === '/login') { setAuthed(true); return; }
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/login'); return; }
    setAuthed(true);
    // Fetch role
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.reportafrica.africa/api/v1'}/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => { if (d.role) setRole(d.role); }).catch(() => {});
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/login');
  };

  if (!authed) return null;
  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="flex">
      <aside className="w-64 min-h-screen bg-gray-950 border-r border-gray-800 p-5 fixed overflow-y-auto">
        <h1 className="text-lg font-bold text-emerald-400 mb-2">🛡️ RA Admin</h1>
        {role && <p className="text-[10px] text-gray-500 mb-6 px-1 capitalize">{role.replace('_', ' ')}</p>}
        <nav className="space-y-0.5 text-sm">
          {NAV.filter(item => !role || item.roles.includes(role)).map((item) => (
            <a key={item.href} href={item.href}
              className={`block px-3 py-2 rounded transition ${pathname === item.href ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
              {item.icon} {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-8 pt-4 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-800 rounded text-left">
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
