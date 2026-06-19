'use client';
import Link from 'next/link';

interface Report {
  id: string;
  title: string;
  aiHeadline?: string;
  description: string;
  category: string;
  severity: string;
  verificationLevel: string;
  city?: string;
  state?: string;
  country: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  media?: { type: string; url: string }[];
  contentHash?: string;
  createdAt: string;
  author?: { displayName: string; username: string; trustLevel: string; isCertified?: boolean; subscriptionTier?: string };
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-[#D92D20] text-white',
  high: 'bg-[#F97316] text-white',
  medium: 'bg-[#F4B400] text-gray-900',
  low: 'bg-[#2563EB] text-white',
};

const CATEGORY_LABELS: Record<string, string> = {
  traffic: '🚗 Traffic',
  police_security: '🚨 Police & Security',
  government: '🏛️ Government',
  construction: '🏗️ Construction',
  election: '🗳️ Election',
  emergency: '🚨 Emergency',
  environmental: '🌍 Environmental',
  market_consumer: '🛒 Market & Consumer',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ReportCard({ report }: { report: Report }) {
  return (
    <Link href={`/report?id=${report.id}`} className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition">
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.low}`}>
          {report.severity.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500">{CATEGORY_LABELS[report.category] || report.category}</span>
        <span className="text-xs text-gray-400 ml-auto">{timeAgo(report.createdAt)}</span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{report.aiHeadline || report.title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{report.description}</p>

      {/* Media */}
      {report.media && report.media.length > 0 && report.media[0]?.url && (
        <div className="mb-3 rounded-lg overflow-hidden">
          {report.media[0].type?.startsWith('video') ? (
            <video src={report.media[0].url} className="w-full h-48 object-cover bg-gray-100" />
          ) : (
            <img src={report.media[0].url} alt={report.title} className="w-full h-48 object-cover bg-gray-100" loading="lazy" />
          )}
          {report.media.length > 1 && (
            <div className="flex gap-1 mt-1">
              {report.media.slice(1, 4).map((m, i) => (
                <div key={i} className="flex-1 h-16 rounded overflow-hidden bg-gray-100">
                  <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
              {report.media.length > 4 && (
                <div className="flex-1 h-16 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-medium">+{report.media.length - 4}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{report.author?.displayName || 'Anonymous'}{report.author?.isCertified && ' 🎓'}{report.author?.subscriptionTier === 'legend' && ' 👑'}{report.author?.subscriptionTier === 'elite' && ' 💜'}{report.author?.subscriptionTier === 'pro' && ' 🔵'}</span>
        <div className="flex items-center gap-3">
          <span>↑ {report.upvotes}</span>
          <span>💬 {report.commentCount}</span>
        </div>
      </div>
    </Link>
  );
}
