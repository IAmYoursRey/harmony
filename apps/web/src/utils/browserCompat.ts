export interface TimeoutSignalHandle {
  signal: AbortSignal;
  cleanup: () => void;
}

export function createTimeoutSignal(ms: number): TimeoutSignalHandle {
  if (typeof AbortSignal !== "undefined" && typeof (AbortSignal as { timeout?: unknown }).timeout === "function") {
    return {
      signal: (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(ms),
      cleanup: () => {},
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    const timeoutErr = typeof DOMException !== "undefined"
      ? new DOMException("The operation timed out.", "TimeoutError")
      : new Error("The operation timed out.");
    controller.abort(timeoutErr);
  }, ms);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

function cloneFallback<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }
  if (seen.has(value)) {
    return seen.get(value) as T;
  }
  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (let i = 0; i < value.length; i += 1) {
      copy[i] = cloneFallback(value[i], seen);
    }
    return copy as unknown as T;
  }
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    value.forEach((v, k) => {
      copy.set(cloneFallback(k, seen), cloneFallback(v, seen));
    });
    return copy as unknown as T;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    value.forEach((v) => {
      copy.add(cloneFallback(v, seen));
    });
    return copy as unknown as T;
  }

  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) {
    copy[key] = cloneFallback((value as Record<string, unknown>)[key], seen);
  }
  return copy as T;
}

export function safeStructuredClone<T>(value: T): T {
  if (typeof globalThis !== "undefined" && typeof (globalThis as { structuredClone?: unknown }).structuredClone === "function") {
    try {
      return (globalThis as unknown as { structuredClone: <U>(v: U) => U }).structuredClone(value);
    } catch {
      return cloneFallback(value);
    }
  }
  return cloneFallback(value);
}

export async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (typeof text !== "string") return false;

  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback (handles HTTP LAN origins and iOS/Safari permission blocks)
    }
  }

  if (typeof document === "undefined" || !document.body) {
    return false;
  }

  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.fontSize = "16px";
    document.body.appendChild(textarea);

    const selection = document.getSelection?.();
    const prevRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const ok = typeof document.execCommand === "function" ? document.execCommand("copy") : false;

    if (selection) {
      selection.removeAllRanges();
      if (prevRange) selection.addRange(prevRange);
    }
    return ok;
  } catch {
    return false;
  } finally {
    if (textarea && textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

export async function safeToggleFullscreen(
  container: HTMLElement | null,
  videoEl?: HTMLVideoElement | null,
): Promise<boolean> {
  if (typeof document === "undefined") return false;

  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  const activeFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;

  if (activeFullscreen) {
    try {
      if (typeof doc.exitFullscreen === "function") {
        await doc.exitFullscreen();
        return true;
      }
      if (typeof doc.webkitExitFullscreen === "function") {
        await doc.webkitExitFullscreen();
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  if (container) {
    const el = container as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    try {
      if (typeof el.requestFullscreen === "function") {
        await el.requestFullscreen();
        return true;
      }
      if (typeof el.webkitRequestFullscreen === "function") {
        await el.webkitRequestFullscreen();
        return true;
      }
    } catch {
      // Fall through to iOS <video> fullscreen when container fullscreen is unsupported
    }
  }

  const video = videoEl as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null | undefined;
  if (video && typeof video.webkitEnterFullscreen === "function") {
    try {
      video.webkitEnterFullscreen();
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function safeScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY ?? window.pageYOffset ?? 0;
}

