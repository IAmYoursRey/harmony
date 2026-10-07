export type PerformanceMode = 'auto' | 'lite' | 'high';

export interface HardwareDiagnostics {
  cores: number;
  memoryGB: number | null;
  isMobile: boolean;
  isTouch: boolean;
  gpuRenderer: string;
  isLowSpecDetected: boolean;
  reasons: string[];
}

export interface PerformanceProfile {
  mode: PerformanceMode;
  effectiveMode: 'lite' | 'high';
  isLowSpecDetected: boolean;
  openLayersPixelRatio: number;
  cesiumResolutionScale: number;
  cesiumRequestRenderMode: boolean;
  cesiumScreenSpaceError: number;
  threeCanvasResolution: { width: number; height: number };
  threePixelRatio: number;
  maxTilesLoading: number;
  disableBackdropBlur: boolean;
  polygonRenderMode: 'image' | 'vector';
  windParticleCount: number;
  diagnostics: HardwareDiagnostics;
}

const STORAGE_KEY = 'harmony_perf_mode';

let cachedDiagnostics: HardwareDiagnostics | null = null;
let currentMode: PerformanceMode = 'auto';
const listeners = new Set<(profile: PerformanceProfile) => void>();

function detectHardware(): HardwareDiagnostics {
  if (cachedDiagnostics) return cachedDiagnostics;

  if (typeof window === 'undefined') {
    return {
      cores: 4,
      memoryGB: 8,
      isMobile: false,
      isTouch: false,
      gpuRenderer: 'Node/SSR',
      isLowSpecDetected: false,
      reasons: [],
    };
  }

  const cores = navigator.hardwareConcurrency || 4;
  const memoryGB = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  let gpuRenderer = 'Generic WebGL';
  let isLowEndGpu = false;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
      }
      const lower = gpuRenderer.toLowerCase();
      isLowEndGpu =
        lower.includes('swiftshader') ||
        lower.includes('llvmpipe') ||
        lower.includes('software') ||
        lower.includes('basic render') ||
        lower.includes('intel hd graphics') ||
        lower.includes('intel uhd') ||
        lower.includes('mali-4') ||
        lower.includes('mali-t') ||
        lower.includes('adreno (tm) 3') ||
        lower.includes('adreno (tm) 4') ||
        lower.includes('adreno (tm) 50') ||
        lower.includes('powervr');

      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();
    }
  } catch {
    // Fail silently when WebGL inspection is restricted
  }

  const reasons: string[] = [];
  if (cores <= 4) reasons.push(`CPU terbatas (${cores} threads)`);
  if (memoryGB !== null && memoryGB <= 4) reasons.push(`RAM terbatas (${memoryGB} GB)`);
  if (isLowEndGpu) reasons.push('GPU terintegrasi / daya rendah terdeteksi');
  if (isMobile && (window.devicePixelRatio || 1) >= 2) reasons.push('Perangkat mobile high-DPI');

  const isLowSpecDetected = reasons.length > 0;

  cachedDiagnostics = {
    cores,
    memoryGB,
    isMobile,
    isTouch,
    gpuRenderer,
    isLowSpecDetected,
    reasons,
  };

  return cachedDiagnostics;
}

function computeProfile(mode: PerformanceMode): PerformanceProfile {
  const diagnostics = detectHardware();
  const effectiveMode: 'lite' | 'high' =
    mode === 'auto'
      ? (diagnostics.isLowSpecDetected ? 'lite' : 'high')
      : mode;

  const rawDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  if (effectiveMode === 'lite') {
    return {
      mode,
      effectiveMode,
      isLowSpecDetected: diagnostics.isLowSpecDetected,
      openLayersPixelRatio: 1.0,
      cesiumResolutionScale: 0.9,
      cesiumRequestRenderMode: true,
      cesiumScreenSpaceError: 3.5,
      threeCanvasResolution: { width: 2048, height: 1024 },
      threePixelRatio: 1.0,
      maxTilesLoading: 6,
      disableBackdropBlur: true,
      polygonRenderMode: 'image',
      windParticleCount: 180,
      diagnostics,
    };
  }

  return {
    mode,
    effectiveMode,
    isLowSpecDetected: diagnostics.isLowSpecDetected,
    openLayersPixelRatio: Math.min(rawDpr, 1.35),
    cesiumResolutionScale: 1.0,
    cesiumRequestRenderMode: true,
    cesiumScreenSpaceError: 2.0,
    threeCanvasResolution: { width: 4096, height: 2048 },
    threePixelRatio: Math.min(rawDpr, 1.5),
    maxTilesLoading: 12,
    disableBackdropBlur: false,
    polygonRenderMode: 'image',
    windParticleCount: 350,
    diagnostics,
  };
}

function applyGlobalStyles(profile: PerformanceProfile) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (profile.disableBackdropBlur) {
    root.classList.add('harmony-perf-lite');
  } else {
    root.classList.remove('harmony-perf-lite');
  }
}

export class HardwarePerformanceService {
  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY) as PerformanceMode | null;
        if (saved && (saved === 'auto' || saved === 'lite' || saved === 'high')) {
          currentMode = saved;
        }
      } catch {
        // Fallback to auto
      }
      applyGlobalStyles(this.getProfile());
    }
  }

  getDiagnostics(): HardwareDiagnostics {
    return detectHardware();
  }

  getMode(): PerformanceMode {
    return currentMode;
  }

  setMode(mode: PerformanceMode): void {
    currentMode = mode;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch {
      // Ignored
    }

    const profile = this.getProfile();
    applyGlobalStyles(profile);
    listeners.forEach((listener) => listener(profile));
  }

  getProfile(): PerformanceProfile {
    return computeProfile(currentMode);
  }

  getEffectivePixelRatio(): number {
    return this.getProfile().openLayersPixelRatio;
  }

  subscribe(listener: (profile: PerformanceProfile) => void): () => void {
    listeners.add(listener);
    listener(this.getProfile());
    return () => {
      listeners.delete(listener);
    };
  }
}

export const hardwarePerformanceService = new HardwarePerformanceService();
