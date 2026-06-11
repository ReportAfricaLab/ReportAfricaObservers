'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, LocalParticipant, Track, createLocalTracks } from 'livekit-client';

interface StreamBroadcasterProps {
  config?: { ingestEndpoint: string; streamKey: string };
  onStatusChange?: (status: 'idle' | 'preview' | 'live' | 'error') => void;
  autoPreview?: boolean;
}

export default function StreamBroadcaster({ config, onStatusChange, autoPreview = true }: StreamBroadcasterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<'idle' | 'preview' | 'live' | 'error'>('idle');
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  const updateStatus = useCallback((s: 'idle' | 'preview' | 'live' | 'error') => {
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  const startPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'environment' },
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      updateStatus('preview');
      setError('');
    } catch {
      setError('Camera access denied. Please allow camera and microphone.');
      updateStatus('error');
    }
  }, [updateStatus]);

  useEffect(() => {
    if (autoPreview) startPreview();
    return () => {
      if (videoRef.current?.srcObject && !roomRef.current) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Auto-start broadcast when config is provided
  useEffect(() => {
    if (config && cameraReady && status === 'preview') {
      startBroadcast();
    }
  }, [config, cameraReady]);

  const startBroadcast = async () => {
    if (!config) { setError('No stream configuration'); return; }

    try {
      const room = new Room();
      roomRef.current = room;

      // Connect to LiveKit
      await room.connect(config.ingestEndpoint, config.streamKey);

      // Publish camera and mic
      const tracks = await createLocalTracks({ audio: true, video: { resolution: { width: 1280, height: 720 } } });
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
      }

      // Stop the preview video (LiveKit handles it now)
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }

      // Attach local video to preview
      const videoTrack = room.localParticipant.getTrackPublications().find(
        (p: any) => p.track?.kind === Track.Kind.Video
      );
      if (videoTrack?.track && videoRef.current) {
        videoTrack.track.attach(videoRef.current);
      }

      updateStatus('live');
      setError('');
    } catch (err: any) {
      console.error('Broadcast error:', err);
      setError(err.message || 'Failed to start broadcast');
      updateStatus('error');
    }
  };

  const stopBroadcast = async () => {
    try {
      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
      }
    } catch {}
    updateStatus('preview');
    startPreview();
  };

  const stopAll = () => {
    try { roomRef.current?.disconnect(); } catch {}
    roomRef.current = null;
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    updateStatus('idle');
  };

  return (
    <div className="relative bg-black rounded-xl overflow-hidden">
      <div className="aspect-video">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {!cameraReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white text-sm">Starting camera...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center px-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={startPreview} className="mt-3 px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20">
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {status === 'live' && (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
        </div>
      )}
      {status === 'preview' && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
          PREVIEW
        </div>
      )}

      {cameraReady && (
        <div className="absolute bottom-3 right-3">
          {status === 'preview' && config && (
            <button onClick={startBroadcast} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-full hover:bg-red-700">
              GO LIVE
            </button>
          )}
          {status === 'live' && (
            <button onClick={stopBroadcast} className="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-full hover:bg-gray-700">
              END
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { type StreamBroadcasterProps };
