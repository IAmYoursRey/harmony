export type PerformanceMode = 'auto' | 'lite' | 'high';

export interface HardwareDiagnostics {
  cores: number;
  memoryGB: number | null;
  isMobile: boolean;
  isTouch: boolean;
  isTV: boolean;
  hasWebGL: boolean;
  hasWebGL2: boolean;
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
      isTV: false,
      hasWebGL: false,
      hasWebGL2: false,
      gpuRenderer: 'Node/SSR',
      isLowSpecDetected: false,
      reasons: [],
    };
  }

  const cores = navigator.hardwareConcurrency || 4;
  const memoryGB = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const tvRegex = /SmartTV|GoogleTV|AndroidTV|Android.*TV|AppleTV|HbbTV|NetCast|Viera|Roku|AFTT|AFTM|AFTB|Tizen|Web0S|WebOS|Large Screen|BRAVIA|MiTV|Hisense|Chromecast/i;
  const isTV = tvRegex.test(navigator.userAgent) || 
    (typeof window !== 'undefined' && window.screen && (window.screen.width >= 1920 && !isTouch && /Android/i.test(navigator.userAgent)));

  let hasWebGL = false;
  let hasWebGL2 = false;
  let gpuRenderer = 'Generic WebGL';
  let isLowEndGpu = false;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      hasWebGL2 = true;
      hasWebGL = true;
      const ext = gl2.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        gpuRenderer = gl2.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
      }
      const loseContext = gl2.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();
    } else {
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        hasWebGL = true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
        }
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) loseContext.loseContext();
      }
    }

    if (hasWebGL) {
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
        lower.includes('mali-g3') ||
        lower.includes('mali-g5') ||
        lower.includes('adreno (tm) 3') ||
        lower.includes('adreno (tm) 4') ||
        lower.includes('adreno (tm) 50') ||
        lower.includes('powervr');
    }
  } catch {
    hasWebGL = false;
    hasWebGL2 = false;
  }

  const reasons: string[] = [];
  if (isTV) reasons.push('Smart TV / Android TV terdeteksi');
  if (!hasWebGL) reasons.push('Tidak ada akselerasi hardware WebGL GPU');
  if (cores <= 4) reasons.push(`CPU terbatas (${cores} threads)`);
  if (memoryGB !== null && memoryGB <= 4) reasons.push(`RAM terbatas (${memoryGB} GB)`);
  if (isLowEndGpu) reasons.push('GPU terintegrasi / daya rendah terdeteksi');
  if (isMobile && (window.devicePixelRatio || 1) >= 2) reasons.push('Perangkat mobile high-DPI');

  const isLowSpecDetected = isTV || !hasWebGL || reasons.length > 0;

  cachedDiagnostics = {
    cores,
    memoryGB,
    isMobile,
    isTouch,
    isTV,
    hasWebGL,
    hasWebGL2,
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
      ? (diagnostics.isLowSpecDetected || diagnostics.isTV || !diagnostics.hasWebGL ? 'lite' : 'high')
      : (diagnostics.isTV || !diagnostics.hasWebGL ? 'lite' : mode);

  const rawDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  if (effectiveMode === 'lite' || diagnostics.isTV || !diagnostics.hasWebGL) {
    return {
      mode,
      effectiveMode: 'lite',
      isLowSpecDetected: true,
      openLayersPixelRatio: 1.0,
      cesiumResolutionScale: 0.75,
      cesiumRequestRenderMode: true,
      cesiumScreenSpaceError: 4.0,
      threeCanvasResolution: { width: 1024, height: 512 },
      threePixelRatio: 1.0,
      maxTilesLoading: 4,
      disableBackdropBlur: true,
      polygonRenderMode: 'image',
      windParticleCount: 120,
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

  isTV(): boolean {
    return this.getDiagnostics().isTV;
  }

  hasWebGL(): boolean {
    return this.getDiagnostics().hasWebGL;
  }

  canRun3D(): boolean {
    const diag = this.getDiagnostics();
    return diag.hasWebGL && !diag.isTV;
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
