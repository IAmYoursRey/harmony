// Reverse geocoding, Indonesian administrative region resolution (adm4 via wilayah.id), and geodesic bearing calculations.

const CACHE_WILAYAH = new Map();
const CACHE_KOORDINAT = new Map();

let _customFetcher = null;

export function __setRegionFetcherForTest(fn) {
  _customFetcher = fn || null;
}

export function __clearRegionCacheForTest() {
  CACHE_WILAYAH.clear();
  CACHE_KOORDINAT.clear();
}

const PETA_ISO_PROVINSI = {
  AC: "11", SU: "12", SB: "13", RI: "14", JA: "15", SS: "16", BE: "17", LA: "18",
  BB: "19", KR: "21", JK: "31", JB: "32", JT: "33", YO: "34", JI: "35", BT: "36",
  BA: "51", NB: "52", NT: "53", KB: "61", KT: "62", KS: "63", KI: "64", KU: "65",
  SA: "71", ST: "72", SN: "73", SG: "74", GO: "75", SR: "76", MA: "81", MU: "82",
  PA: "91", PB: "92", PS: "93", PT: "94", PP: "95", PD: "96",
};

function ambilFetcher() {
  return _customFetcher || fetch;
}

export function normWilayah(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\bdaerah khusus ibukota\b/g, "dki")
    .replace(/\bdaerah istimewa\b/g, "di")
    .replace(/\b(kabupaten|kab\.?|kota|kecamatan|kec\.?|kelurahan|kel\.?|desa)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cocokWilayah(daftar, target, prefiksPrioritas = "") {
  const t = normWilayah(target);
  if (!t || !Array.isArray(daftar) || !daftar.length) return null;

  if (prefiksPrioritas) {
    const tepatPrefiks = daftar.find(
      (x) => String(x.name).toLowerCase().startsWith(prefiksPrioritas) && normWilayah(x.name) === t
    );
    if (tepatPrefiks) return tepatPrefiks;
  }

  return (
    daftar.find((x) => normWilayah(x.name) === t) ||
    daftar.find((x) => {
      const n = normWilayah(x.name);
      return n.includes(t) || t.includes(n);
    }) ||
    null
  );
}

async function fetchJsonCached(kunci, url) {
  if (CACHE_WILAYAH.has(kunci)) return CACHE_WILAYAH.get(kunci);
  const fetcher = ambilFetcher();
  const r = await fetcher(url, {
    headers: { Accept: "application/json", "User-Agent": "Harmony-FieldTelemetry/1.0" },
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) throw new Error(`Gagal memuat wilayah (${r.status})`);
  const json = await r.json();
  const data = Array.isArray(json?.data) ? json.data : [];
  CACHE_WILAYAH.set(kunci, data);
  return data;
}

export async function ambilProvinsi() {
  return await fetchJsonCached("provinsi", "https://wilayah.id/api/provinces.json");
}

export async function ambilKabupaten(kodeProv) {
  if (!/^\d{2}$/.test(String(kodeProv || ""))) throw new Error("Kode provinsi tidak valid");
  return await fetchJsonCached(`kab:${kodeProv}`, `https://wilayah.id/api/regencies/${kodeProv}.json`);
}

export async function ambilKecamatan(kodeKab) {
  if (!/^\d{2}\.\d{2}$/.test(String(kodeKab || ""))) throw new Error("Kode kabupaten/kota tidak valid");
  return await fetchJsonCached(`kec:${kodeKab}`, `https://wilayah.id/api/districts/${kodeKab}.json`);
}

export async function ambilDesa(kodeKec) {
  if (!/^\d{2}\.\d{2}\.\d{2}$/.test(String(kodeKec || ""))) throw new Error("Kode kecamatan tidak valid");
  return await fetchJsonCached(`desa:${kodeKec}`, `https://wilayah.id/api/villages/${kodeKec}.json`);
}

export function bacaGeoVercel(req) {
  const h = req?.headers || {};
  const lat = Number(h["x-vercel-ip-latitude"]);
  const lon = Number(h["x-vercel-ip-longitude"]);
  const negara = String(h["x-vercel-ip-country"] || "").toUpperCase();
  const provKodeIso = String(h["x-vercel-ip-country-region"] || "").toUpperCase();
  let kota = "";
  try {
    kota = decodeURIComponent(String(h["x-vercel-ip-city"] || "")).trim();
  } catch {
    kota = String(h["x-vercel-ip-city"] || "").trim();
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, kota, provKodeIso, negara };
}

async function reverseGeocode(lat, lon) {
  const fetcher = ambilFetcher();
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1&accept-language=id`;
    const r = await fetcher(url, {
      headers: { Accept: "application/json", "User-Agent": "Harmony-FieldTelemetry/1.0" },
      signal: AbortSignal.timeout(6500),
    });
    if (r.ok) {
      const nom = await r.json();
      if (nom && nom.address) {
        const a = nom.address;
        if (a.country_code && a.country_code.toLowerCase() !== "id") {
          return { luarIndonesia: true, negara: a.country || a.country_code };
        }
        return {
          luarIndonesia: false,
          provNama: a.state || a.region || "",
          kabNama: a.county || a.city || a.regency || "",
          prefiksKab: a.county ? "kabupaten" : a.city ? "kota" : "",
          kecNama: a.municipality || a.district || a.town || a.city_district || a.subdistrict || "",
          desaNama: a.village || a.suburb || a.quarter || a.hamlet || a.neighbourhood || "",
        };
      }
    }
  } catch {
    // Fall back to BigDataCloud when Nominatim throttles or times out
  }

  const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=id`;
  const r2 = await fetcher(bdcUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6500),
  });
  if (!r2.ok) throw new Error("Layanan geolokasi koordinat tidak merespons");
  const bdc = await r2.json();
  if (bdc.countryCode && bdc.countryCode.toUpperCase() !== "ID") {
    return { luarIndonesia: true, negara: bdc.countryName || bdc.countryCode };
  }
  const admins = (bdc.localityInfo?.administrative || []).map((x) => x.name).filter(Boolean);
  return {
    luarIndonesia: false,
    provNama: bdc.principalSubdivision || admins[2] || admins[1] || "",
    kabNama: admins[3] || bdc.city || "",
    prefiksKab: "",
    kecNama: bdc.locality || bdc.city || "",
    desaNama: bdc.locality || "",
  };
}

