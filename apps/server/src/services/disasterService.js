import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"], quiet: true });

function isValidGeminiKey(k) {
  return typeof k === "string" && k.trim().length > 15 && !k.startsWith("your_gemini");
}

function getDisasterAiClient() {
  const apiKey = [
    process.env.GEMINI_CHATBOT_KEY,
    process.env.GEMINI_CHAT_KEY,
    process.env.GEMINI_QUIZ_KEY,
    process.env.GEMINI_WEATHER_KEY,
  ].find(isValidGeminiKey);
  return apiKey ? new GoogleGenAI({ apiKey: apiKey.trim() }) : null;
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.5-flash",
].filter((m) => typeof m === "string" && m.trim().length > 0 && m !== "gemini-3.6-flash");

function buildDeterministicDisasterFallback(factualData) {
  const eqs = Array.isArray(factualData?.historical_earthquakes_200km)
    ? factualData.historical_earthquakes_200km
    : [];
  const maxMag = eqs.reduce((max, eq) => Math.max(max, Number(eq?.magnitude) || 0), 0);
  const elev = typeof factualData?.location?.elevation_meters === "number"
    ? factualData.location.elevation_meters
    : null;
  const volDist = factualData?.nearest_active_volcano?.distance_km != null
    ? Number(factualData.nearest_active_volcano.distance_km)
    : null;
  const volName = factualData?.nearest_active_volcano?.name || "Tidak teridentifikasi";

  const eqLevel = maxMag >= 6.0 || eqs.length >= 5 ? "Tinggi" : eqs.length >= 1 ? "Sedang" : "Rendah";
  const volLevel = volDist !== null && volDist <= 15 ? "Tinggi" : volDist !== null && volDist <= 35 ? "Sedang" : "Rendah";
  const floodLevel = elev === null ? "Data tidak tersedia" : elev <= 25 ? "Tinggi" : elev <= 80 ? "Sedang" : "Rendah";
  const landslideLevel = elev === null ? "Data tidak tersedia" : elev >= 250 ? "Sedang" : "Rendah";
  const tsunamiLevel = elev === null ? "Data tidak tersedia" : elev <= 15 && eqs.length > 0 ? "Sedang" : "Rendah";

  const dominantHazards = [];
  if (eqLevel === "Tinggi" || eqLevel === "Sedang") dominantHazards.push("Earthquake");
  if (volLevel === "Tinggi" || volLevel === "Sedang") dominantHazards.push("Volcano");
  if (floodLevel === "Tinggi" || floodLevel === "Sedang") dominantHazards.push("Flood");
  if (dominantHazards.length === 0) dominantHazards.push("Earthquake");

  const elevText = elev !== null ? `${Math.round(elev)} m dpl` : "elevasi belum tersedia";
  const volText = volDist !== null ? `${volName} (~${volDist.toFixed(1)} km)` : volName;

  return {
    ai_summary: `${factualData?.school_name || "Sekolah"} berada pada ketinggian ${elevText} dengan gunung api terdekat ${volText} serta catatan ${eqs.length} gempa M>=4.5 dalam radius 200 km (USGS). Profil risiko diturunkan langsung dari parameter spasial terukur.`,
    dominant_hazards: dominantHazards,
    hazards: {
      earthquake: {
        level: eqLevel,
        detail: `${eqs.length} peristiwa gempa M>=4.5 tercatat dalam radius 200 km (maks M${maxMag ? maxMag.toFixed(1) : "0"}).`,
        source: "USGS Earthquake Catalog (Deterministic)",
      },
      flood: {
        level: floodLevel,
        detail: elev !== null ? `Ketinggian lokasi ${Math.round(elev)} m di atas permukaan laut.` : "Data elevasi tidak tersedia.",
        source: "Open-Meteo Elevation (Deterministic)",
      },
      landslide: {
        level: landslideLevel,
        detail: elev !== null ? `Evaluasi awal berdasarkan elevasi ${Math.round(elev)} m dpl.` : "Data elevasi tidak tersedia.",
        source: "Open-Meteo Elevation (Deterministic)",
      },
      volcano: {
        level: volLevel,
        detail: `Gunung api terdekat: ${volText}.`,
        source: "Smithsonian / PVMBG Static Reference",
      },
      tsunami: {
        level: tsunamiLevel,
        detail: elev !== null ? `Elevasi daratan ${Math.round(elev)} m dpl.` : "Data elevasi tidak tersedia.",
        source: "USGS / Open-Meteo (Deterministic)",
      },
    },
  };
}

