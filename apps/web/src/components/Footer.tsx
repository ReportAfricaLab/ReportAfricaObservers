'use client';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <div className="space-y-2 text-sm">
              <Link href="/feed" className="block hover:text-white transition">Feed</Link>
              <Link href="/map" className="block hover:text-white transition">Map</Link>
              <Link href="/donations" className="block hover:text-white transition">Helping Hands</Link>
              <Link href="/elections" className="block hover:text-white transition">Elections</Link>
              <Link href="/live" className="block hover:text-white transition">Live Streams</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <div className="space-y-2 text-sm">
              <Link href="/about" className="block hover:text-white transition">About</Link>
              <Link href="/careers" className="block hover:text-white transition">Careers</Link>
              <Link href="/press" className="block hover:text-white transition">Press & Media</Link>
              <Link href="/partners" className="block hover:text-white transition">Partners</Link>
              <Link href="/contact" className="block hover:text-white transition">Contact</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Resources</h4>
            <div className="space-y-2 text-sm">
              <a href="https://reportafrica-academy-amber.vercel.app" target="_blank" className="block hover:text-white transition">🎓 Journalist Academy</a>
              <Link href="/how-it-works" className="block hover:text-white transition">How It Works</Link>
              <Link href="/faq" className="block hover:text-white transition">FAQ</Link>
              <Link href="/guidelines" className="block hover:text-white transition">Community Guidelines</Link>
              <Link href="/media-licensing" className="block hover:text-white transition">Media Licensing</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <div className="space-y-2 text-sm">
              <Link href="/privacy" className="block hover:text-white transition">Privacy Policy</Link>
              <Link href="/terms" className="block hover:text-white transition">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2024 ReportAfrica. Africa&apos;s Citizen-Powered Reporting Platform.</p>
          <div className="flex gap-4 text-sm">
            <a href="https://twitter.com/reportafrica" target="_blank" rel="noopener noreferrer" className="hover:text-white">Twitter/X</a>
            <a href="https://instagram.com/reportafrica" target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a>
            <a href="https://linkedin.com/company/reportafrica" target="_blank" rel="noopener noreferrer" className="hover:text-white">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

