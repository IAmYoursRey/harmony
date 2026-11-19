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

  const schoolLat = selection?.school?.lat ?? (currentUser ? (currentProfile as any)?.schoolLat : null);
  const schoolLng = selection?.school?.lng ?? (currentUser ? (currentProfile as any)?.schoolLng : null);
  const schoolName = selection?.school?.name || (currentUser ? (currentProfile as any)?.schoolName : null);
  const hasSchoolCoords = typeof schoolLat === 'number' && typeof schoolLng === 'number';

  useEffect(() => {
    if (hasSchoolCoords) return;
    let isMounted = true;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (!isMounted) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let info: PreciseLocationInfo | null = null;
          try {
            info = await preciseGeocodingService.reverseGeocode(lat, lng, pos.coords.accuracy);
          } catch {
            // non-fatal
          }
          if (!isMounted) return;
          setUserPreciseLocation(info);
          setDeviceCoords({ lat, lng });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    }
    return () => {
      isMounted = false;
    };
  }, [hasSchoolCoords]);

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

  const activeLat = hasSchoolCoords ? schoolLat : (deviceCoords?.lat ?? -6.2088);
  const activeLng = hasSchoolCoords ? schoolLng : (deviceCoords?.lng ?? 106.8456);
  const activeLocationName = hasSchoolCoords
    ? (schoolName || `Koordinat (${activeLat.toFixed(3)}°, ${activeLng.toFixed(3)}°)`)
    : (userPreciseLocation?.shortDisplay || (deviceCoords ? `Koordinat (${deviceCoords.lat.toFixed(3)}°, ${deviceCoords.lng.toFixed(3)}°)` : 'DKI Jakarta'));

  return (
    <div className="w-full h-full min-h-[calc(var(--vh-full)-3.5rem)] flex flex-col p-2 sm:p-4 bg-slate-100/70 dark:bg-slate-950">
      <GeospatialWeatherModal
        isOpen={true}
        asPage={true}
        initialDomain={domainParam || undefined}
        onClose={() => navigate('/app/maps')}
        lat={activeLat}
        lng={activeLng}
        locationName={activeLocationName}
        userPreciseLocation={hasSchoolCoords ? null : userPreciseLocation}
        mountains={mountains}
        schools={schools}
        earthquakes={earthquakes}
      />
    </div>
  );
};

export default GeospatialStudioView;
