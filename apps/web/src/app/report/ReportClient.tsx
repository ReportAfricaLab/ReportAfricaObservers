'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
async function fetchAPI(endpoint: string, options: any = {}) {
  const { token, ...opts } = options;
  const headers: any = { 'Content-Type': 'application/json', ...opts.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, { ...opts, headers });
  return res.json();
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-[#D92D20] text-white',
  high: 'bg-[#F97316] text-white',
  medium: 'bg-[#F4B400] text-gray-900',
  low: 'bg-[#2563EB] text-white',
};

function ReportContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { token } = useAuth();
  const { t } = useI18n();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipBalance, setTipBalance] = useState(0);
  const [tipCurrency, setTipCurrency] = useState('NGN');
  const [updates, setUpdates] = useState<any[]>([]);
  const [updateText, setUpdateText] = useState('');
  const [verifyStats, setVerifyStats] = useState<any>(null);
  const [verifyComment, setVerifyComment] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);
  const [frictionModal, setFrictionModal] = useState<{ show: boolean; countdown: number; action: (() => void) | null }>({ show: false, countdown: 3, action: null });

  useEffect(() => {
    if (!id) return;
    api.reports.getById(id).then(setReport).finally(() => setLoading(false));
    api.comments.getByReport(id).then((data) => setComments(data.data || [])).catch(() => {});
    fetchAPI(`/report-updates/report/${id}`).then((data) => setUpdates(data.data || [])).catch(() => {});
    fetchAPI(`/reports/${id}/verify`).then(setVerifyStats).catch(() => {});
    if (token) {
      fetchAPI('/tips/balance', { token }).then((data) => {
        setTipBalance(data.balance || 0);
        setTipCurrency(data.currency || 'NGN');
      }).catch(() => {});
    }
  }, [id, token]);

  useEffect(() => {
    if (!token || !report?.author?.id) return;
    // Don't check follow status for own reports
    const currentUserId = JSON.parse(localStorage.getItem('ra_user') || '{}')?.id;
    if (report.author.id === currentUserId) return;
    api.follows.isFollowing(token, report.author.id).then(setIsFollowing).catch(() => {});
  }, [token, report]);

  const handleVote = async (type: 'upvote' | 'downvote') => {
    if (!token || !id) return;
    const updated = type === 'upvote' ? await api.reports.upvote(token, id) : await api.reports.downvote(token, id);
    setReport(updated);
  };

  const handleFollow = async () => {
    if (!token || !report?.author?.id) return;
    if (isFollowing) {
      await api.follows.unfollow(token, report.author.id);
      setIsFollowing(false);
    } else {
      await api.follows.follow(token, report.author.id);
      setIsFollowing(true);
    }
  };

  const handleTip = async (amount: number) => {
    if (!token || !id) return;
    if (tipBalance < amount) { alert(`Insufficient balance. You have ${tipCurrency} ${tipBalance}. Buy a tip pack first.`); return; }
    try {
      const res = await fetchAPI('/tips', { method: 'POST', body: JSON.stringify({ reportId: id, amount }), token });
      setTipBalance(res.remainingBalance ?? tipBalance - amount);
      alert(`Tip sent! 🎉`);
      setShowTip(false);
    } catch {}
  };

  const handlePostUpdate = async () => {
    if (!token || !id || !updateText.trim()) return;
    await fetchAPI('/report-updates', { method: 'POST', body: JSON.stringify({ reportId: id, text: updateText.trim() }), token });
    const data = await fetchAPI(`/report-updates/report/${id}`);
    setUpdates(data.data || []);
    setUpdateText('');
  };

  const handleComment = async () => {
    if (!token || !id || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const newComment = await api.comments.create(token, { reportId: id, text: commentText.trim() });
      setComments([newComment, ...comments]);
      setCommentText('');
    } catch {}
    setSubmitting(false);
  };

  const handleLike = async (commentId: string) => {
    if (!token) return;
    await api.comments.like(token, commentId);
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c));
  };

  const HIGH_RISK_CATEGORIES = ['election', 'police_security', 'emergency', 'health'];
  const handleShare = (action: () => void) => {
    if (report && HIGH_RISK_CATEGORIES.includes(report.category) && report.verificationLevel === 'unverified') {
      setFrictionModal({ show: true, countdown: 3, action });
      const interval = setInterval(() => {
        setFrictionModal((prev) => {
          if (prev.countdown <= 1) { clearInterval(interval); return { ...prev, countdown: 0 }; }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    } else {
      action();
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400">Loading...</div>;
  if (!report) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400">Report not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-6">

      {/* Left Sidebar (desktop only) */}
      <aside className="hidden xl:block w-56 flex-shrink-0">
        <div className="sticky top-24 space-y-4">

          {/* Author Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#0F7B6C] flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">
              {report.author?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-sm font-semibold text-gray-900">{report.author?.displayName || 'Anonymous'}</p>
            <p className="text-xs text-gray-400">@{report.author?.username || 'anonymous'}</p>
            <p className="text-[10px] text-[#0F7B6C] font-medium mt-1 capitalize">{(report.author?.trustLevel || 'new_reporter').replace('_', ' ')}</p>
            {report.author?.id && token && report.author.id !== JSON.parse(localStorage.getItem('ra_user') || '{}')?.id && (
              <button onClick={handleFollow}
                className={`mt-3 w-full py-2 rounded-lg text-xs font-medium transition ${isFollowing ? 'bg-gray-100 text-gray-600' : 'bg-[#0F7B6C] text-white hover:bg-[#0B6E4F]'}`}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Report Stats */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">📊 Stats</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Views</span><span className="font-medium text-gray-900">{report.viewCount || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Confirms</span><span className="font-medium text-green-600">↑ {report.upvotes || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Disputes</span><span className="font-medium text-red-600">↓ {report.downvotes || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Comments</span><span className="font-medium text-gray-900">{report.commentCount || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Credibility</span><span className="font-medium text-blue-600">{verifyStats?.credibilityScore || 0}%</span></div>
            </div>
          </div>

          {/* Ad Slot */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-medium text-gray-400 mb-2">Sponsored</p>
            <div className="w-full h-28 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-xs text-gray-400">Ad Space</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-2"><a href="/contact" className="text-[#0F7B6C]">Advertise →</a></p>
          </div>

          {/* Share */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">🔗 Share Report</h3>
            <div className="flex gap-2">
              <button onClick={() => handleShare(() => navigator.clipboard.writeText(window.location.href))} className="flex-1 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200 transition">📋 Copy Link</button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleShare(() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(report.title)}`, '_blank'))} className="flex-1 py-2 bg-black text-white rounded-lg text-xs font-medium text-center">𝕏</button>
              <button onClick={() => handleShare(() => window.open(`https://wa.me/?text=${encodeURIComponent(report.title + ' ' + window.location.href)}`, '_blank'))} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-xs font-medium text-center">WhatsApp</button>
            </div>
          </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 max-w-2xl space-y-6">
      {/* Report Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2.5 py-1 text-xs font-bold rounded ${SEVERITY_COLORS[report.severity]}`}>
            {report.severity.toUpperCase()}
          </span>
          <span className="text-sm text-gray-500 capitalize">{report.category.replace('_', ' ')}</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded ${report.verificationLevel === 'unverified' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
            {report.verificationLevel.replace('_', ' ')}
          </span>
          {report.contentHash && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700" title={`SHA-256: ${report.contentHash}`}>🔒 Evidence Sealed</span>
          )}
        </div>

        {verifyStats && verifyStats.disputes >= 3 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-semibold text-amber-800">⚠️ Disputed: This report is under community review.</p>
            <p className="text-xs text-amber-600 mt-1">{verifyStats.disputes} community members have flagged concerns about this report&apos;s accuracy.</p>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{report.aiHeadline || report.title}</h1>
        <p className="text-gray-600 leading-relaxed mb-3">{translatedText || report.description}</p>

        {/* Media - Images and Videos */}
        {report.media && report.media.length > 0 && report.media[0]?.url && (
          <div className="mb-4 space-y-2">
            {report.media.map((m: any, i: number) => (
              <div key={i} className="rounded-xl overflow-hidden">
                {m.type?.startsWith('video') ? (
                  <video
                    src={m.url}
                    className="w-full aspect-video object-contain bg-gray-900 rounded-xl"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={m.url} alt={report.title} className="w-full rounded-xl object-cover max-h-[500px]" />
                )}
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={async () => {
          if (translatedText) { setTranslatedText(''); return; }
          setTranslating(true);
          try {
            const res = await fetch(`${API_URL}/voice/translate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: report.description, targetLanguage: 'en' }),
            });
            const data = await res.json();
            setTranslatedText(data.translatedText || report.description);
          } catch { }
          setTranslating(false);
        }} className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium mb-6">
          {translating ? '⏳ Translating...' : translatedText ? '↩️ Show original' : '🌐 Translate'}
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 p-3 bg-gray-50 rounded-lg">
          <span>📍</span>
          <span>{report.city || report.state || `${Number(report.latitude).toFixed(4)}, ${Number(report.longitude).toFixed(4)}`}</span>
          <span className="ml-auto text-xs">{report.country}</span>
        </div>

        {/* Author + Follow */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mb-6">
          <div className="text-sm">
            <span className="text-gray-500">Reported by </span>
            <span className="font-medium text-gray-900">{report.author?.displayName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center gap-2">
            {report.author?.id && token && report.author.id !== JSON.parse(localStorage.getItem('ra_user') || '{}')?.id && (
              <button onClick={handleFollow}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isFollowing ? 'bg-gray-100 text-gray-600' : 'bg-[#0F7B6C] text-white hover:bg-[#0B6E4F]'}`}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Voting + Tip */}
        <div className="flex items-center gap-4">
          <button onClick={() => handleVote('upvote')}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium">
            ↑ {t('report.confirm', 'Confirm')} ({report.upvotes})
          </button>
          <button onClick={() => handleVote('downvote')}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium">
            ↓ {t('report.dispute', 'Dispute')} ({report.downvotes})
          </button>
          {token && report.author?.id && (
            <button onClick={() => setShowTip(!showTip)}
              className="ml-auto px-4 py-2 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 transition text-sm font-medium">
              💰 {t('tip.tipReporter', 'Tip')}
            </button>
          )}
          <span className="text-sm text-gray-400">👁️ {report.viewCount} views</span>
        </div>

        {showTip && (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-800 mb-3">Balance: {tipCurrency} {tipBalance.toLocaleString()}</p>
            {report.country !== JSON.parse(localStorage.getItem('ra_user') || '{}')?.country && (
              <p className="text-xs text-blue-600 mb-3 italic">Reporter will receive equivalent in their local currency</p>
            )}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {({
                NGN: [1500, 3000, 5000, 10000],
                GHS: [15, 30, 50, 100],
                KES: [150, 300, 500, 1000],
                ZAR: [20, 50, 100, 200],
                UGX: [5000, 10000, 20000, 50000],
                RWF: [1500, 3000, 5000, 10000],
              }[tipCurrency] || [1500, 3000, 5000, 10000]).map((amt: number) => (
                <button key={amt} onClick={() => handleTip(amt)}
                  className="py-2 bg-white border border-amber-300 rounded-lg text-sm font-medium text-amber-800 hover:bg-amber-100 transition">
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-600 text-center"><a href="/tip-packs" className="underline font-medium">Need more? Buy a tip pack →</a></p>
          </div>
        )}
      </div>

      {/* Verification Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Verify This Report</h2>
        {verifyStats && (
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-green-600 font-semibold">✅ {verifyStats.confirms || 0} confirms</span>
            <span className="text-red-600 font-semibold">❌ {verifyStats.disputes || 0} disputes</span>
            <span className="ml-auto text-blue-600 font-semibold">{verifyStats.credibilityScore || 0}% credible</span>
          </div>
        )}
        {token && (
          <>
            <input value={verifyComment} onChange={(e) => setVerifyComment(e.target.value)}
              placeholder="Optional: why do you confirm/dispute?" maxLength={200}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#0F7B6C]" />
            <div className="flex gap-3">
              <button onClick={async () => {
                try {
                  const res = await fetchAPI(`/reports/${id}/verify`, { method: 'POST', body: JSON.stringify({ vote: 'confirm', comment: verifyComment }), token });
                  setVerifyStats(res); setVerifyComment('');
                } catch (e: any) { alert(e.message || 'Already voted'); }
              }} className="flex-1 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">
                ✅ Confirm
              </button>
              <button onClick={async () => {
                try {
                  const res = await fetchAPI(`/reports/${id}/verify`, { method: 'POST', body: JSON.stringify({ vote: 'dispute', comment: verifyComment }), token });
                  setVerifyStats(res); setVerifyComment('');
                } catch (e: any) { alert(e.message || 'Already voted'); }
              }} className="flex-1 py-2.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">
                ❌ Dispute
              </button>
            </div>
          </>
        )}
      </div>

      {/* Report Updates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📝 {t('update.title', 'Updates')} ({updates.length})</h2>

        {token && report.authorId === (undefined) && null}
        {token && (
          <div className="flex gap-2 mb-4">
            <input value={updateText} onChange={(e) => setUpdateText(e.target.value)}
              placeholder="Post an update (author only)..." maxLength={500}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#0F7B6C]" />
            <button onClick={handlePostUpdate}
              className="px-4 py-2.5 bg-[#0F7B6C] text-white rounded-lg text-sm font-medium hover:bg-[#0B6E4F] transition">
              Post
            </button>
          </div>
        )}

        {updates.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">{t('update.empty', 'No updates yet')}</p>
        ) : (
          <div className="space-y-3">
            {updates.map((u: any) => (
              <div key={u.id} className="border-l-2 border-[#0F7B6C] pl-3 py-1">
                <p className="text-xs text-[#0F7B6C] font-medium capitalize">{u.type === 'resolution' ? '✅' : '📝'} {u.type}</p>
                <p className="text-sm text-gray-700">{u.text}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(u.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">💬 {t('report.comments', 'Comments')} ({comments.length})</h2>

        {/* Comment Input */}
        {token && (
          <div className="flex gap-2 mb-6">
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('comment.write', 'Write a comment...')} maxLength={1000}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#0F7B6C]"
              onKeyDown={(e) => e.key === 'Enter' && handleComment()} />
            <button onClick={handleComment} disabled={submitting}
              className="px-4 py-2.5 bg-[#0F7B6C] text-white rounded-lg text-sm font-medium hover:bg-[#0B6E4F] transition disabled:opacity-50">
              Post
            </button>
          </div>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">{t('comment.empty', 'No comments yet. Be the first!')}</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment: any) => (
              <div key={comment.id} className="border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-[#0F7B6C] flex items-center justify-center text-white text-xs font-bold">
                    {comment.user?.displayName?.[0] || '?'}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{comment.user?.displayName || 'User'}</span>
                  <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => handleLike(comment.id)} className="ml-auto text-xs text-gray-400 hover:text-red-500">
                    ♥ {comment.likes || 0}
                  </button>
                </div>
                <p className="text-sm text-gray-700 ml-8">{comment.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>

      {/* Right Sidebar (desktop only) */}
      <aside className="hidden lg:block w-72 flex-shrink-0">
        <div className="sticky top-24 space-y-4">

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">📍 Location</h3>
            <p className="text-xs text-gray-600">{report.city || report.state || 'Location detected'}</p>
            <p className="text-[10px] text-gray-400 mt-1">{Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}</p>
            <p className="text-xs text-gray-500 mt-1">Country: {report.country}</p>
          </div>

          {/* Ad Slot */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-medium text-gray-400 mb-2">Sponsored</p>
            <div className="w-full h-24 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-xs text-gray-400">Ad Space</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-2"><a href="/contact" className="text-[#0F7B6C]">Advertise here →</a></p>
          </div>

          {/* Related Reports */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">📰 Related Reports</h3>
            <p className="text-xs text-gray-400">More reports from this area coming soon</p>
            <a href={`/feed?country=${report.country}`} className="block mt-2 text-xs text-[#0F7B6C] font-medium hover:underline">Browse {report.country} reports →</a>
          </div>

          {/* Ad Slot 2 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-medium text-gray-400 mb-2">Sponsored</p>
            <div className="w-full h-24 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-xs text-gray-400">Ad Space</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-2"><a href="/contact" className="text-[#0F7B6C]">Advertise here →</a></p>
          </div>

          {/* Safety Tips */}
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <h3 className="text-sm font-bold text-amber-800 mb-2">⚠️ Safety Tips</h3>
            <ul className="text-xs text-amber-700 space-y-1.5">
              <li>• Verify reports before sharing</li>
              <li>• Don't approach dangerous situations</li>
              <li>• Contact authorities for emergencies</li>
              <li>• Protect your identity when needed</li>
            </ul>
          </div>

        </div>
      </aside>

      </div>

      {/* Friction Modal for sharing unverified high-risk reports */}
      {frictionModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-red-700 mb-2">⚠️ Unverified Report</h3>
            <p className="text-sm text-gray-700 mb-4">This report has <strong>not been verified</strong>. Sharing false information about elections, security, or emergencies may have legal consequences.</p>
            <p className="text-xs text-gray-500 mb-4">Please ensure you have reason to believe this report is accurate before sharing.</p>
            <div className="flex gap-3">
              <button onClick={() => setFrictionModal({ show: false, countdown: 3, action: null })}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { frictionModal.action?.(); setFrictionModal({ show: false, countdown: 3, action: null }); }}
                disabled={frictionModal.countdown > 0}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                {frictionModal.countdown > 0 ? `Wait ${frictionModal.countdown}s...` : 'Share Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400">Loading...</div>}>
      <ReportContent />
    </Suspense>
  );
}
