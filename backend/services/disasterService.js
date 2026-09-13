import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });

const ai = new GoogleGenAI({
  apiKey:
    process.env.GEMINI_CHATBOT_KEY ||
    process.env.GEMINI_CHAT_KEY ||
    process.env.GEMINI_QUIZ_KEY,
});
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";

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
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });
    const text = response.text || response.candidates[0].content.parts[0].text;
    aiResult = JSON.parse(text);
  } catch (e) {
    console.error("AI interpretation failed:", e);
    return {
      error: "AI Analysis Failed",
      factualData,
    };
  }

  return {
    id: school.id || school.school_id,
    school_id: school.id || school.school_id,
    latitude: lat,
    longitude: lng,
    generated_at: new Date().toISOString(),
    data_version: "1.0.0",
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