export async function cariAdm4DariKoordinat(latRaw, lonRaw, opsi = {}) {
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error("Koordinat lintang/bujur tidak valid");
  }

  const kunci = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (!opsi.segar && CACHE_KOORDINAT.has(kunci)) {
    return { ...CACHE_KOORDINAT.get(kunci), sumber: opsi.sumber || CACHE_KOORDINAT.get(kunci).sumber };
  }

  const geo = await reverseGeocode(lat, lon);
  if (geo.luarIndonesia) {
    throw new Error(`Koordinat berada di luar Indonesia (${geo.negara}); BMKG hanya mencakup wilayah Indonesia.`);
  }

  const provs = await ambilProvinsi();
  const kodeIso = opsi.provKodeIso ? PETA_ISO_PROVINSI[String(opsi.provKodeIso).toUpperCase()] : null;
  const prov = cocokWilayah(provs, geo.provNama) || (kodeIso ? provs.find((p) => p.code === kodeIso) : null);
  if (!prov) throw new Error("Provinsi Indonesia tidak dapat dikenali dari koordinat");

  const kabs = await ambilKabupaten(prov.code);
  const kab = cocokWilayah(kabs, geo.kabNama || opsi.kotaHint, geo.prefiksKab) || cocokWilayah(kabs, opsi.kotaHint);
  if (!kab) throw new Error(`Kabupaten/Kota pada ${prov.name} tidak cocok (${geo.kabNama || opsi.kotaHint || "-"})`);

  const kecs = await ambilKecamatan(kab.code);
  let kec = cocokWilayah(kecs, geo.kecNama);
  let desa = null;

  if (kec) {
    const desas = await ambilDesa(kec.code);
    desa = cocokWilayah(desas, geo.desaNama) || desas[0] || null;
  } else if (geo.desaNama) {
    // Rural villages occasionally omit district names in OSM output; scan district village lists
    const hasilScan = await Promise.all(
      kecs.map(async (k) => {
        try {
          const ds = await ambilDesa(k.code);
          const m = cocokWilayah(ds, geo.desaNama);
          return m ? { kec: k, desa: m } : null;
        } catch {
          return null;
        }
      })
    );
    const temu = hasilScan.find(Boolean);
    if (temu) {
      kec = temu.kec;
      desa = temu.desa;
    }
  }

  if (!kec && kecs.length) {
    kec = cocokWilayah(kecs, opsi.kotaHint) || kecs[0];
  }
  if (!desa && kec) {
    const desas = await ambilDesa(kec.code);
    desa = cocokWilayah(desas, geo.desaNama) || desas[0] || null;
  }

  if (!desa) throw new Error("Desa/kelurahan tidak ditemukan pada basis wilayah Indonesia");

  const hasil = {
    adm4: desa.code,
    desa: desa.name,
    kecamatan: kec.name,
    kotkab: kab.name,
    provinsi: prov.name,
    lat: Math.round(lat * 100000) / 100000,
    lon: Math.round(lon * 100000) / 100000,
    sumber: opsi.sumber || "Koordinat",
  };
  CACHE_KOORDINAT.set(kunci, hasil);
  return hasil;
}

