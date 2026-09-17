import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GeospatialWeatherModal } from './GeospatialWeatherModal';
import { bmkgService } from '@/services/bmkgService';
import { fetchSchools } from '@/services/schoolService';

export const GeospatialStudioView: React.FC = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<any[]>([]);
  const [earthquakes, setEarthquakes] = useState<any[]>([
    { place: 'Selatan Jawa Timur (Samudra Hindia)', lat: -8.82, lng: 112.54, mag: 4.8, depth: 24 },
    { place: 'Selat Sunda (Banten)', lat: -6.42, lng: 105.18, mag: 5.1, depth: 10 },
    { place: 'Palu - Sigi Sulawesi Tengah', lat: -1.02, lng: 119.88, mag: 4.4, depth: 15 },
    { place: 'Barat Daya Malang Jawa Timur', lat: -8.95, lng: 112.48, mag: 4.2, depth: 32 },
  ]);

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
        if (autoGempa && autoGempa.lat && autoGempa.lng) {
          list.push({
            place: `[BMKG InaTEWS Terkini] ${autoGempa.location}`,
            lat: autoGempa.lat,
            lng: autoGempa.lng,
            mag: autoGempa.magnitude,
            depth: autoGempa.depthKm,
            felt: autoGempa.felt,
            shakemapUrl: autoGempa.shakemapUrl,
            time: `${autoGempa.date} ${autoGempa.time}`,
          });
        }
        if (Array.isArray(terkini)) {
          terkini.forEach((g: any) => {
            if (g.lat && g.lng) {
              list.push({
                place: g.location,
                lat: g.lat,
                lng: g.lng,
                mag: g.magnitude,
                depth: g.depthKm,
                time: `${g.date} ${g.time}`,
              });
            }
          });
        }
        if (list.length > 0) {
          setEarthquakes(list);
        }
      } catch (err) {
        console.warn('Could not fetch live quakes for GeospatialStudioView:', err);
      }

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

  return (
    <div className="w-full h-full min-h-[calc(100vh-3.5rem)] flex flex-col p-2 sm:p-4 bg-slate-100/70 dark:bg-slate-950">
      <GeospatialWeatherModal
        isOpen={true}
        asPage={true}
        onClose={() => navigate('/app/maps')}
        lat={-7.2575}
        lng={112.7521}
        locationName="Surabaya (Pusat Geospasial)"
        schools={schools}
        earthquakes={earthquakes}
      />
    </div>
  );
};

export default GeospatialStudioView;
