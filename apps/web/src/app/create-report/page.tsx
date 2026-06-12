'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// Strip EXIF metadata by redrawing image through Canvas
async function stripExif(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name, { type: file.type }) : file);
      }, file.type, 0.92);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

const CATEGORIES = [
  { key: 'traffic', label: '🚗 Traffic' },
  { key: 'police_security', label: '🚨 Police & Security' },
  { key: 'government', label: '🏛️ Government' },
  { key: 'construction', label: '🏗️ Construction' },
  { key: 'election', label: '🗳️ Election' },
  { key: 'emergency', label: '🚨 Emergency' },
  { key: 'environmental', label: '🌍 Environmental' },
  { key: 'market_consumer', label: '🛒 Market & Consumer' },
  { key: 'gender_violence', label: '⚠️ Gender-Based Violence' },
  { key: 'health', label: '🏥 Health & Disease' },
  { key: 'corruption', label: '💸 Corruption & Bribery' },
  { key: 'utilities', label: '⚡ Utilities & Services' },
  { key: 'missing_persons', label: '🔍 Missing Persons' },
];

export default function CreateReportPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', category: '', severity: 'medium', isAnonymous: false });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string; type: string; blurredUrl?: string; blurring?: boolean; s3Key?: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setError('Location access needed to tag your report')
    );
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { setError('Please select a category'); return; }
    if (!location) { setError('Location is required'); return; }
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      // Generate SHA-256 hash of primary media for evidence integrity
      let contentHash = '';
      if (mediaFiles.length > 0) {
        const buffer = await mediaFiles[0].file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        contentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      // Upload media files
      const media: { type: string; url: string }[] = [];
      for (const m of mediaFiles) {
        try {
          const fileType = m.type.startsWith('video') ? 'video' : 'image';
          const { uploadUrl, fileUrl } = await api.upload.getPresignedUrl(token, fileType, m.file.type);
          await fetch(uploadUrl, { method: 'PUT', body: m.file, headers: { 'Content-Type': m.file.type } });
          media.push({ type: fileType, url: m.blurredUrl || fileUrl });
        } catch {}
      }
      await api.reports.create(token, { ...form, ...location, media, contentHash });
      router.push('/feed');
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleVoiceRecord = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Voice input not supported on this browser'); return; }

    if (recording) {
      setRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        update('description', form.description + (form.description ? ' ' : '') + transcript);
      }
    };

    recognition.onerror = () => { setRecording(false); setError('Voice recognition failed. Try again.'); };
    recognition.onend = () => { setRecording(false); };

    recognition.start();
    setRecording(true);

    // Auto-stop after 60 seconds
    setTimeout(() => { try { recognition.stop(); } catch {} }, 60000);
  };

  const handleMediaAdd = async (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(0, 5 - mediaFiles.length);
    const newFiles = await Promise.all(incoming.map(async (file) => {
      const stripped = await stripExif(file);
      return {
        file: stripped,
        preview: URL.createObjectURL(stripped),
        type: file.type,
        blurredUrl: undefined,
        blurring: false,
        s3Key: undefined,
      };
    }));
    setMediaFiles((prev) => [...prev, ...newFiles]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleBlurFaces = async (index: number) => {
    const media = mediaFiles[index];
    if (media.type.startsWith('video')) { alert('Video face blur coming soon!'); return; }
    if (!token) return;

    setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurring: true } : m));

    try {
      // Upload image to get S3 key
      const fileType = 'image';
      const { uploadUrl, fileUrl } = await api.upload.getPresignedUrl(token, fileType, media.file.type);
      await fetch(uploadUrl, { method: 'PUT', body: media.file, headers: { 'Content-Type': media.file.type } });
      const s3Key = fileUrl.split('.com/')[1] || fileUrl;

      // Call face blur API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${API_URL}/face-blur`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key }),
      });
      const data = await res.json();

      if (data.blurred) {
        setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurredUrl: data.blurredUrl, blurring: false, s3Key } : m));
        alert(`${data.facesDetected} face(s) detected and blurred!`);
      } else {
        setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurring: false, s3Key } : m));
        alert('No faces detected in this image.');
      }
    } catch {
      setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurring: false } : m));
      alert('Face blur failed. Try again.');
    }
  };

  const handleUndoBlur = (index: number) => {
    setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurredUrl: undefined } : m));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Report</h1>
      <p className="text-gray-500 mb-8">Report what&apos;s happening around you</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat.key} type="button" onClick={() => update('category', cat.key)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${form.category === cat.key ? 'bg-[#0F7B6C] text-white border-[#0F7B6C]' : 'border-gray-200 text-gray-600 hover:border-[#0F7B6C]'}`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} required maxLength={200}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F7B6C] focus:border-transparent outline-none"
            placeholder="Brief title of the incident" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} required maxLength={5000} rows={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F7B6C] focus:border-transparent outline-none resize-none"
            placeholder="Describe what is happening in detail..." />
          <button type="button" onClick={handleVoiceRecord}
            className={`mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${recording ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
            {recording ? '⏹️ Stop Listening' : '🎤 Voice to Text'}
          </button>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
          <div className="flex gap-2">
            {['low', 'medium', 'high', 'critical'].map((s) => (
              <button key={s} type="button" onClick={() => update('severity', s)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${form.severity === s ? 'bg-[#0F7B6C] text-white border-[#0F7B6C]' : 'border-gray-200 text-gray-500 hover:border-[#0F7B6C]'}`}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Media Capture */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos / Videos</label>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => cameraInputRef.current?.click()}
              className="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#0F7B6C] hover:text-[#0F7B6C] transition">
              📷 Take Photo/Video
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#0F7B6C] hover:text-[#0F7B6C] transition">
              📁 Choose File
            </button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden"
            onChange={(e) => handleMediaAdd(e.target.files)} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
            onChange={(e) => handleMediaAdd(e.target.files)} />
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {mediaFiles.map((m, i) => (
                <div key={i} className="relative">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {m.type.startsWith('video') ? (
                      <video src={m.preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.blurredUrl || m.preview} alt="" className="w-full h-full object-cover" />
                    )}
                    <button type="button" onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">✕</button>
                    {m.blurredUrl && (
                      <div className="absolute bottom-0 left-0 right-0 bg-green-600/85 text-white text-[10px] font-bold text-center py-0.5">✓ Blurred</div>
                    )}
                    {m.blurring && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-2xl">⏳</span>
                      </div>
                    )}
                  </div>
                  {!m.type.startsWith('video') && (
                    m.blurredUrl ? (
                      <button type="button" onClick={() => handleUndoBlur(i)}
                        className="w-full mt-1 py-1 text-[10px] font-semibold text-red-600 bg-red-50 rounded">
                        Undo Blur
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleBlurFaces(i)} disabled={m.blurring}
                        className="w-full mt-1 py-1 text-[10px] font-semibold text-purple-700 bg-purple-50 rounded disabled:opacity-50">
                        🔲 Blur Faces
                      </button>
                    )
                  )}
                  {m.type.startsWith('video') && (
                    <p className="text-[10px] text-gray-400 text-center mt-1">🎬 Video</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
          📍 {location ? `Location detected (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})` : 'Detecting location...'}
        </div>

        {/* Anonymous */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.isAnonymous} onChange={(e) => update('isAnonymous', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#0F7B6C] focus:ring-[#0F7B6C]" />
          <span className="text-sm text-gray-700">Report anonymously</span>
        </label>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-[#0F7B6C] text-white font-semibold rounded-lg hover:bg-[#0B6E4F] transition disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}
