export type DigitalTwinAssetKey =
  | "characterGirl"
  | "characterBoy"
  | "floorCampus"
  | "pavingCampus"
  | "grassCampus"
  | "roadCampus"
  | "hazardFire"
  | "hazardRubble";

const ASSET_URLS: Record<DigitalTwinAssetKey, string> = {
  characterGirl: "/digital-twin/character-girl.png",
  characterBoy: "/digital-twin/character-boy.png",
  floorCampus: "/digital-twin/floor-campus.png",
  pavingCampus: "/digital-twin/paving-campus.png",
  grassCampus: "/digital-twin/grass-campus.png",
  roadCampus: "/digital-twin/road-campus.png",
  hazardFire: "/digital-twin/hazard-fire.png",
  hazardRubble: "/digital-twin/hazard-rubble.png",
};

const imageCache = new Map<DigitalTwinAssetKey, HTMLImageElement>();
const readyListeners = new Set<() => void>();
let preloadStarted = false;

function notifyReady() {
  for (const listener of readyListeners) {
    try {
      listener();
    } catch {
      // Ignore listener errors during unmount races
    }
  }
}

export function preloadDigitalTwinAssets() {
  if (preloadStarted || typeof window === "undefined" || typeof Image === "undefined") {
    return;
  }
  preloadStarted = true;

  (Object.keys(ASSET_URLS) as DigitalTwinAssetKey[]).forEach((key) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => notifyReady();
    img.src = ASSET_URLS[key];
    imageCache.set(key, img);
  });
}

export function onDigitalTwinAssetsLoaded(listener: () => void): () => void {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
}

export function getDigitalTwinAssetImage(
  key: DigitalTwinAssetKey,
): HTMLImageElement | null {
  preloadDigitalTwinAssets();
  const img = imageCache.get(key);
  if (!img || !img.complete || img.naturalWidth <= 0) {
    return null;
  }
  return img;
}

export function getDigitalTwinAssetUrl(key: DigitalTwinAssetKey): string {
  return ASSET_URLS[key];
}

