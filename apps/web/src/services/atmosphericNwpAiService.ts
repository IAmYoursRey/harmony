// Layanan Verifikasi Cuaca AI Berbasis 7 Persamaan Dasar Atmosfer (NWP)
// Mengintegrasikan Gemini AI API & Vilhelm Bjerknes - Lewis Fry Richardson Physical Framework
import { geospatialDataTelemetryService } from './geospatialDataTelemetryService';

export interface EquationVerificationItem {
  id: string;
  name: string;
  formula: string;
  evaluatedValue: string;
  status: 'VALID' | 'WARNING' | 'ANOMALY';
  note: string;
}

export interface AiNwpVerificationResult {
  isAiVerified: boolean;
  verifiedTemperature: number;
  apparentTemperature: number;
  calibratedRainProb: number | null;
  rainIntensityMmH: number;
  airDensityKgM3: number | null;
  coriolisParamF: number; // in 10^-5 s^-1
  convectiveStability: 'Stabil' | 'Labil Moderat' | 'Labil Konvektif (Potensi Badai Petir)' | 'Belum dinilai';
  equationsStatus: EquationVerificationItem[];
  scientificBriefing: string;
  modelName: string;
  verifiedAt: string;
}

export interface NwpVerifyPayload {
  lat: number;
  lng: number;
  locationName: string;
  elevation: number;
  current: {
    consensusTemperature: number | null;
    apparentTemperature: number | null;
    humidity: number | null;
    pressure: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    precipitation: number | null;
    precipitationProb: number | null;
  };
  modelComparison: Array<{
    modelName: string;
    sourceFlag?: string;
    temperature: number;
  }>;
}

class AtmosphericNwpAiService {
  private cache: Map<string, { result: AiNwpVerificationResult; timestamp: number }> = new Map();
  private inFlightPromises: Map<string, Promise<AiNwpVerificationResult>> = new Map();
  private CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit

  /**
   * Local diagnostic only. It cannot establish forecast accuracy or solve atmospheric dynamics.
   */
  public computeDeterministicNwp(payload: NwpVerifyPayload): AiNwpVerificationResult {
    const { lat, current } = payload || {};
    if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90) {
      throw new Error('Koordinat lintang tidak valid untuk diagnostik atmosfer.');
    }
    const { consensusTemperature, apparentTemperature, humidity, pressure, windSpeed, windDirection, precipitation, precipitationProb } = current || {};
    if (typeof consensusTemperature !== 'number' || !Number.isFinite(consensusTemperature) || consensusTemperature < -100 || consensusTemperature > 70) {
      throw new Error('Data suhu tidak valid untuk diagnostik atmosfer.');
    }

    const coriolis = 2 * 7.2921e-5 * Math.sin(lat * Math.PI / 180) * 1e5;
    const hasPressure = typeof pressure === 'number' && Number.isFinite(pressure) && pressure > 0 && pressure <= 1200;
    const airDensity = hasPressure && consensusTemperature > -273.15
      ? pressure * 100 / (287.058 * (consensusTemperature + 273.15))
      : null;

    const equationsStatus: EquationVerificationItem[] = [
      {
        id: 'coriolis',
        name: 'Parameter Coriolis',
        formula: 'f = 2 Ω sin(φ)',
        evaluatedValue: `${coriolis.toFixed(4)} × 10⁻⁵ s⁻¹`,
        status: 'VALID',
        note: 'Nilai turunan dari lintang, bukan penyelesaian persamaan gerak atmosfer.',
      },
    ];

    if (airDensity !== null) {
      equationsStatus.push({
        id: 'ideal_gas',
        name: 'Estimasi kerapatan udara',
        formula: 'ρ = p / (R T)',
        evaluatedValue: `${airDensity.toFixed(3)} kg/m³`,
        status: 'VALID',
        note: 'Pendekatan gas ideal (gas kering) dari suhu dan tekanan model, bukan pengamatan langsung.',
      });
    } else {
      equationsStatus.push({
        id: 'ideal_gas',
        name: 'Estimasi kerapatan udara',
        formula: 'ρ = p / (R T)',
        evaluatedValue: 'Belum dapat dihitung',
        status: 'WARNING',
        note: 'Tekanan permukaan tidak tersedia atau tidak valid; kerapatan udara tidak dapat diestimasi.',
      });
    }

    equationsStatus.push({
      id: 'nwp_unavailable',
      name: 'Simulasi NWP dan CAPE',
      formula: 'Memerlukan medan atmosfer 3D dan profil vertikal',
      evaluatedValue: 'Belum dihitung',
      status: 'WARNING',
      note: 'Data satu titik permukaan tidak cukup untuk memverifikasi dinamika atmosfer 3D, adveksi, atau akurasi prakiraan.',
    });

