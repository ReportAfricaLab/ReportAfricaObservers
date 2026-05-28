import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export const viewport: Viewport = {
  themeColor: '#0F7B6C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: 'ReportAfrica — Africa\'s Citizen-Powered Live Reporting Platform',
    template: '%s | ReportAfrica',
  },
  description: 'Real-time citizen journalism, civic accountability, and community reporting platform built for Africa. Report incidents, go live, and keep your community informed.',
  keywords: ['citizen journalism', 'Africa', 'live reporting', 'civic accountability', 'community alerts', 'election monitoring', 'emergency reporting', 'Nigeria', 'Ghana', 'Kenya'],
  authors: [{ name: 'ReportAfrica' }],
  creator: 'ReportAfrica',
  publisher: 'ReportAfrica',
  metadataBase: new URL('https://reportafrica.com'),
  alternates: { canonical: '/' },
  icons: { icon: '/icon.png', apple: '/icon.png' },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reportafrica.com',
    siteName: 'ReportAfrica',
    title: 'ReportAfrica — Africa\'s Citizen-Powered Live Reporting Platform',
    description: 'Real-time citizen journalism, civic accountability, and community reporting platform built for Africa.',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'ReportAfrica' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReportAfrica — Africa\'s Citizen-Powered Live Reporting Platform',
    description: 'Real-time citizen journalism, civic accountability, and community reporting platform built for Africa.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F8FAFC] text-gray-900 antialiased min-h-screen">
        <AuthProvider>
          <Navbar />
          <main className="pt-20">{children}</main>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
