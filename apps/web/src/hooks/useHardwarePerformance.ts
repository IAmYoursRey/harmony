import { useState, useEffect } from 'react';
import {
  hardwarePerformanceService,
  PerformanceProfile,
  PerformanceMode,
} from '@/services/hardwarePerformanceService';

export function useHardwarePerformance() {
  const [profile, setProfile] = useState<PerformanceProfile>(() =>
    hardwarePerformanceService.getProfile()
  );

  useEffect(() => {
    return hardwarePerformanceService.subscribe((newProfile) => {
      setProfile(newProfile);
    });
  }, []);

  const setMode = (mode: PerformanceMode) => {
    hardwarePerformanceService.setMode(mode);
  };

  return {
    profile,
    mode: profile.mode,
    effectiveMode: profile.effectiveMode,
    isLowSpecDetected: profile.isLowSpecDetected,
    setMode,
  };
}