const KOMPAS_16 = [
  ["N", "U", "Utara", 0],
  ["NNE", "U-TL", "Utara Timur Laut", 22.5],
  ["NE", "TL", "Timur Laut", 45],
  ["ENE", "T-TL", "Timur-Timur Laut", 67.5],
  ["E", "T", "Timur", 90],
  ["ESE", "T-TG", "Timur Tenggara", 112.5],
  ["SE", "TG", "Tenggara", 135],
  ["SSE", "S-TG", "Selatan Tenggara", 157.5],
  ["S", "S", "Selatan", 180],
  ["SSW", "S-BD", "Selatan Barat Daya", 202.5],
  ["SW", "BD", "Barat Daya", 225],
  ["WSW", "B-BD", "Barat-Barat Daya", 247.5],
  ["W", "B", "Barat", 270],
  ["WNW", "B-BL", "Barat-Barat Laut", 292.5],
  ["NW", "BL", "Barat Laut", 315],
  ["NNW", "U-BL", "Utara Barat Laut", 337.5],
];

export function hitungJarakKm(lat1, lon1, lat2, lon2) {
  const a1 = Number(lat1);
  const o1 = Number(lon1);
  const a2 = Number(lat2);
  const o2 = Number(lon2);
  if (![a1, o1, a2, o2].every(Number.isFinite)) return null;
  const R = 6371;
  const dLat = ((a2 - a1) * Math.PI) / 180;
  const dLon = ((o2 - o1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 100) / 100;
}

export function derajatKeArah(degRaw) {
  const d = ((Number(degRaw) % 360) + 360) % 360;
  const idx = Math.round(d / 22.5) % 16;
  const [, idPendek, nama] = KOMPAS_16[idx];
  return { derajat: Math.round(d), kode_id: idPendek, nama };
}

export function hitungAzimutDanArah(lat1, lon1, lat2, lon2) {
  const a1 = (Number(lat1) * Math.PI) / 180;
  const o1 = (Number(lon1) * Math.PI) / 180;
  const a2 = (Number(lat2) * Math.PI) / 180;
  const o2 = (Number(lon2) * Math.PI) / 180;
  if (![a1, o1, a2, o2].every(Number.isFinite)) return null;
  const y = Math.sin(o2 - o1) * Math.cos(a2);
  const x = Math.cos(a1) * Math.sin(a2) - Math.sin(a1) * Math.cos(a2) * Math.cos(o2 - o1);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return derajatKeArah(brng);
}

export function kodeAnginKeDerajat(wd, degRaw = null) {
  const atas = String(wd || "").trim().toUpperCase();
  if (atas === "CALM" || atas === "TENANG") {
    return {
      tenang: true,
      dari_derajat: 0,
      menuju_derajat: 180,
      dari_kode_id: "TENANG",
      dari_nama: "Tenang",
      menuju_kode_id: "-",
      menuju_nama: "-",
    };
  }
  const hasDeg = degRaw !== null && degRaw !== undefined && String(degRaw).trim() !== "" && Number.isFinite(Number(degRaw));
  let dariDeg = hasDeg ? ((Number(degRaw) % 360) + 360) % 360 : null;
  if (dariDeg === null) {
    const cocok = KOMPAS_16.find(([en, id]) => en === atas || id === atas);
    if (cocok) dariDeg = cocok[3];
  }
  if (dariDeg === null) dariDeg = 90;
  const dari = derajatKeArah(dariDeg);
  const menuju = derajatKeArah((dariDeg + 180) % 360);
  return {
    tenang: false,
    dari_derajat: dari.derajat,
    menuju_derajat: menuju.derajat,
    dari_kode_id: dari.kode_id,
    dari_nama: dari.nama,
    menuju_kode_id: menuju.kode_id,
    menuju_nama: menuju.nama,
  };
}

