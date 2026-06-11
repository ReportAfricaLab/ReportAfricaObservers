'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const StreamPlayer = dynamic(() => import('@/components/StreamPlayer'), { ssr: false });
const StreamBroadcaster = dynamic(() => import('@/components/StreamBroadcaster'), { ssr: false });

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001') + '/realtime';

type StreamStatus = 'idle' | 'preview' | 'live' | 'ended';
type Tab = 'go-live' | 'watching' | 'recordings';

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  createdAt: string;
}

export default function LivePage() {
  const router = useRouter();
  const { token, isAuthenticated, user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  const [tab, setTab] = useState<Tab>('watching');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [streamId, setStreamId] = useState('');
  const [form, setForm] = useState({ title: '', description: '', category: 'general', thumbnailUrl: '' });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [broadcastConfig, setBroadcastConfig] = useState<{ ingestEndpoint: string; streamKey: string } | null>(null);
  const [watchingStream, setWatchingStream] = useState<any>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {}
    );
    loadLiveStreams();
    loadRecordings();
  }, []);

  // Socket.IO connection
  useEffect(() => {
    if (!streamId || status !== 'live') return;

    let socket: any;
    let mounted = true;
    const authToken = token || localStorage.getItem('ra_token');

    import('socket.io-client').then(({ io }) => {
      if (!mounted) return;
      socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        auth: { token: authToken },
        forceNew: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join:stream', streamId);
      });

      // If already connected by the time listener attaches
      if (socket.connected) {
        socket.emit('join:stream', streamId);
      }

      socket.on('chat:new', (msg: ChatMessage) => {
        setChatMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      socket.on('viewers:update', (data: { count: number }) => {
        setViewerCount(data.count);
      });
    });

    return () => {
      mounted = false;
      if (socket) {
        socket.emit('leave:stream', streamId);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [streamId, status]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadLiveStreams = async () => {
    try {
      const streams = await api.livestream.getLive(user?.country || 'NG');
      setLiveStreams(streams || []);
    } catch {}
  };

  const loadRecordings = async () => {
    try {
      const recs = await api.livestream.getRecordings(user?.country || 'NG');
      setRecordings(recs || []);
    } catch {}
  };

  const startCamera = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setStatus('preview');
    setTab('go-live');
    setError('');
  };

  const goLive = async () => {
    if (!token || !form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      const stream = await api.livestream.create(token, { ...form, ...location });
      setStreamId(stream.id);
      setBroadcastConfig({
        ingestEndpoint: stream.ingestEndpoint,
        streamKey: stream.streamKeyValue || '',
      });
      await api.livestream.goLive(token, stream.id);
      setStatus('live');
    } catch (err: any) {
      setError(err.message || 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  const endStream = async () => {
    if (!token || !streamId) return;
    try { await api.livestream.end(token, streamId); } catch {}
    setStatus('ended');
    setChatMessages([]);
    setViewerCount(0);
    setBroadcastConfig(null);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const reset = () => {
    stopCamera();
    setStatus('idle');
    setStreamId('');
    setForm({ title: '', description: '', category: 'general', thumbnailUrl: '' });
    setChatMessages([]);
    setError('');
    setBroadcastConfig(null);
  };

  const sendChat = () => {
    if (!chatInput.trim() || !socketRef.current || !user) return;
    const text = chatInput.trim();
    socketRef.current.emit('chat:send', {
      roomId: `stream:${streamId}`,
      text,
      userId: user.id || 'anon',
      username: user.username || 'Anonymous',
    });
    setChatInput('');
  };

  const watchStream = async (s: any) => {
    setStreamId(s.id);
    setStatus('live');
    setTab('go-live');
    setChatMessages([]);
    // Get viewer token first, then set watchingStream
    const authToken = token || localStorage.getItem('ra_token');
    if (authToken) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await fetch(`${API_URL}/livestream/${s.id}/viewer-token`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (res.ok) {
          const data = await res.json();
          setWatchingStream({ ...s, viewerToken: data.token, wsUrl: data.wsUrl });
        } else {
          // Token might be expired, try refresh
          const refreshTk = localStorage.getItem('ra_refresh');
          if (refreshTk) {
            const refreshRes = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: refreshTk }) });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem('ra_token', refreshData.token);
              const retryRes = await fetch(`${API_URL}/livestream/${s.id}/viewer-token`, { headers: { Authorization: `Bearer ${refreshData.token}` } });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                setWatchingStream({ ...s, viewerToken: retryData.token, wsUrl: retryData.wsUrl });
                return;
              }
            }
          }
          setWatchingStream(s);
        }
      } catch {
        setWatchingStream(s);
      }
    } else {
      setWatchingStream(s);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Live Reporting</h1>
      <p className="text-gray-500 mb-6">Stream what&apos;s happening around you in real-time</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('watching')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${tab === 'watching' ? 'bg-[#0F7B6C] text-white' : 'bg-gray-100 text-gray-600'}`}>
          📺 Live Now
        </button>
        <button onClick={() => (status === 'idle' ? startCamera() : setTab('go-live'))}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${tab === 'go-live' ? 'bg-[#D92D20] text-white' : 'bg-gray-100 text-gray-600'}`}>
          🔴 Go Live
        </button>
        <button onClick={() => setTab('recordings')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${tab === 'recordings' ? 'bg-[#0F7B6C] text-white' : 'bg-gray-100 text-gray-600'}`}>
          🎬 Recordings
        </button>
      </div>

      {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* Go Live / Watch Tab */}
      {tab === 'go-live' && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Video Area */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
            {watchingStream ? (
              <div>
                <StreamPlayer wsUrl={watchingStream.wsUrl} token={watchingStream.viewerToken} title={watchingStream.title} />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded bg-red-600 text-white">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
                    </span>
                    <span className="text-xs text-gray-500">{watchingStream.viewerCount || 0} watching</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{watchingStream.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{watchingStream.user?.displayName || 'Anonymous'}</p>
                  <button onClick={() => { setWatchingStream(null); setStatus('idle'); setTab('watching'); }}
                    className="mt-3 text-xs text-[#0F7B6C] font-medium hover:underline">← Back to streams</button>
                </div>
              </div>
            ) : (
            <div>
              <StreamBroadcaster config={broadcastConfig || undefined} autoPreview={true} />
              <div className="p-4 space-y-3">
                {status === 'preview' && (
                  <>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="What's happening? (e.g. Protest at Lekki Toll Gate)"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D92D20] outline-none" />
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Thumbnail (optional)</label>
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !token) return;
                        try {
                          const { uploadUrl, fileUrl } = await api.upload.getPresignedUrl(token, 'image', file.type);
                          await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
                          setForm({ ...form, thumbnailUrl: fileUrl });
                        } catch {}
                      }} className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                      {form.thumbnailUrl && <p className="text-[10px] text-green-600 mt-1">✓ Thumbnail uploaded</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={goLive} disabled={loading}
                        className="flex-1 py-3 bg-[#D92D20] text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                        {loading ? 'Starting...' : '🔴 Go Live Now'}
                      </button>
                      <button onClick={reset} className="px-4 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                    </div>
                  </>
                )}
                {status === 'live' && (
                  <button onClick={endStream} className="w-full py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-700 transition">
                    ⏹ End Stream
                  </button>
                )}
                {status === 'ended' && (
                  <div className="text-center py-4">
                    <p className="text-gray-700 font-medium mb-3">Stream ended</p>
                    <button onClick={reset} className="px-6 py-2 bg-[#0F7B6C] text-white rounded-lg hover:bg-[#0B6E4F]">Start New Stream</button>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Chat Panel — responsive: below video on mobile, beside on desktop */}
          {status === 'live' && (
            <div className="w-full lg:w-80 bg-white rounded-xl border border-gray-200 flex flex-col">
              <div className="p-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Live Chat</h3>
                <p className="text-xs text-gray-500">{viewerCount} watching</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 h-[250px] lg:h-[400px]">
                {chatMessages.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No messages yet. Say something!</p>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className="font-semibold text-[#0F7B6C]">{msg.username}</span>{' '}
                    <span className="text-gray-700">{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#0F7B6C]" />
                  <button onClick={sendChat} className="px-3 py-2 bg-[#0F7B6C] text-white text-sm rounded-lg hover:bg-[#0B6E4F]">Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Watching Tab */}
      {tab === 'watching' && (
        <div>
          {liveStreams.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-4xl mb-3">📡</p>
              <p className="text-gray-700 font-medium">No live streams right now</p>
              <p className="text-gray-500 text-sm mt-1">Be the first to report what&apos;s happening</p>
              <button onClick={startCamera}
                className="mt-4 px-6 py-2 bg-[#D92D20] text-white text-sm font-semibold rounded-lg hover:bg-red-700">
                🔴 Go Live
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveStreams.map((s: any) => (
                <div key={s.id} onClick={() => watchStream(s)}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition cursor-pointer">
                  <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                    <span className="text-white text-3xl">📹</span>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">LIVE</div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">👁 {s.viewerCount || 0}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm">{s.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">by {s.user?.displayName || 'Anonymous'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recordings Tab */}
      {tab === 'recordings' && (
        <div>
          {recordings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-4xl mb-3">🎬</p>
              <p className="text-gray-700 font-medium">No recordings yet</p>
              <p className="text-gray-500 text-sm mt-1">Past livestreams will appear here</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recordings.map((r: any) => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
                  <div className="relative bg-gray-800 aspect-video flex items-center justify-center">
                    {r.thumbnailUrl ? (
                      <img src={r.thumbnailUrl} alt={r.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-3xl">▶️</span>
                    )}
                    {r.recordingUrl && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">▶ Replay</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm">{r.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      by {r.user?.displayName || 'Anonymous'} · {r.endedAt ? new Date(r.endedAt).toLocaleDateString() : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">👁 {r.peakViewers || 0} peak viewers</p>
                    {r.recordingUrl && r.recordingUrl.startsWith('http') && (
                      <video src={r.recordingUrl} controls className="w-full mt-3 rounded-lg" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
