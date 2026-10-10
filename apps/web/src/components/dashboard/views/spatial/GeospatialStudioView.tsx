import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GeospatialWeatherModal, StudioDomain } from './GeospatialWeatherModal';
import { bmkgService } from '@/services/bmkgService';
import { fetchSchools } from '@/services/schoolService';
import { useAuth } from '@/hooks/useAuth';
import { useSchool } from '@/hooks/useSchool';
import { preciseGeocodingService, PreciseLocationInfo } from '@/services/preciseGeocodingService';

export const GeospatialStudioView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const domainParam = (searchParams.get('tab') || searchParams.get('domain')) as StudioDomain | null;
  const { currentProfile, currentUser } = useAuth();
  const { selection } = useSchool();
  const [schools, setSchools] = useState<any[]>([]);
  const [mountains, setMountains] = useState<any[]>([]);
  const [earthquakes, setEarthquakes] = useState<any[]>([]);
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userPreciseLocation, setUserPreciseLocation] = useState<PreciseLocationInfo | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setDeviceCoords({ lat, lng });
          try {
            const info = await preciseGeocodingService.reverseGeocode(lat, lng, pos.coords.accuracy);
            setUserPreciseLocation(info);
          } catch {
            // non-fatal
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [autoGempa, terkini] = await Promise.all([
          bmkgService.getAutoGempa().catch(() => null),
          bmkgService.getGempaTerkini().catch(() => []),
        ]);
        if (!isMounted) return;
        const list: any[] = [];
        const aLat = autoGempa?.lat;
        const aLng = autoGempa?.lng;
        if (autoGempa && typeof aLat === 'number' && Number.isFinite(aLat) && typeof aLng === 'number' && Number.isFinite(aLng)) {
          list.push({
            place: `[BMKG InaTEWS Terkini] ${autoGempa.location || 'Indonesia'}`,
            lat: aLat,
            lng: aLng,
            mag: typeof autoGempa.magnitude === 'number' && Number.isFinite(autoGempa.magnitude) ? autoGempa.magnitude : null,
            depth: typeof autoGempa.depthKm === 'number' && Number.isFinite(autoGempa.depthKm) ? autoGempa.depthKm : null,
            felt: autoGempa.felt,
            shakemapUrl: autoGempa.shakemapUrl,
            time: `${autoGempa.date || ''} ${autoGempa.time || ''}`.trim(),
          });
        }
        if (Array.isArray(terkini)) {
          terkini.forEach((g: any) => {
            const gLat = g.lat ?? g.latitude;
            const gLng = g.lng ?? g.longitude;
            if (typeof gLat === 'number' && Number.isFinite(gLat) && typeof gLng === 'number' && Number.isFinite(gLng)) {
              list.push({
                place: g.location || 'Gempa Regional',
                lat: gLat,
                lng: gLng,
                mag: typeof g.magnitude === 'number' && Number.isFinite(g.magnitude) ? g.magnitude : (typeof g.mag === 'number' && Number.isFinite(g.mag) ? g.mag : null),
                depth: typeof g.depthKm === 'number' && Number.isFinite(g.depthKm) ? g.depthKm : (typeof g.depth === 'number' && Number.isFinite(g.depth) ? g.depth : null),
                time: `${g.date || ''} ${g.time || ''}`.trim(),
              });
            }
          });
        }
        setEarthquakes(list);
      } catch (err) {
        console.warn('Could not fetch live quakes for GeospatialStudioView:', err);
        if (isMounted) setEarthquakes([]);
      }

      // Fetch verified mountains catalog for spatial buffer analysis
      try {
        const mtnRes = await fetch('/data/mountains.json');
        if (mtnRes.ok) {
          const mtnData = await mtnRes.json();
          if (isMounted && Array.isArray(mtnData)) {
            setMountains(mtnData);
          }
        }
      } catch (err) {
        console.warn('Could not fetch mountains for GeospatialStudioView:', err);
      }

      // Fetch schools only if authenticated or for general spatial context
      try {
        const schoolList = await fetchSchools();
        if (isMounted && Array.isArray(schoolList)) {
          setSchools(schoolList);
        }
      } catch (err) {
        console.warn('Could not fetch schools for GeospatialStudioView:', err);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeLat = deviceCoords?.lat ?? (currentUser ? (selection?.school?.lat ?? (currentProfile as any)?.schoolLat) : null) ?? -6.2088;
  const activeLng = deviceCoords?.lng ?? (currentUser ? (selection?.school?.lng ?? (currentProfile as any)?.schoolLng) : null) ?? 106.8456;
  const activeLocationName = userPreciseLocation?.shortDisplay 
    || (currentUser ? (selection?.school?.name || (currentProfile as any)?.schoolName) : null)
    || (deviceCoords ? `Koordinat (${deviceCoords.lat.toFixed(3)}°, ${deviceCoords.lng.toFixed(3)}°)` : 'DKI Jakarta (Pusat)');

  return (
    <div className="w-full h-full min-h-[calc(100vh-3.5rem)] flex flex-col p-2 sm:p-4 bg-slate-100/70 dark:bg-slate-950">
      <GeospatialWeatherModal
        isOpen={true}
        asPage={true}
        initialDomain={domainParam || undefined}
        onClose={() => navigate('/app/maps')}
        lat={activeLat}
        lng={activeLng}
        locationName={activeLocationName}
        userPreciseLocation={userPreciseLocation}
        mountains={mountains}
        schools={schools}
        earthquakes={earthquakes}
      />
    </div>
  );
};

export default GeospatialStudioView;