    return {
      isAiVerified: false,
      verifiedTemperature: consensusTemperature,
      apparentTemperature: typeof apparentTemperature === 'number' && Number.isFinite(apparentTemperature) ? apparentTemperature : consensusTemperature,
      calibratedRainProb: typeof precipitationProb === 'number' && Number.isFinite(precipitationProb) && precipitationProb >= 0 && precipitationProb <= 100 ? precipitationProb : null,
      rainIntensityMmH: typeof precipitation === 'number' && Number.isFinite(precipitation) && precipitation >= 0 ? precipitation : 0,
      airDensityKgM3: airDensity !== null ? Number(airDensity.toFixed(3)) : null,
      coriolisParamF: Number(coriolis.toFixed(4)),
      convectiveStability: 'Belum dinilai',
      equationsStatus,
      scientificBriefing: airDensity !== null
        ? 'Hanya diagnostik lokal: parameter Coriolis dan estimasi kerapatan udara. AI eksternal belum berhasil digunakan. Nilai prakiraan penyedia dipertahankan; akurasi belum divalidasi dengan pengamatan.'
        : 'Hanya diagnostik parsial lokal: parameter Coriolis dihitung; tekanan permukaan tidak tersedia untuk estimasi kerapatan udara. AI eksternal belum digunakan. Nilai penyedia dipertahankan.',
      modelName: 'Diagnostik atmosfer lokal (bukan solver NWP)',
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Memverifikasi data cuaca ke backend AI (Gemini 3.6 Flash NWP Engine)
   */
  public async verifyForecastWithNwpAi(payload: NwpVerifyPayload, forceRefresh = false): Promise<AiNwpVerificationResult> {
    const cacheKey = JSON.stringify(payload);
    if (forceRefresh) {
      this.cache.delete(cacheKey);
    } else {
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.result;
      }
    }

    if (this.inFlightPromises.has(cacheKey)) {
      return this.inFlightPromises.get(cacheKey)!;
    }

    const promise = (async () => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || '';
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 8000);
        geospatialDataTelemetryService.addLog(
          'AI_EXEC',
          'GEMINI_NWP_CLIENT',
          `[Pra-Hitung] Mengirimkan paket telemetri atmosfer (${payload.modelComparison.length} model masukan) ke endpoint verifikasi Gemini AI...`,
          { location: payload.locationName, lat: payload.lat, lng: payload.lng }
        );

        const response = await fetch(`${apiBase}/api/ai/weather-nwp-verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const json = await response.json();
        const d = json?.data;
        const isTempValid = typeof d?.verifiedTemperature === 'number' && Number.isFinite(d.verifiedTemperature) && d.verifiedTemperature >= -100 && d.verifiedTemperature <= 70;
        const isApparentValid = typeof d?.apparentTemperature === 'number' && Number.isFinite(d.apparentTemperature) && d.apparentTemperature >= -100 && d.apparentTemperature <= 100;
        const isRainProbValid = d?.calibratedRainProb === null || (typeof d?.calibratedRainProb === 'number' && Number.isFinite(d.calibratedRainProb) && d.calibratedRainProb >= 0 && d.calibratedRainProb <= 100);
        const isRainIntensityValid = typeof d?.rainIntensityMmH === 'number' && Number.isFinite(d.rainIntensityMmH) && d.rainIntensityMmH >= 0;
        const isAirDensityValid = d?.airDensityKgM3 === null || (typeof d?.airDensityKgM3 === 'number' && Number.isFinite(d.airDensityKgM3) && d.airDensityKgM3 > 0 && d.airDensityKgM3 <= 5);
        const isCoriolisValid = typeof d?.coriolisParamF === 'number' && Number.isFinite(d.coriolisParamF);
        const isBriefingValid = typeof d?.scientificBriefing === 'string' && d.scientificBriefing.trim().length > 0;
        const isEquationsValid = Array.isArray(d?.equationsStatus);

        if (json?.success === true && d?.isAiVerified === true && isTempValid && isApparentValid && isRainProbValid && isRainIntensityValid && isAirDensityValid && isCoriolisValid && isBriefingValid && isEquationsValid) {
          const result: AiNwpVerificationResult = {
            ...d,
            modelName: d.modelName || 'Penjelasan AI',
            verifiedAt: new Date().toISOString(),
          };
          this.cache.set(cacheKey, { result, timestamp: Date.now() });
          geospatialDataTelemetryService.addLog(
            'AI_EXEC',
            'GEMINI_NWP_CLIENT',
            `[Pasca-Hitung] Gemini AI (${result.modelName}) berhasil menyintesis penalaran: "${result.scientificBriefing}"`,
            { verifiedAt: result.verifiedAt, isAiVerified: true }
          );
          return result;
        }

        throw new Error('Invalid AI response payload');
      } catch (err) {
        const fallback = this.computeDeterministicNwp(payload);
        geospatialDataTelemetryService.addLog(
          'AI_EXEC',
          'DETERMINISTIC_NWP',
          `[Pasca-Hitung] Komputasi atmosfer deterministik lokal (Coriolis f=${fallback.coriolisParamF}×10⁻⁵ s⁻¹, ρ=${fallback.airDensityKgM3 ?? '—'} kg/m³): "${fallback.scientificBriefing}"`,
          { isAiVerified: false, modelName: fallback.modelName }
        );
        return fallback;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        this.inFlightPromises.delete(cacheKey);
      }
    })();

    this.inFlightPromises.set(cacheKey, promise);
    return promise;
  }
}

export const atmosphericNwpAiService = new AtmosphericNwpAiService();
