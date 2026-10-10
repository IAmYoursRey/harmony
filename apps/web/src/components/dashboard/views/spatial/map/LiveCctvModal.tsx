import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, X, RefreshCw, Radio, Compass, ShieldCheck, Activity, 
  ChevronLeft, ChevronRight, ExternalLink, Play, Pause, Video, Globe,
  Volume2, VolumeX, Maximize2
} from 'lucide-react';
import Hls from 'hls.js';
import { trafficCctvService, type TrafficCctvCamera } from '@/services/trafficCctvService';

interface LiveCctvModalProps {
  camera: TrafficCctvCamera | null;
  onClose: () => void;
  onSelectCamera?: (camera: TrafficCctvCamera) => void;
}

export const LiveCctvModal: React.FC<LiveCctvModalProps> = ({ camera, onClose, onSelectCamera }) => {
  // Realtime ticking digital clock (every 1000ms)
  const [liveClock, setLiveClock] = useState<string>(() => 
    new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [frameCount, setFrameCount] = useState(1);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(2);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [snapshotError, setSnapshotError] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [connectionErrorText, setConnectionErrorText] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [streamMode, setStreamMode] = useState<'stream' | 'snapshot'>('stream');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Digital clock interval: ticks every 1 second continuously
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(
        new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClose = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const allCameras = trafficCctvService.getAllCameras();
  const currentIndex = camera ? allCameras.findIndex((c) => c.id === camera.id) : -1;

  const handleNext = useCallback(() => {
    if (allCameras.length === 0) return;
    const nextIdx = (currentIndex + 1) % allCameras.length;
    const nextCam = allCameras[nextIdx];
    setStreamError(false);
    setSnapshotError(false);
    setIsPlaying(false);
    setIsConnecting(true);
    setConnectionErrorText('');
    if (onSelectCamera) onSelectCamera(nextCam);
  }, [allCameras, currentIndex, onSelectCamera]);

  const handlePrev = useCallback(() => {
    if (allCameras.length === 0) return;
    const prevIdx = (currentIndex - 1 + allCameras.length) % allCameras.length;
    const prevCam = allCameras[prevIdx];
    setStreamError(false);
    setSnapshotError(false);
    setIsPlaying(false);
    setIsConnecting(true);
    setConnectionErrorText('');
    if (onSelectCamera) onSelectCamera(prevCam);
  }, [allCameras, currentIndex, onSelectCamera]);

  // Jump to a guaranteed 24/7 active streaming video camera (prioritizing same city)
  const handleSwitchToVerifiedLive = useCallback(() => {
    if (!allCameras.length) return;

    // Priority 1: Verified active camera in the SAME city
    let verified = allCameras.find(
      (c) => c.city === camera?.city &&
             c.id !== camera?.id &&
             (c.streamType === 'youtube' || 
              (c.streamType === 'hls' && (
                c.id.startsWith('pantausemar') || 
                c.id.startsWith('pelindung') || 
                c.id.startsWith('sits') || 
                c.id.startsWith('jogja') || 
                c.id.startsWith('bali')
              )))
    );

    // Priority 2: Any active non-courtroom camera in the same city
    if (!verified) {
      verified = allCameras.find(
        (c) => c.city === camera?.city &&
               c.id !== camera?.id &&
               !c.id.includes('badilag') &&
               !c.id.startsWith('binamarga-tol-semarang')
      );
    }

    // Priority 3: Nationwide guaranteed 24/7 stream
    if (!verified) {
      verified = allCameras.find(
        (c) => (c.streamType === 'youtube' || (c.streamType === 'hls' && c.id.startsWith('pantausemar'))) &&
               c.id !== camera?.id
      );
    }

    if (verified && onSelectCamera) {
      setStreamError(false);
      setSnapshotError(false);
      setIsPlaying(false);
      setIsConnecting(true);
      setConnectionErrorText('');
      onSelectCamera(verified);
    }
  }, [allCameras, camera, onSelectCamera]);

  // When camera changes, prioritize live video stream over static snapshot
  useEffect(() => {
    if (!camera) return;
    setStreamError(false);
    setSnapshotError(false);
    setIsPlaying(false);
    setIsConnecting(true);
    setConnectionErrorText('');
    setFrameCount(1);

    if (camera.streamType === 'hls' || camera.streamType === 'youtube' || camera.streamType === 'video' || camera.streamType === 'iframe') {
      setStreamMode('stream');
    } else {
      setStreamMode('snapshot');
    }
  }, [camera]);

  // Setup HLS video stream when streamMode === 'stream'
  useEffect(() => {
    if (!camera) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (camera.streamType === 'hls' && streamMode === 'stream') {
      const video = videoRef.current;
      if (!video) return;

      const streamUrl = camera.streamUrl;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 15,
          maxBufferLength: 8,
          manifestLoadingTimeOut: 4500,
          manifestLoadingMaxRetry: 1,
          manifestLoadingRetryDelay: 800,
          fragLoadingTimeOut: 6000,
          fragLoadingMaxRetry: 2,
          fragLoadingRetryDelay: 500,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsConnecting(false);
          video.play().then(() => {
            setIsPlaying(true);
            setStreamError(false);
          }).catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          });
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          setIsConnecting(false);
          setIsPlaying(true);
          setStreamError(false);
        });

        let networkErrorCount = 0;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                networkErrorCount++;
                if (networkErrorCount > 1) {
                  hls.destroy();
                  setStreamError(true);
                  setIsPlaying(false);
                  setIsConnecting(false);
                  setConnectionErrorText('Penyedia CCTV upstream tidak merespons (502 / Gangguan Server Daerah)');
                } else {
                  hls.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setStreamError(true);
                setIsPlaying(false);
                setIsConnecting(false);
                setConnectionErrorText('Format video stream tidak dapat didekode');
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsConnecting(false);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
      } else {
        setStreamError(true);
        setIsConnecting(false);
        setConnectionErrorText('Browser tidak mendukung pemutar HLS');
      }

      const watchdog = setTimeout(() => {
        setIsConnecting(false);
      }, 6000);

      return () => {
        clearTimeout(watchdog);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }
  }, [camera, streamMode]);

  // Auto-refresh timer for snapshot mode
  useEffect(() => {
    if (!camera || autoRefreshSec === 0 || streamMode !== 'snapshot') return;

    const interval = setInterval(() => {
      setFrameCount((prev) => prev + 1);
    }, autoRefreshSec * 1000);

    return () => clearInterval(interval);
  }, [camera, autoRefreshSec, streamMode]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setSnapshotError(false);
    setFrameCount((prev) => prev + 1);

    if (camera?.streamType === 'hls' && hlsRef.current && streamMode === 'stream') {
      hlsRef.current.startLoad();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Safe early exit AFTER all hooks have been declared
  if (!camera) return null;

  const currentCamera = camera;
  const isYouTube = currentCamera.streamType === 'youtube' && Boolean(currentCamera.youtubeVideoId);
  const isIframe = currentCamera.streamType === 'iframe';
  const isHls = currentCamera.streamType === 'hls';

  // Snapshot URL: loads from our direct backend proxy with no CORS issues
  const snapshotSrc = `/api/spatial/traffic/cctv-thumbnail?id=${encodeURIComponent(currentCamera.id)}&v=${frameCount}`;

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl text-white flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 shrink-0 border border-cyan-500/30">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">
                  {currentCamera.name}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9.5px] font-bold text-emerald-300 border border-emerald-500/40 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isYouTube ? 'YOUTUBE LIVE' : isIframe ? 'IFRAME LIVE' : streamMode === 'stream' && isPlaying ? 'LIVE VIDEO HLS' : 'LIVE SNAPSHOT'}
                </span>
                <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {currentCamera.city}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                {currentCamera.road} • {currentCamera.authority}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Carousel Previous / Next */}
            <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700 text-slate-300">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Kamera Sebelumnya"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[9.5px] font-mono px-1.5 text-slate-300 font-semibold">
                {currentIndex >= 0 ? `${currentIndex + 1}/${allCameras.length}` : allCameras.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Kamera Selanjutnya"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Perbarui Gambar Kamera"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer hidden sm:inline-flex"
              title="Layar Penuh"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer relative z-10"
              aria-label="Tutup CCTV"
              title="Tutup CCTV (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewport: Clean, 100% Unobstructed Camera View */}
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none shrink-0">
          {/* 1. YouTube Live Embed */}
          {isYouTube && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${currentCamera.youtubeVideoId}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&playsinline=1`}
              title={currentCamera.name}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}

          {/* 2. Iframe Stream (Badilag / External Portal) */}
          {isIframe && streamMode === 'stream' && !streamError && (
            <div className="relative w-full h-full">
              <iframe
                src={currentCamera.streamUrl}
                title={currentCamera.name}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onError={() => {
                  setStreamError(true);
                  setStreamMode('snapshot');
                }}
              />
              <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-auto bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center justify-between text-[11px] gap-2 shadow-lg">
                <span className="text-slate-300 truncate text-[10.5px]">
                  <span className="text-amber-400 font-bold">ℹ️ Info WebRTC Instansi:</span> Jika siaran standby (layar hitam di luar jam sidang), alihkan ke kamera jalan/tol.
                </span>
                <button
                  type="button"
                  onClick={handleSwitchToVerifiedLive}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Beralih ke kamera jalan tol / arteri yang aktif 24 jam"
                >
                  <Video className="w-3 h-3" />
                  <span>Kamera Video 24 Jam</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Live HLS Video Player (When active and playing) */}
          {isHls && streamMode === 'stream' && !streamError && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                playsInline
                autoPlay
                muted={isMuted}
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                  setStreamError(true);
                  setIsPlaying(false);
                  setIsConnecting(false);
                  setConnectionErrorText('Pemutar video tidak dapat memuat siaran upstream');
                }}
              />

              {/* Connecting Overlay (removes buffering ambiguity) */}
              {isConnecting && !isPlaying && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-10 pointer-events-none transition-opacity duration-200">
                  <div className="relative flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                    <Video className="w-5 h-5 text-cyan-400 absolute" />
                  </div>
                  <span className="text-sm font-semibold text-slate-100 tracking-wide">Menghubungkan Siaran Langsung...</span>
                  <span className="text-xs text-slate-400 mt-1">Mengunduh feed HLS dari server Dishub / Pengelola Jalan</span>
                </div>
              )}
            </div>
          )}

          {/* 4. Stream Error Recovery Screen (When HLS stream fails) */}
          {isHls && streamMode === 'stream' && streamError && (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
                <Camera className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-200">{currentCamera.name}</h4>
                <p className="text-xs text-amber-300/90 mt-1 max-w-md font-medium">
                  {connectionErrorText || 'Koneksi ke siaran video server daerah terputus atau sedang offline.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                  Sistem mendeteksi kamera alternatif di wilayah yang sama yang aktif dan lancar.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSwitchToVerifiedLive}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Beralih ke Kamera Aktif ({currentCamera.city || 'Regional'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStreamMode('snapshot');
                    setStreamError(false);
                    setSnapshotError(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Snapshot Foto</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Live Snapshot Image (Crisp, Clean, Auto-Updating) */}
          {(streamMode === 'snapshot' || (!isYouTube && !isIframe && !isHls)) && !snapshotError && (
            <img
              key={`cctv-img-${currentCamera.id}-${frameCount}`}
              src={snapshotSrc}
              alt={currentCamera.name}
              className="w-full h-full object-contain bg-black"
              onError={() => setSnapshotError(true)}
            />
          )}

          {/* 6. Standby Fallback only if snapshot completely fails */}
          {snapshotError && (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Camera className="w-10 h-10 text-slate-500 animate-pulse" />
              <div>
                <h4 className="font-bold text-sm text-slate-200">{currentCamera.name}</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Sensor siaran kamera sedang melakukan sinkronisasi dengan server daerah.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSwitchToVerifiedLive}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Buka Kamera Video 24 Jam</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Muat Ulang</span>
                </button>
              </div>
            </div>
          )}

          {/* Realtime Live Digital Clock Overlay (Ticks every second) */}
          <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10.5px] font-mono text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{liveClock} WIB</span>
          </div>
        </div>

        {/* Bottom Control & Status Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-300 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {/* Mode Selector for HLS cameras */}
            {isHls && (
              <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setStreamMode('stream');
                    setStreamError(false);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition-colors ${
                    streamMode === 'stream' && !streamError ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Video HLS (Live)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStreamMode('snapshot');
                    setStreamError(false);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition-colors ${
                    streamMode === 'snapshot' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Snapshot Realtime
                </button>
              </div>
            )}

            {/* Mode Selector for Iframe cameras */}
            {isIframe && (
              <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setStreamMode('stream');
                    setStreamError(false);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition-colors ${
                    streamMode === 'stream' && !streamError ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Iframe WebRTC
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStreamMode('snapshot');
                    setStreamError(false);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition-colors ${
                    streamMode === 'snapshot' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Snapshot Realtime
                </button>
              </div>
            )}

            {/* Quick Live Video Switcher button */}
            <button
              type="button"
              onClick={handleSwitchToVerifiedLive}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              title="Pindah langsung ke kamera video jalan tol / arteri yang aktif 24 jam"
            >
              <Video className="w-3.5 h-3.5 text-indigo-200" />
              <span>Video 24 Jam</span>
            </button>

            {/* Audio toggle when playing video */}
            {isHls && streamMode === 'stream' && isPlaying && (
              <button
                type="button"
                onClick={() => {
                  const video = videoRef.current;
                  if (video) {
                    video.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1 cursor-pointer"
                title={isMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Muted' : 'Sound On'}</span>
              </button>
            )}

            {/* Refresh Interval Selector */}
            {streamMode === 'snapshot' && !isYouTube && (
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px]">Interval:</span>
                {[1, 2, 5].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setAutoRefreshSec(sec)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      autoRefreshSec === sec ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAutoRefreshSec(autoRefreshSec === 0 ? 2 : 0)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer flex items-center gap-0.5 ${
                    autoRefreshSec === 0 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title={autoRefreshSec === 0 ? 'Lanjutkan Auto-Refresh' : 'Jeda Auto-Refresh'}
                >
                  {autoRefreshSec === 0 ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                  <span>{autoRefreshSec === 0 ? 'Jeda' : 'Auto'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentCamera.portalUrl && (
              <a
                href={currentCamera.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
                title="Buka portal penyedia resmi"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {currentCamera.authority.includes('Bina Marga') ? 'Portal Bina Marga Non-Tol' : 'Buka di CCTV Nusantara'}
                </span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Telemetry Footer Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-950 border-t border-slate-800 text-[11px]">
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Otoritas / Pengelola</span>
            <div className="font-semibold text-white flex items-center gap-1 mt-0.5 truncate">
              <ShieldCheck className="h-3 w-3 text-cyan-400 shrink-0" />
              <span className="truncate" title={currentCamera.authority}>{currentCamera.authority}</span>
            </div>
          </div>

          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Koordinat Geografis</span>
            <div className="font-mono font-semibold text-white mt-0.5 truncate flex items-center gap-1">
              <Compass className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>{currentCamera.lat.toFixed(4)}°, {currentCamera.lng.toFixed(4)}°</span>
            </div>
          </div>

          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Status Aliran</span>
            <div className="font-semibold text-emerald-400 mt-0.5 truncate flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentCamera.status} • {streamMode === 'stream' && isPlaying ? '30 FPS Video' : 'Snapshot Realtime'}</span>
            </div>
          </div>

          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[9.5px]">Kondisi Lokasi</span>
            <div className="font-semibold text-amber-300 mt-0.5 truncate flex items-center gap-1">
              <Activity className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="truncate" title={currentCamera.statusText}>{currentCamera.statusText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
