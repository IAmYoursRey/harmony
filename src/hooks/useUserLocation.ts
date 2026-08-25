import { useState, useCallback } from "react";

export type LocationStatus = "idle" | "loading" | "success" | "error";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation tidak didukung browser ini.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus("success");
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Izin lokasi ditolak. Aktifkan izin di browser Anda.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Lokasi tidak tersedia. Coba lagi.");
            break;
          case err.TIMEOUT:
            setError("Waktu habis. Coba lagi.");
            break;
          default:
            setError("Gagal mendapatkan lokasi.");
        }
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const reset = useCallback(() => {
    setLocation(null);
    setStatus("idle");
    setError(null);
  }, []);

  return { location, status, error, detect, reset };
}
