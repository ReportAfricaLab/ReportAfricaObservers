'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type Tab = 'feed' | 'incidents' | 'results' | 'hotspots' | 'live';

const INCIDENT_COLORS: Record<string, string> = {
  violence: '#DC2626',
  vote_buying: '#F97316',
  intimidation: '#7C2D12',
  ballot_snatching: '#991B1B',
  result_upload: '#059669',
  observer_report: '#2563EB',
};

const REPORT_TYPES = [
  { key: 'result_upload', label: '📊 Upload Results', color: '#059669' },
  { key: 'violence', label: '⚔️ Violence', color: '#DC2626' },
  { key: 'vote_buying', label: '💰 Vote Buying', color: '#F97316' },
  { key: 'intimidation', label: '😨 Intimidation', color: '#7C2D12' },
  { key: 'ballot_snatching', label: '📦 Ballot Snatching', color: '#991B1B' },
  { key: 'observer_report', label: '👁️ Observer Report', color: '#2563EB' },
];

export default function ElectionsPage() {
  const [tab, setTab] = useState<Tab>('feed');
  const [feed, setFeed] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [election, setElection] = useState('2027 General Election');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadData(); }, [tab, election]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'feed') {
        const res = await fetch(`${API_URL}/elections/feed?country=NG&election=${encodeURIComponent(election)}`);
        const data = await res.json();
        setFeed(Array.isArray(data) ? data : []);
      } else if (tab === 'incidents') {
        const res = await fetch(`${API_URL}/elections/incidents?country=NG`);
        const data = await res.json();
        setIncidents(Array.isArray(data) ? data : []);
      } else if (tab === 'results') {
        const res = await fetch(`${API_URL}/elections/results?country=NG&election=${encodeURIComponent(election)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } else if (tab === 'hotspots') {
        const res = await fetch(`${API_URL}/elections/hotspots?country=NG&election=${encodeURIComponent(election)}`);
        const data = await res.json();
        setHotspots(Array.isArray(data) ? data : []);
      } else if (tab === 'live') {
        const res = await fetch(`${API_URL}/elections/live?country=NG&election=${encodeURIComponent(election)}`);
        const data = await res.json();
        setLiveStreams(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🗳️ Election Monitor</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time citizen election reporting</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={election} onChange={(e) => setElection(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none">
            <option>2027 General Election</option>
            <option>2025 Off-Cycle Governorship</option>
          </select>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0F7B6C] rounded-lg hover:bg-[#0B6E4F] transition">
            + Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {([['feed', '📰 Feed'], ['live', '🔴 Live'], ['incidents', '⚠️ Incidents'], ['results', '📊 Results'], ['hotspots', '🔥 Hotspots']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${tab === key ? 'bg-[#0F7B6C] text-white' : 'bg-gray-100 text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Loading...</div>}

      {/* Feed Tab */}
      {!loading && tab === 'feed' && (
        <div className="space-y-4">
          {feed.length === 0 ? (
            <EmptyState icon="🗳️" title="No election reports yet" desc="Be the first to report — tap + Report above" />
          ) : feed.map((r: any) => <FeedCard key={r.id} r={r} />)}
        </div>
      )}

      {/* Incidents Tab */}
      {!loading && tab === 'incidents' && (
        <div className="space-y-3">
          {incidents.length === 0 ? (
            <EmptyState icon="✅" title="No incidents reported" desc="That's good news!" />
          ) : incidents.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl border border-red-100 p-4 flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: INCIDENT_COLORS[r.type] || '#DC2626' }} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{r.type.replace('_', ' ')} — {r.state || 'Unknown'}</p>
                <p className="text-xs text-gray-600 mt-1">{r.description}</p>
                {r.media?.length > 0 && <MediaGrid media={r.media} />}
                <p className="text-xs text-gray-400 mt-1">{r.lga && `${r.lga}, `}{r.ward && `${r.ward} · `}{new Date(r.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Tab */}
      {!loading && tab === 'results' && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <EmptyState icon="📊" title="No results uploaded yet" desc="Citizens can upload polling unit results during elections" />
          ) : results.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 text-xs font-bold rounded text-white bg-green-600">RESULT</span>
                {r.state && <span className="text-xs text-gray-500">{r.state}</span>}
                {r.pollingUnit && <span className="text-xs text-gray-400">· PU: {r.pollingUnit}</span>}
              </div>
              {r.results && Object.keys(r.results).length > 0 && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                  {Object.entries(r.results).map(([party, votes]) => (
                    <div key={party} className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">{party}</span>
                      <span className="text-gray-900 font-bold">{String(votes)}</span>
                    </div>
                  ))}
                </div>
              )}
              {r.media?.length > 0 && <MediaGrid media={r.media} />}
              <p className="text-xs text-gray-400 mt-3">
                {r.user?.displayName || 'Anonymous'} · {new Date(r.createdAt).toLocaleString()}
                {r.isVerifiedObserver && <span className="ml-2 text-green-600 font-semibold">✓ Verified Observer</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Hotspots Tab */}
      {!loading && tab === 'hotspots' && (
        <div>
          {hotspots.length === 0 ? (
            <EmptyState icon="🗺️" title="No hotspots detected" desc="Hotspots appear when multiple incidents are reported in the same area" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {hotspots.map((h: any, i: number) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{h.state || 'Unknown'}</h3>
                    <span className="px-2 py-0.5 text-xs font-bold rounded text-white" style={{ backgroundColor: INCIDENT_COLORS[h.type] || '#6B7280' }}>
                      {h.type?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{h.count}</p>
                  <p className="text-xs text-gray-500">reports</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Tab */}
      {!loading && tab === 'live' && <ElectionLiveTab streams={liveStreams} />}

      {/* Submit Report Modal */}
      {showForm && <ElectionReportForm election={election} onClose={() => setShowForm(false)} onSubmitted={() => { setShowForm(false); loadData(); }} />}
    </div>
  );
}

// === Components ===

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-gray-700 font-medium">{title}</p>
      <p className="text-gray-500 text-sm mt-1">{desc}</p>
    </div>
  );
}

function MediaGrid({ media }: { media: { type: string; url: string }[] }) {
  return (
    <div className="flex gap-2 mt-3 overflow-x-auto">
      {media.map((m, i) => (
        <div key={i} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
          {m.type.startsWith('video') ? (
            <video src={m.url} className="w-full h-full object-cover" />
          ) : (
            <img src={m.url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}

function FeedCard({ r }: { r: any }) {
  return (
    <a href={`/report?id=${r.id}`} className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition cursor-pointer">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 text-xs font-bold rounded text-white" style={{ backgroundColor: INCIDENT_COLORS[r.type] || '#6B7280' }}>
          {r.type.replace('_', ' ').toUpperCase()}
        </span>
        {r.state && <span className="text-xs text-gray-500">{r.state}</span>}
        {r.pollingUnit && <span className="text-xs text-gray-400">· PU: {r.pollingUnit}</span>}
      </div>
      <p className="text-sm text-gray-800">{r.description || r.electionName}</p>
      {r.results && Object.keys(r.results).length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-600 mb-2">Results:</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(r.results).map(([party, votes]) => (
              <div key={party} className="flex justify-between text-xs">
                <span className="text-gray-700 font-medium">{party}</span>
                <span className="text-gray-900 font-bold">{String(votes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {r.media?.length > 0 && <MediaGrid media={r.media} />}
      <p className="text-xs text-gray-400 mt-2">
        {r.user?.displayName || 'Anonymous'} · {new Date(r.createdAt).toLocaleString()}
        {r.isVerifiedObserver && <span className="ml-2 text-green-600 font-semibold">✓ Verified Observer</span>}
      </p>
    </a>
  );
}

// === Election Live Tab ===

function ElectionLiveTab({ streams }: { streams: any[] }) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {streams.length === 0 ? (
        <EmptyState icon="🔴" title="No election livestreams" desc="Citizens can go live from polling units during elections" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {streams.map((s: any) => (
            <div key={s.id} onClick={() => router.push(`/live?watch=${s.id}`)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition cursor-pointer">
              <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                <span className="text-4xl">📹</span>
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">🗳️ Election</div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">👁 {s.viewerCount || 0}</div>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {s.user?.displayName || 'Anonymous'}
                  {s.electionState && ` · ${s.electionState}`}
                  {s.electionPollingUnit && ` · PU: ${s.electionPollingUnit}`}
                  {s.startedAt && ` · Started ${new Date(s.startedAt).toLocaleTimeString()}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === Election Report Form ===

function ElectionReportForm({ election, onClose, onSubmitted }: { election: string; onClose: () => void; onSubmitted: () => void }) {
  const [type, setType] = useState('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [ward, setWard] = useState('');
  const [pollingUnit, setPollingUnit] = useState('');
  const [description, setDescription] = useState('');
  const [results, setResults] = useState<{ party: string; votes: string }[]>([{ party: '', votes: '' }]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addResultRow = () => setResults([...results, { party: '', votes: '' }]);
  const updateResult = (i: number, field: 'party' | 'votes', val: string) => {
    const copy = [...results];
    copy[i][field] = val;
    setResults(copy);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles([...files, ...Array.from(e.target.files)].slice(0, 5));
  };

  const uploadFiles = async (token: string): Promise<{ type: string; url: string }[]> => {
    const media: { type: string; url: string }[] = [];
    for (const file of files) {
      try {
        const fileType = file.type.startsWith('video') ? 'video' : 'image';
        const data = await api.upload.getPresignedUrl(token, fileType, file.type);
        await fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        media.push({ type: file.type, url: data.fileUrl });
      } catch {}
    }
    return media;
  };

  const handleSubmit = async () => {
    if (!type) { alert('Select a report type'); return; }
    if (!description && type !== 'result_upload') { alert('Add a description'); return; }

    const token = localStorage.getItem('ra_token');
    if (!token) { alert('Please log in first'); return; }

    setSubmitting(true);
    try {
      const media = files.length > 0 ? await uploadFiles(token) : [];
      const resultsObj: Record<string, number> = {};
      if (type === 'result_upload') {
        results.forEach(r => { if (r.party && r.votes) resultsObj[r.party] = Number(r.votes); });
      }

      await api.elections.submit(token, {
        type,
        electionName: election,
        state: state || undefined,
        lga: lga || undefined,
        ward: ward || undefined,
        pollingUnit: pollingUnit || undefined,
        description: description || undefined,
        results: Object.keys(resultsObj).length > 0 ? resultsObj : undefined,
        media: media.length > 0 ? media : undefined,
      });

      onSubmitted();
    } catch (err: any) {
      alert(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoLive = async () => {
    if (!state) { alert('Enter your state before going live'); return; }
    // Redirect to main live page with election params
    const params = new URLSearchParams({
      election,
      state,
      ...(pollingUnit && { pollingUnit }),
    });
    window.location.href = `/live?${params.toString()}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Submit Election Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Report Type */}
        <label className="text-sm font-semibold text-gray-700 block mb-2">What are you reporting?</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {REPORT_TYPES.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${type === t.key ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-gray-50'}`}
              style={type === t.key ? { backgroundColor: t.color } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Location fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600">State</label>
            <input value={state} onChange={e => setState(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" placeholder="e.g. Lagos" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">LGA</label>
            <input value={lga} onChange={e => setLga(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" placeholder="e.g. Ikeja" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Ward</label>
            <input value={ward} onChange={e => setWard(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" placeholder="e.g. Ward 5" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Polling Unit</label>
            <input value={pollingUnit} onChange={e => setPollingUnit(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" placeholder="e.g. PU 001" />
          </div>
        </div>

        {/* Description */}
        <label className="text-sm font-semibold text-gray-700 block mb-2">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none h-20 mb-4"
          placeholder="Describe what you witnessed..." />

        {/* Results (only for result_upload) */}
        {type === 'result_upload' && (
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-700 block mb-2">Vote Counts</label>
            {results.map((r, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={r.party} onChange={e => updateResult(i, 'party', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" placeholder="Party (e.g. APC)" />
                <input value={r.votes} onChange={e => updateResult(i, 'votes', e.target.value)} type="number"
                  className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" placeholder="Votes" />
              </div>
            ))}
            <button onClick={addResultRow} className="text-xs text-[#0F7B6C] font-semibold">+ Add party</button>
          </div>
        )}

        {/* Media Upload */}
        <label className="text-sm font-semibold text-gray-700 block mb-2">Photos / Videos (evidence)</label>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 text-sm border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#0F7B6C] hover:text-[#0F7B6C] transition">
            📎 Attach files
          </button>
          <span className="text-xs text-gray-400">{files.length}/5 files</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />
        {files.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {files.map((f, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                {f.type.startsWith('video') ? (
                  <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
                ) : (
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                )}
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3 text-sm font-bold text-white bg-[#0F7B6C] rounded-lg hover:bg-[#0B6E4F] disabled:opacity-50 transition">
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or</span></div>
        </div>

        <button onClick={handleGoLive} disabled={submitting}
          className="w-full py-3 text-sm font-bold text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 transition">
          🔴 Go Live from Polling Unit
        </button>
        <p className="text-xs text-orange-500 text-center mt-2">⚠️ Ensure livestreaming is permitted at your polling unit</p>

        {/* Broadcast removed — redirects to main live page */}
      </div>
    </div>
  );
}