const VOLCANOES = [
  { name: "Merapi", lat: -7.54, lng: 110.44 },
  { name: "Kelud", lat: -7.93, lng: 112.31 },
  { name: "Semeru", lat: -8.108, lng: 112.92 },
  { name: "Bromo (Tengger)", lat: -7.942, lng: 112.95 },
  { name: "Raung", lat: -8.125, lng: 114.042 },
  { name: "Ijen", lat: -8.058, lng: 114.242 },
  { name: "Arjuno-Welirang", lat: -7.725, lng: 112.58 },
  { name: "Penanggungan", lat: -7.616, lng: 112.616 },
  { name: "Krakatau", lat: -6.102, lng: 105.423 },
  { name: "Agung", lat: -8.343, lng: 115.508 },
];

function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function generateDisasterIntelligence(school) {
  const lat = parseFloat(school.latitude);
  const lng = parseFloat(school.longitude);

  let earthquakes = [];
  try {
    const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=200&minmagnitude=4.5&limit=10`;
    const res = await fetch(usgsUrl);
    if (res.ok) {
      const data = await res.json();
      earthquakes = data.features.map((f) => ({
        magnitude: f.properties.mag,
        title: f.properties.title,
        time: new Date(f.properties.time).toISOString(),
        distance_km: haversineDist(
          lat,
          lng,
          f.geometry.coordinates[1],
          f.geometry.coordinates[0],
        ).toFixed(1),
      }));
    }
  } catch (e) {
    console.error("USGS fetch failed:", e);
  }

  let elevation = null;
  try {
    const meteoUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
    const res = await fetch(meteoUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.elevation && data.elevation.length > 0) {
        elevation = data.elevation[0];
      }
    }
  } catch (e) {
    console.error("OpenMeteo fetch failed:", e);
  }

  let nearestVolcano = null;
  let minVolcanoDist = Infinity;
  for (const v of VOLCANOES) {
    const d = haversineDist(lat, lng, v.lat, v.lng);
    if (d < minVolcanoDist) {
      minVolcanoDist = d;
      nearestVolcano = { name: v.name, distance_km: d.toFixed(1) };
    }
  }

  const factualData = {
    school_name: school.name || school.school_name,
    location: {
      regency: school.regency,
      province: school.province,
      latitude: lat,
      longitude: lng,
      elevation_meters: elevation,
    },
    historical_earthquakes_200km: earthquakes,
    nearest_active_volcano: nearestVolcano,
  };

  const prompt = `You are interpreting supplied authoritative geospatial/disaster data for a school in Indonesia.
Do not invent events, coordinates, percentages, hazard levels, sources, dates, or measurements.
If evidence is missing, return null/unknown.
Every conclusion must be traceable to the supplied source data.

Supplied Data:
${JSON.stringify(factualData, null, 2)}

Determine the disaster risks for Earthquake, Flood, Landslide, Volcano, and Tsunami.
For "level", use "Tinggi", "Sedang", "Rendah", or "Data tidak tersedia".
Provide a concise "ai_summary" explaining the geographical context and risk profile in Indonesian.

Respond strictly with a JSON object in this exact format:
{
  "ai_summary": "...",
  "dominant_hazards": ["Earthquake", ...],
  "hazards": {
    "earthquake": { "level": "...", "detail": "...", "source": "USGS / AI Analysis" },
    "flood": { "level": "...", "detail": "...", "source": "Open-Meteo / AI Analysis" },
    "landslide": { "level": "...", "detail": "...", "source": "Open-Meteo / AI Analysis" },
    "volcano": { "level": "...", "detail": "...", "source": "Smithsonian / AI Analysis" },
    "tsunami": { "level": "...", "detail": "...", "source": "AI Analysis" }
  }
}
Return ONLY the raw JSON object. Do not wrap in markdown or \`\`\`json.`;

  let aiResult = null;
  let usedAi = false;
  const ai = getDisasterAiClient();
  if (ai) {
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        });
        const text = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === "string") {
          const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          const parsed = JSON.parse(cleaned);
          if (parsed && typeof parsed.ai_summary === "string" && parsed.hazards) {
            aiResult = parsed;
            usedAi = true;
            break;
          }
        }
      } catch (e) {
        console.warn(`[DisasterService] Model ${modelName} failed:`, e?.message || e);
      }
    }
  }

  if (!aiResult) {
    aiResult = buildDeterministicDisasterFallback(factualData);
  }

  return {
    id: school.id || school.school_id,
    school_id: school.id || school.school_id,
    latitude: lat,
    longitude: lng,
    generated_at: new Date().toISOString(),
    data_version: "1.0.0",
    analysis_mode: usedAi ? "ai" : "deterministic_fallback",
    sources: [
      { name: "USGS Earthquake Catalog", type: "earthquake" },
      { name: "Open-Meteo Elevation", type: "elevation" },
      { name: "Global Volcanism Program (Static)", type: "volcano" },
    ],
    raw_factual_data: factualData,
    ai_summary: aiResult.ai_summary,
    dominant_hazards: aiResult.dominant_hazards,
    hazards: aiResult.hazards,
  };
}
