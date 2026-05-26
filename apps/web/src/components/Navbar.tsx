'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[#0F7B6C]">
          ReportAfrica
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/feed" className="hover:text-[#0F7B6C] transition">Feed</Link>
          <Link href="/donations" className="hover:text-[#F97316] transition">Helping Hands</Link>
          <Link href="/map" className="hover:text-[#0F7B6C] transition">Map</Link>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link href="/create-report" className="px-4 py-2 text-sm font-semibold text-white bg-[#D92D20] rounded-lg hover:bg-red-700 transition">
                + Report
              </Link>
              <span className="text-sm text-gray-500 hidden sm:inline">{user?.username}</span>
              <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-[#0F7B6C] border border-[#0F7B6C] rounded-lg hover:bg-[#0F7B6C]/5">
                Log In
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-[#0F7B6C] rounded-lg hover:bg-[#0B6E4F]">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
