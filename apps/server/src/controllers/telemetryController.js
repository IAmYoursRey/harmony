import {
  penyimpanan,
  bacaBody,
  tokenStasiunBenar,
  angka,
  tzOffsetDariWilayah,
  hitungInfoWaktuLokal,
  hitungPengirimanEfektif,
  hitungBatasDetik,
  ekstrakNodeCfgDariStatusRumah,
  resolusiTzOffsetDariMeta,
  tangani,
} from "../services/telemetry/storage.js";
import {
  ADM4_BAKU,
  FFMC_AWAL_BAKU,
  DAFTAR_DESA_NGORO,
  KATALOG_MODUL,
  tanggalWIB,
  hitungFFMC,
  hitungStatusKebakaran,
  hitungWaktuTanam,
  ambilPrakiraanBMKG,
} from "../services/telemetry/weatherEngine.js";
import {
  ambilProvinsi,
  ambilKabupaten,
  ambilKecamatan,
  ambilDesa,
  bacaGeoVercel,
  cariAdm4DariKoordinat,
  hitungJarakKm,
  hitungAzimutDanArah,
  kodeAnginKeDerajat,
} from "../services/telemetry/regionResolver.js";

const CACHE_BMKG_MS = 30 * 60 * 1000;
const PELUANG_SAH = ["rendah", "sedang", "tinggi"];
const MODUL_SAH = new Set(["inti", "M1", "M2", "M3", "M4", "M5", "M6", "M7"]);
const AKSI_PERINTAH = ["ambil_sampel", "atur_pengiriman"];
const POLL_CEPAT = 1;
const POLL_HEMAT = 5;

const _cacheGeoStasiun = new Map();
const _cacheGpsAlat = new Map();
let _customBmkgFetcher = null;

export function __setBmkgFetcherForTest(fn) {
  _customBmkgFetcher = fn || null;
}

export function __clearTelemetryControllerCachesForTest() {
  _cacheGeoStasiun.clear();
  _cacheGpsAlat.clear();
}

function bacaJsonAman(raw) {
  if (!raw?.nilai) return null;
  try {
    return JSON.parse(raw.nilai);
  } catch {
    return null;
  }
}

async function bacaJsonMeta(db, kunci, bawaan) {
  const row = await db.getMeta(kunci);
  if (!row || !row.nilai) return { nilai: bawaan, diubah: null };
  try {
    return { nilai: JSON.parse(row.nilai), diubah: row.diubah || null };
  } catch {
    return { nilai: bawaan, diubah: row.diubah || null };
  }
}

async function simpanJsonMeta(db, kunci, obj) {
  await db.setMeta(kunci, JSON.stringify(obj));
}

function defaultDasarian() {
  return {
    periode: "Dasarian Berjalan",
    berjalan: "sedang",
    berikutnya: "sedang",
    sumber: "BMKG Prediksi Hujan Dasarian >50 mm",
    diperbarui: null,
  };
}

function defaultAmbang() {
  return { kering: 30, cukup: 60, suhuMin: 20, suhuMax: 35 };
}

function cadanganBMKGOffline(adm4, alasan = "Gagal terhubung ke api.bmkg.go.id") {
  const desa = DAFTAR_DESA_NGORO.find((d) => d.adm4 === adm4);
  const namaDesa = desa ? desa.nama.replace(/, Kec\. Ngoro$/, "").replace(/^Desa /, "") : `Wilayah ${adm4}`;
  const tgl = tanggalWIB();
  return {
    sumber_ok: false,
    cadangan: true,
    pesan_galat: alasan,
    sumber: "BMKG (Offline — gagal terhubung ke api.bmkg.go.id)",
    diambil_pada: new Date().toISOString(),
    lokasi: {
      adm4,
      desa: namaDesa,
      kecamatan: desa ? "Ngoro" : "-",
      kotkab: desa ? "Mojokerto" : "-",
      provinsi: desa ? "Jawa Timur" : "-",
      lat: null,
      lon: null,
    },
    saat_ini: {
      waktu_lokal: `${tgl} --:--`,
      tanggal: tgl,
      jam: null,
      suhu: null,
      rh: null,
      angin_km_jam: null,
      arah_angin: null,
      arah_angin_derajat: null,
      arah_angin_menuju: null,
      hujan_mm: null,
      tutupan_awan: null,
      cuaca: "Data BMKG tidak tersedia (offline)",
      ikon_url: "",
    },
    hari_ini: {
      tanggal: tgl,
      suhu_siang: null,
      rh_siang: null,
      angin_siang: null,
      jam_acuan_siang: null,
      suhu_min: null,
      suhu_maks: null,
      prakiraan_hujan_mm: null,
      potensi_hujan: false,
      cuaca: "Data BMKG tidak tersedia (offline)",
      ikon_url: "",
    },
    harian: [],
    per_3_jam: [],
  };
}

async function muatBMKGDenganCache(db, adm4, paksaSegar = false) {
  const kunci = `cuaca_cache:${adm4}`;
  const cache = await bacaJsonMeta(db, kunci, null);
  const fetcher = _customBmkgFetcher || fetch;

  if (!paksaSegar && cache.nilai && cache.diubah) {
    const umurMs = Date.now() - new Date(cache.diubah).getTime();
    if (Number.isFinite(umurMs) && umurMs < CACHE_BMKG_MS && cache.nilai.sumber_ok) {
      return cache.nilai;
    }
  }

  try {
    const segar = await ambilPrakiraanBMKG(adm4, fetcher);
    await simpanJsonMeta(db, kunci, segar);
    return segar;
  } catch (e) {
    if (cache.nilai && cache.nilai.sumber_ok) {
      return {
        ...cache.nilai,
        catatan_cache: `Memakai cache BMKG terakhir (${e.message})`,
      };
    }
    return cadanganBMKGOffline(adm4, e.message);
  }
}

function kunciAlatSah(raw) {
  const s = String(raw || "").trim();
  const m = /^([A-Za-z0-9_-]{1,32}):(\d{1,3})$/.exec(s);
  return m ? { alatId: `${m[1]}:${Number(m[2])}`, stasiun: m[1], node: Number(m[2]) } : null;
}

async function bacaMetaLokasiCakupan(db, kunciUtama, kunciFallback, bawaan) {
  const utama = await bacaJsonMeta(db, kunciUtama, null);
  if (utama.nilai !== null) return utama;
  if (kunciFallback) {
    const fb = await bacaJsonMeta(db, kunciFallback, bawaan);
    if (fb.nilai !== null) return fb;
  }
  return { nilai: bawaan, diubah: null };
}

async function ambilLokasiUntukAlat(db, stasiun, node) {
  const nodeNum = Number(node);
  if (nodeNum === 0) {
    const langsung0 = await bacaJsonMeta(db, `lokasi_alat:${stasiun}:0`, null);
    if (langsung0.nilai) return { ...langsung0.nilai, unit: 0, tipe: "rumah", alat_id: `${stasiun}:0` };

    const perStasiun = await bacaJsonMeta(db, `lokasi_alat_stasiun:${stasiun}`, null);
    if (perStasiun.nilai) return { ...perStasiun.nilai, unit: 0, tipe: "rumah", alat_id: `${stasiun}:0` };

    if (stasiun === "RUMAH-01") {
      const legacy = await bacaJsonMeta(db, "lokasi_alat", null);
      if (legacy.nilai) return { ...legacy.nilai, unit: 0, tipe: "rumah", alat_id: `${stasiun}:0` };
    }
  } else {
    const perNode = await bacaJsonMeta(db, `lokasi_alat:${stasiun}:${nodeNum}`, null);
    if (perNode.nilai) return { ...perNode.nilai, unit: nodeNum, tipe: "lapangan", alat_id: `${stasiun}:${nodeNum}` };

    const perStasiun = await bacaJsonMeta(db, `lokasi_alat_stasiun:${stasiun}`, null);
    if (perStasiun.nilai) {
      return { ...perStasiun.nilai, unit: nodeNum, tipe: "lapangan", perkiraan_dari_rumah: true, alat_id: `${stasiun}:${nodeNum}` };
    }

    if (stasiun === "RUMAH-01" && nodeNum === 1) {
      const legacy = await bacaJsonMeta(db, "lokasi_alat", null);
      if (legacy.nilai) return { ...legacy.nilai, unit: 1, tipe: "lapangan", alat_id: `${stasiun}:1` };
    }
  }

  const stIpKhusus = await bacaJsonMeta(db, `lokasi_stasiun_ip:${stasiun}`, null);
  const ipSt = stIpKhusus.nilai || (stasiun === "RUMAH-01" ? (await bacaJsonMeta(db, "lokasi_stasiun_ip", null)).nilai : null);
  if (ipSt && Number.isFinite(Number(ipSt.lat))) {
    const baseFlags = {
      sumber: "IP Wi-Fi Stasiun Rumah",
      terkalibrasi: false,
      unit: nodeNum,
      tipe: nodeNum === 0 ? "rumah" : "lapangan",
      perkiraan_dari_rumah: nodeNum > 0,
      alat_id: `${stasiun}:${nodeNum}`,
    };
    if (ipSt.adm4) return { ...ipSt, ...baseFlags };
    try {
      const resSt = await cariAdm4DariKoordinat(ipSt.lat, ipSt.lon, {
        kotaHint: ipSt.kota,
        provKodeIso: ipSt.provKodeIso,
        sumber: "IP Wi-Fi Stasiun Rumah",
      });
      const gabungan = { ...ipSt, ...resSt, ...baseFlags };
      await simpanJsonMeta(db, `lokasi_stasiun_ip:${stasiun}`, gabungan);
      if (stasiun === "RUMAH-01") await simpanJsonMeta(db, "lokasi_stasiun_ip", gabungan);
      return gabungan;
    } catch {
      return { ...ipSt, adm4: null, ...baseFlags };
    }
  }
  return null;
}

async function kumpulkanDaftarAlat(db, ringkasanNode) {
  const stasiunSet = new Set();
  const sinkronMap = new Map();
  for (const s of ringkasanNode.stasiun || []) {
    const nama = String(s.kunci || "").slice("sinkron:".length);
    if (nama) {
      stasiunSet.add(nama);
      sinkronMap.set(nama, s.nilai);
    }
  }
  for (const n of ringkasanNode.terakhir || []) {
    if (n.stasiun) stasiunSet.add(String(n.stasiun));
  }
  const metaPerAlat = await db.getMetaAwalan("lokasi_alat:");
  for (const row of metaPerAlat || []) {
    const k = kunciAlatSah(row.kunci.slice("lokasi_alat:".length));
    if (k) stasiunSet.add(k.stasiun);
  }
  if (!stasiunSet.size) stasiunSet.add("RUMAH-01");

  const metaRumahRows = await db.getMetaAwalan("status_rumah:");
  const petaRumah = new Map();
  for (const row of metaRumahRows || []) {
    const nama = row.kunci.slice("status_rumah:".length);
    try {
      petaRumah.set(nama, JSON.parse(row.nilai));
    } catch {
      // Skip malformed station metadata
    }
  }

  const multiStasiun = stasiunSet.size > 1;
  const petaAlat = new Map();

  for (const st of stasiunSet) {
    const id0 = `${st}:0`;
    petaAlat.set(id0, {
      alat_id: id0,
      stasiun: st,
      node: 0,
      unit: 0,
      tipe: "rumah",
      label: multiStasiun ? `0 · ${st} (Rumah)` : "0 · Bagian Rumah",
      terbaca: null,
      rumah: petaRumah.get(st) || null,
      terakhir_sinkron: sinkronMap.get(st) || null,
    });
  }

  for (const n of ringkasanNode.terakhir || []) {
    const stasiun = String(n.stasiun || "RUMAH-01");
    const node = Number(n.node || 1);
    if (node <= 0) continue;
    const id = `${stasiun}:${node}`;
    petaAlat.set(id, {
      alat_id: id,
      stasiun,
      node,
      unit: node,
      tipe: "lapangan",
      label: multiStasiun ? `${node} · ${stasiun} (Lapangan)` : `${node} · Lapangan ${node}`,
      terbaca: n,
      rumah: petaRumah.get(stasiun) || null,
      terakhir_sinkron: sinkronMap.get(stasiun) || null,
    });
  }

  for (const row of metaPerAlat || []) {
    const k = kunciAlatSah(row.kunci.slice("lokasi_alat:".length));
    if (k && !petaAlat.has(k.alatId)) {
      petaAlat.set(k.alatId, {
        alat_id: k.alatId,
        stasiun: k.stasiun,
        node: k.node,
        unit: k.node,
        tipe: k.node === 0 ? "rumah" : "lapangan",
        label:
          k.node === 0
            ? multiStasiun
              ? `0 · ${k.stasiun} (Rumah)`
              : "0 · Bagian Rumah"
            : multiStasiun
              ? `${k.node} · ${k.stasiun} (Lapangan)`
              : `${k.node} · Lapangan ${k.node}`,
        terbaca: null,
        rumah: petaRumah.get(k.stasiun) || null,
        terakhir_sinkron: sinkronMap.get(k.stasiun) || null,
      });
    }
  }

  for (const st of stasiunSet) {
    const adaLapangan = [...petaAlat.values()].some((a) => a.stasiun === st && a.unit >= 1);
    if (!adaLapangan) {
      const id1 = `${st}:1`;
      petaAlat.set(id1, {
        alat_id: id1,
        stasiun: st,
        node: 1,
        unit: 1,
        tipe: "lapangan",
        label: multiStasiun ? `1 · ${st} (Lapangan)` : "1 · Lapangan 1",
        terbaca: null,
        rumah: petaRumah.get(st) || null,
        terakhir_sinkron: sinkronMap.get(st) || null,
      });
    }
  }

  const terurut = [...petaAlat.values()].sort((a, b) => a.stasiun.localeCompare(b.stasiun) || a.unit - b.unit);
  const hasil = [];
  for (const item of terurut) {
    const lok = await ambilLokasiUntukAlat(db, item.stasiun, item.node);
    hasil.push({
      alat_id: item.alat_id,
      stasiun: item.stasiun,
      node: item.node,
      unit: item.unit,
      tipe: item.tipe,
      label: item.label,
      wifi_rssi: item.rumah?.wifi_rssi ?? null,
      lora_ok: item.rumah?.lora_ok ?? true,
      terakhir_sinkron: item.terakhir_sinkron,
      lokasi: lok
        ? {
            adm4: lok.adm4 || null,
            desa: lok.desa || null,
            kecamatan: lok.kecamatan || null,
            kotkab: lok.kotkab || null,
            lat: lok.lat ?? null,
            lon: lok.lon ?? null,
            sumber: lok.sumber || null,
            terkalibrasi: Boolean(lok.terkalibrasi),
            gps_perangkat: Boolean(lok.gps_perangkat),
            pindah_terdeteksi: Boolean(lok.pindah_terdeteksi),
            perkiraan_dari_rumah: Boolean(lok.perkiraan_dari_rumah),
          }
        : null,
      sensor_ringkas: item.terbaca
        ? {
            lembap: item.terbaca.lembap ?? null,
            suhu: item.terbaca.suhu ?? null,
            baterai: item.terbaca.baterai ?? null,
            rssi: item.terbaca.rssi ?? null,
            snr: item.terbaca.snr ?? null,
            diterima: item.terbaca.diterima || null,
          }
        : null,
    });
  }
  return hasil;
}

async function selesaikanLokasiInfo(db, req, opsi = {}, alatTarget = { alatId: "RUMAH-01:1", stasiun: "RUMAH-01", node: 1 }) {
  const manualAlat = await bacaJsonMeta(db, `wilayah_adm4:${alatTarget.alatId}`, null);
  const manualMeta = manualAlat.nilai ? manualAlat : await bacaJsonMeta(db, "wilayah_adm4", null);
  const lokasiAlat = await ambilLokasiUntukAlat(db, alatTarget.stasiun, alatTarget.node);

  let lokasiPengguna = null;
  const latQ = opsi.lat !== undefined ? Number(opsi.lat) : NaN;
  const lonQ = opsi.lon !== undefined ? Number(opsi.lon) : NaN;
  if (Number.isFinite(latQ) && Number.isFinite(lonQ)) {
    try {
      lokasiPengguna = await cariAdm4DariKoordinat(latQ, lonQ, { sumber: "GPS Perangkat Anda" });
    } catch (e) {
      lokasiPengguna = { adm4: null, lat: latQ, lon: lonQ, pesan_galat: e.message, sumber: "GPS Perangkat Anda" };
    }
  } else {
    const geoUser = bacaGeoVercel(req);
    if (geoUser && geoUser.negara === "ID") {
      try {
        lokasiPengguna = await cariAdm4DariKoordinat(geoUser.lat, geoUser.lon, {
          kotaHint: geoUser.kota,
          provKodeIso: geoUser.provKodeIso,
          sumber: "IP Jaringan Anda",
        });
      } catch {
        lokasiPengguna = { adm4: null, lat: geoUser.lat, lon: geoUser.lon, sumber: "IP Jaringan Anda" };
      }
    }
  }

  const modeDiminta = opsi.mode || "otomatis";
  let adm4Aktif = ADM4_BAKU;
  let sumberAktif = "Bawaan (SMAN 1 Ngoro)";
  let titikRujukan = null;

  if (opsi.adm4) {
    adm4Aktif = opsi.adm4;
    sumberAktif = manualMeta.nilai?.adm4 === opsi.adm4 ? "Pilihan Wilayah" : "Wilayah Dipilih";
  } else if (modeDiminta === "pengguna" && lokasiPengguna?.adm4) {
    adm4Aktif = lokasiPengguna.adm4;
    sumberAktif = lokasiPengguna.sumber;
    titikRujukan = lokasiPengguna;
  } else if (modeDiminta === "alat" && lokasiAlat?.adm4) {
    adm4Aktif = lokasiAlat.adm4;
    sumberAktif = lokasiAlat.sumber;
    titikRujukan = lokasiAlat;
  } else if (modeDiminta === "manual" && manualMeta.nilai?.adm4) {
    adm4Aktif = manualMeta.nilai.adm4;
    sumberAktif = "Pilihan Desa Manual";
  } else if (lokasiAlat?.adm4) {
    adm4Aktif = lokasiAlat.adm4;
    sumberAktif = lokasiAlat.sumber;
    titikRujukan = lokasiAlat;
  } else if (lokasiPengguna?.adm4) {
    adm4Aktif = lokasiPengguna.adm4;
    sumberAktif = lokasiPengguna.sumber;
    titikRujukan = lokasiPengguna;
  } else if (manualMeta.nilai?.adm4) {
    adm4Aktif = manualMeta.nilai.adm4;
    sumberAktif = "Pilihan Desa";
  }

  return { adm4Aktif, sumberAktif, modeDiminta, lokasiAlat, lokasiPengguna, titikRujukan };
}

async function bangunRingkasanCuaca(db, opsi = {}, req = null) {
  const ringkasanNode = await db.ringkasan();
  const daftarAlat = await kumpulkanDaftarAlat(db, ringkasanNode);
  const dimintaAlat = kunciAlatSah(opsi.alat);
  const defaultLapangan = daftarAlat.find((a) => a.unit >= 1) || daftarAlat[0];
  const alatAktifItem = (dimintaAlat && daftarAlat.find((a) => a.alat_id === dimintaAlat.alatId)) || dimintaAlat || defaultLapangan;
  const alatTarget = {
    alatId: alatAktifItem.alat_id || `${alatAktifItem.stasiun}:${alatAktifItem.node}`,
    stasiun: alatAktifItem.stasiun,
    node: Number(alatAktifItem.node),
  };

  const infoLokasi = await selesaikanLokasiInfo(db, req, opsi, alatTarget);
  const adm4 = infoLokasi.adm4Aktif;
  const pakaiLegacyMeta = adm4 === ADM4_BAKU;

  const bmkg = await muatBMKGDenganCache(db, adm4, Boolean(opsi.segar));
  const riwayatHujanMeta = await bacaMetaLokasiCakupan(db, `lapor_hujan:${adm4}`, pakaiLegacyMeta ? "lapor_hujan" : null, []);
  const riwayatHujan = Array.isArray(riwayatHujanMeta.nilai) ? riwayatHujanMeta.nilai : [];

  const dasarianMeta = await bacaMetaLokasiCakupan(
    db,
    `dasarian_bmkg:${adm4}`,
    pakaiLegacyMeta ? "dasarian_bmkg" : null,
    defaultDasarian()
  );
  const dasarian = { ...defaultDasarian(), ...(dasarianMeta.nilai || {}) };

  const modulMeta = await bacaJsonMeta(db, "modul_node", { "1": ["inti"] });
  const ambangMeta = await bacaJsonMeta(db, "ambang_node", { "1": defaultAmbang() });
  const kalibrasiM4Meta = await bacaJsonMeta(db, "kalibrasi_m4", { kurva: [] });

  const sekarangMs = Date.now();
  const tglHariIni = tanggalWIB(new Date(sekarangMs));
  const hujan24JamMm =
    Math.round(
      riwayatHujan
        .filter((h) => sekarangMs - new Date(h.waktu).getTime() <= 24 * 3600 * 1000)
        .reduce((a, b) => a + Number(b.curah_mm || 0), 0) * 10
    ) / 10;

  const sudahLaporHariIni = riwayatHujan.some((h) => h.tanggal === tglHariIni);

  const kunciFfmc = `ffmc_status:${adm4}`;
  const ffmcMeta = await bacaMetaLokasiCakupan(db, kunciFfmc, pakaiLegacyMeta ? "ffmc_status" : null, null);
  let ffmcAwalHari = FFMC_AWAL_BAKU;
  if (ffmcMeta.nilai) {
    if (ffmcMeta.nilai.tanggal === tglHariIni && Number.isFinite(Number(ffmcMeta.nilai.ffmc_awal_hari))) {
      ffmcAwalHari = Number(ffmcMeta.nilai.ffmc_awal_hari);
    } else if (ffmcMeta.nilai.tanggal !== tglHariIni && Number.isFinite(Number(ffmcMeta.nilai.ffmc_sekarang))) {
      ffmcAwalHari = Number(ffmcMeta.nilai.ffmc_sekarang);
    }
  }

  const siang = bmkg.hari_ini || bmkg.saat_ini;
  const suhuSiang = siang?.suhu_siang ?? siang?.suhu;
  const rhSiang = siang?.rh_siang ?? siang?.rh;
  const anginSiang = siang?.angin_siang ?? siang?.angin_km_jam;
  const cuacaTersedia =
    bmkg.sumber_ok !== false &&
    Number.isFinite(Number(suhuSiang)) &&
    suhuSiang !== null &&
    Number.isFinite(Number(rhSiang)) &&
    rhSiang !== null &&
    Number.isFinite(Number(anginSiang)) &&
    anginSiang !== null;

  let ffmcHariIni = null;
  const proyeksiFfmc = [];

  if (cuacaTersedia) {
    ffmcHariIni = hitungFFMC(ffmcAwalHari, suhuSiang, rhSiang, anginSiang, hujan24JamMm);
    if (!ffmcMeta.nilai || ffmcMeta.nilai.tanggal !== tglHariIni || ffmcMeta.nilai.ffmc_sekarang !== ffmcHariIni) {
      const valFfmc = {
        tanggal: tglHariIni,
        ffmc_awal_hari: ffmcAwalHari,
        ffmc_sekarang: ffmcHariIni,
        hujan_24jam_mm: hujan24JamMm,
      };
      await simpanJsonMeta(db, kunciFfmc, valFfmc);
      if (pakaiLegacyMeta) await simpanJsonMeta(db, "ffmc_status", valFfmc);
    }

    let ffmcCursor = ffmcAwalHari;
    for (let i = 0; i < (bmkg.harian || []).length; i += 1) {
      const h = bmkg.harian[i];
      const hujanMasuk = i === 0 ? hujan24JamMm : 0;
      const nilai = i === 0 ? ffmcHariIni : hitungFFMC(ffmcCursor, h.suhu_siang, h.rh_siang, h.angin_siang, hujanMasuk);
      ffmcCursor = nilai;
      proyeksiFfmc.push({
        tanggal: h.tanggal,
        ffmc: nilai,
        status: hitungStatusKebakaran({ ffmc: nilai }).status,
        suhu_siang: h.suhu_siang,
        rh_siang: h.rh_siang,
        angin_siang: h.angin_siang,
        prakiraan_hujan_mm: h.prakiraan_hujan_mm,
      });
    }
  }

  const nodeUtama =
    ringkasanNode.terakhir.find(
      (n) => n.stasiun === alatTarget.stasiun && (alatTarget.node === 0 || Number(n.node) === alatTarget.node)
    ) ||
    ringkasanNode.terakhir.find((n) => alatTarget.node === 0 || Number(n.node) === alatTarget.node) ||
    ringkasanNode.terakhir[0] ||
    null;
  const nodeKey = String(alatTarget.node === 0 ? 1 : alatTarget.node);
  const modulNodeAktif = Array.isArray(modulMeta.nilai?.[nodeKey])
    ? modulMeta.nilai[nodeKey]
    : Array.isArray(modulMeta.nilai?.["1"])
      ? modulMeta.nilai["1"]
      : ["inti"];
  const ambangNodeAktif = {
    ...defaultAmbang(),
    ...(ambangMeta.nilai?.[nodeKey] || ambangMeta.nilai?.["1"] || {}),
  };

  const statusKebakaran = hitungStatusKebakaran({
    ffmc: ffmcHariIni,
    apiTerdeteksi: Boolean(nodeUtama?.api),
    lonjakanSuhuTanah: Boolean(nodeUtama?.t_tanah != null && nodeUtama.t_tanah >= 45),
    modulM1Aktif: modulNodeAktif.includes("M1"),
    modulM2Aktif: modulNodeAktif.includes("M2"),
  });

  const waktuTanam = hitungWaktuTanam({
    berjalan: dasarian.berjalan,
    berikutnya: dasarian.berikutnya,
    riwayatHujan,
    lembapTanah: nodeUtama ? nodeUtama.lembap : null,
    batasCukup: ambangNodeAktif.cukup,
  });

  const pengingatLaporHujan = Boolean(bmkg.hari_ini?.potensi_hujan && !sudahLaporHariIni);

  const anginInfo = kodeAnginKeDerajat(bmkg.saat_ini?.arah_angin, bmkg.saat_ini?.arah_angin_derajat);
  const alatLat = infoLokasi.lokasiAlat?.lat ?? (infoLokasi.lokasiAlat?.adm4 === bmkg.lokasi?.adm4 ? bmkg.lokasi?.lat : null);
  const alatLon = infoLokasi.lokasiAlat?.lon ?? (infoLokasi.lokasiAlat?.adm4 === bmkg.lokasi?.adm4 ? bmkg.lokasi?.lon : null);
  const userLat = infoLokasi.lokasiPengguna?.lat ?? null;
  const userLon = infoLokasi.lokasiPengguna?.lon ?? null;
  const cuacaLat = infoLokasi.titikRujukan?.lat ?? bmkg.lokasi?.lat ?? null;
  const cuacaLon = infoLokasi.titikRujukan?.lon ?? bmkg.lokasi?.lon ?? null;

  const keAlat =
    userLat != null && userLon != null && alatLat != null && alatLon != null
      ? { jarak_km: hitungJarakKm(userLat, userLon, alatLat, alatLon), ...hitungAzimutDanArah(userLat, userLon, alatLat, alatLon) }
      : null;
  const keCuaca =
    userLat != null && userLon != null && cuacaLat != null && cuacaLon != null
      ? { jarak_km: hitungJarakKm(userLat, userLon, cuacaLat, cuacaLon), ...hitungAzimutDanArah(userLat, userLon, cuacaLat, cuacaLon) }
      : null;

  const infoRumah = daftarAlat.find((a) => a.stasiun === alatTarget.stasiun && a.unit === 0) || null;
  const daftarLapangan = daftarAlat.filter((a) => a.stasiun === alatTarget.stasiun && a.unit >= 1);
  const lapanganAcuan =
    daftarLapangan.find((a) => a.alat_id === alatTarget.alatId) ||
    daftarLapangan.find((a) => a.stasiun === alatTarget.stasiun) ||
    daftarLapangan[0] ||
    null;
  const rumahLat = infoRumah?.lokasi?.lat ?? null;
  const rumahLon = infoRumah?.lokasi?.lon ?? null;
  const lapLat = lapanganAcuan?.lokasi?.lat ?? null;
  const lapLon = lapanganAcuan?.lokasi?.lon ?? null;
  const jarakRumahKeLap =
    rumahLat != null && rumahLon != null && lapLat != null && lapLon != null
      ? hitungJarakKm(rumahLat, rumahLon, lapLat, lapLon)
      : null;

  const waktuLokal = hitungInfoWaktuLokal(
    new Date(sekarangMs),
    tzOffsetDariWilayah({ adm4, lon: bmkg?.lokasi?.lon ?? cuacaLon })
  );

  return {
    ok: true,
    waktu_server: new Date().toISOString(),
    waktu: waktuLokal,
    alat_aktif: alatTarget.alatId,
    daftar_alat: daftarAlat,
    peta: {
      rumah: infoRumah,
      lapangan: daftarLapangan,
      pengguna: infoLokasi.lokasiPengguna || null,
      jarak_rumah_lapangan_km: jarakRumahKeLap,
    },
    wilayah: {
      adm4,
      mode: infoLokasi.modeDiminta,
      sumber_aktif: infoLokasi.sumberAktif,
      lokasi_alat: infoLokasi.lokasiAlat,
      lokasi_pengguna: infoLokasi.lokasiPengguna,
      daftar_desa: DAFTAR_DESA_NGORO,
    },
    bmkg,
    kompas_dan_angin: {
      titik_label: `Desa ${bmkg.lokasi.desa}, Kec. ${bmkg.lokasi.kecamatan}`,
      titik_lat: cuacaLat,
      titik_lon: cuacaLon,
      alat_lat: alatLat,
      alat_lon: alatLon,
      user_lat: userLat,
      user_lon: userLon,
      angin: {
        ...anginInfo,
        kecepatan_km_jam: bmkg.saat_ini?.angin_km_jam ?? null,
        kode_bmkg: bmkg.saat_ini?.arah_angin || "-",
        menuju_bmkg: bmkg.saat_ini?.arah_angin_menuju || anginInfo.menuju_kode_id,
      },
      jarak_arah_ke_alat: keAlat,
      jarak_arah_ke_cuaca: keCuaca,
    },
    ffmc: {
      nilai: ffmcHariIni,
      ffmc_awal_hari: ffmcAwalHari,
      tanggal: tglHariIni,
      masukan: {
        suhu_c: suhuSiang ?? null,
        rh_persen: rhSiang ?? null,
        angin_km_jam: anginSiang ?? null,
        jam_acuan: siang?.jam_acuan_siang || null,
        hujan_24jam_mm: hujan24JamMm,
        catatan_hujan:
          hujan24JamMm > 0
            ? `Laporan petani 24 jam: ${hujan24JamMm} mm`
            : "Belum ada laporan hujan hari ini (dianggap 0 mm agar condong waspada)",
      },
      proyeksi: proyeksiFfmc,
      status_kebakaran: statusKebakaran,
    },
    hujan: {
      total_24jam_mm: hujan24JamMm,
      sudah_lapor_hari_ini: sudahLaporHariIni,
      pengingat_lapor: pengingatLaporHujan,
      riwayat: riwayatHujan.slice(0, 14),
    },
    waktu_tanam: {
      ...waktuTanam,
      dasarian,
    },
    pengaturan: {
      katalog_modul: KATALOG_MODUL,
      modul_node: modulMeta.nilai || { "1": ["inti"] },
      ambang_node: ambangMeta.nilai || { "1": defaultAmbang() },
      kalibrasi_m4: kalibrasiM4Meta.nilai || { kurva: [] },
    },
  };
}

function opsiDariQuery(q = {}) {
  const adm4 = q.adm4 ? String(q.adm4).trim() : null;
  const lat = q.lat !== undefined ? angka(q.lat, -90, 90) : null;
  const lon = q.lon !== undefined ? angka(q.lon, -180, 180) : null;
  const mode = ["otomatis", "alat", "pengguna", "manual"].includes(q.mode) ? q.mode : "otomatis";
  const alat = q.alat ? String(q.alat).trim() : null;
  return {
    adm4: adm4 || undefined,
    lat: lat !== null ? lat : undefined,
    lon: lon !== null ? lon : undefined,
    mode,
    alat: alat || undefined,
    segar: q.segar === "1",
  };
}

export async function handleTelemetryWeather(req, res) {
  await tangani(res, async () => {
    const db = await penyimpanan();

    if (req.method === "GET") {
      const wJenis = req.query?.wilayah ? String(req.query.wilayah) : "";
      if (wJenis === "provinsi") return res.json({ ok: true, data: await ambilProvinsi() });
      if (wJenis === "kabupaten") return res.json({ ok: true, data: await ambilKabupaten(req.query.kode) });
      if (wJenis === "kecamatan") return res.json({ ok: true, data: await ambilKecamatan(req.query.kode) });
      if (wJenis === "desa") return res.json({ ok: true, data: await ambilDesa(req.query.kode) });

      const qAdm4 = req.query?.adm4 ? String(req.query.adm4).trim() : null;
      if (qAdm4 && !/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(qAdm4)) {
        return res.status(400).json({ ok: false, pesan: "Format kode desa adm4 tidak valid (contoh: 35.16.05.2010)" });
      }
      const data = await bangunRingkasanCuaca(db, opsiDariQuery(req.query), req);
      return res.json(data);
    }

    if (req.method === "POST") {
      const b = bacaBody(req);
      if (!b || !b.aksi) return res.status(400).json({ ok: false, pesan: 'Parameter "aksi" wajib diisi' });
      const opsiPost = opsiDariQuery({
        adm4: b.aktif_adm4,
        lat: b.aktif_lat,
        lon: b.aktif_lon,
        mode: b.aktif_mode,
        alat: b.aktif_alat || b.alat_id,
      });
      const targetAlat = kunciAlatSah(b.alat_id || b.aktif_alat) || { alatId: "RUMAH-01:1", stasiun: "RUMAH-01", node: 1 };
      const locInfoPost = await selesaikanLokasiInfo(db, req, opsiPost, targetAlat);
      const adm4Scope = locInfoPost.adm4Aktif;
      const pakaiLegacy = adm4Scope === ADM4_BAKU;

      if (b.aksi === "lapor_hujan") {
        const mm = angka(b.curah_mm, 0, 500);
        if (mm === null) return res.status(400).json({ ok: false, pesan: "Curah hujan harus angka 0 sampai 500 mm" });
        const meta = await bacaMetaLokasiCakupan(db, `lapor_hujan:${adm4Scope}`, pakaiLegacy ? "lapor_hujan" : null, []);
        const daftar = Array.isArray(meta.nilai) ? meta.nilai : [];
        const entri = {
          id: Date.now(),
          tanggal: tanggalWIB(),
          waktu: new Date().toISOString(),
          curah_mm: Math.round(mm * 10) / 10,
          catatan: String(b.catatan || "").trim().slice(0, 80),
        };
        const baru = [entri, ...daftar].slice(0, 60);
        await simpanJsonMeta(db, `lapor_hujan:${adm4Scope}`, baru);
        if (pakaiLegacy) await simpanJsonMeta(db, "lapor_hujan", baru);
        const hasil = await bangunRingkasanCuaca(db, opsiPost, req);
        return res.status(201).json({ ...hasil, pesan: `Laporan hujan ${entri.curah_mm} mm (${hasil.bmkg.lokasi.desa}) tersimpan.` });
      }

      if (b.aksi === "hapus_lapor_hujan") {
        const meta = await bacaMetaLokasiCakupan(db, `lapor_hujan:${adm4Scope}`, pakaiLegacy ? "lapor_hujan" : null, []);
        const daftar = Array.isArray(meta.nilai) ? meta.nilai : [];
        const idTarget = Number(b.id);
        const baru = idTarget ? daftar.filter((x) => Number(x.id) !== idTarget) : [];
        await simpanJsonMeta(db, `lapor_hujan:${adm4Scope}`, baru);
        if (pakaiLegacy) await simpanJsonMeta(db, "lapor_hujan", baru);
        const hasil = await bangunRingkasanCuaca(db, opsiPost, req);
        return res.json({ ...hasil, pesan: "Laporan hujan diperbarui." });
      }

      if (b.aksi === "atur_dasarian") {
        const berjalan = PELUANG_SAH.includes(b.berjalan) ? b.berjalan : null;
        const berikutnya = PELUANG_SAH.includes(b.berikutnya) ? b.berikutnya : null;
        if (!berjalan || !berikutnya) {
          return res.status(400).json({ ok: false, pesan: "Peluang dasarian harus rendah, sedang, atau tinggi" });
        }
        const dasarian = {
          periode: String(b.periode || "Dasarian Berjalan").trim().slice(0, 60) || "Dasarian Berjalan",
          berjalan,
          berikutnya,
          sumber: "BMKG Prediksi Hujan Dasarian >50 mm (input kelompok tani)",
          diperbarui: new Date().toISOString(),
        };
        await simpanJsonMeta(db, `dasarian_bmkg:${adm4Scope}`, dasarian);
        if (pakaiLegacy) await simpanJsonMeta(db, "dasarian_bmkg", dasarian);
        const hasil = await bangunRingkasanCuaca(db, opsiPost, req);
        return res.json({ ...hasil, pesan: `Prediksi peluang hujan dasarian (${hasil.bmkg.lokasi.desa}) diperbarui.` });
      }

      if (b.aksi === "tetapkan_lokasi_alat") {
        let info;
        if (b.lat !== undefined && b.lon !== undefined) {
          const lat = angka(b.lat, -90, 90);
          const lon = angka(b.lon, -180, 180);
          if (lat === null || lon === null) return res.status(400).json({ ok: false, pesan: "Koordinat GPS alat tidak valid" });
          info = await cariAdm4DariKoordinat(lat, lon, { sumber: "GPS Kalibrasi Alat" });
        } else {
          const adm4 = String(b.adm4 || "").trim();
          if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(adm4)) {
            return res.status(400).json({ ok: false, pesan: "Pilih desa atau kirim koordinat GPS untuk lokasi alat" });
          }
          const bm = await muatBMKGDenganCache(db, adm4, true);
          info = {
            adm4,
            desa: bm.lokasi.desa,
            kecamatan: bm.lokasi.kecamatan,
            kotkab: bm.lokasi.kotkab,
            provinsi: bm.lokasi.provinsi,
            lat: bm.lokasi.lat ?? null,
            lon: bm.lokasi.lon ?? null,
            sumber: "Pilihan Desa Alat",
          };
        }

        const wifiMeta = await bacaJsonMeta(db, `wifi_stasiun:${targetAlat.stasiun}`, null);
        const bssids = Array.isArray(wifiMeta.nilai?.ap) ? wifiMeta.nilai.ap.map((a) => a.bssid).filter(Boolean) : [];
        const terpisah = Boolean(b.terpisah) || targetAlat.node === 0 || targetAlat.node > 1;
        const rekaman = {
          ...info,
          alat_id: targetAlat.alatId,
          stasiun: targetAlat.stasiun,
          node: targetAlat.node,
          unit: targetAlat.node,
          tipe: targetAlat.node === 0 ? "rumah" : "lapangan",
          terpisah,
          bssids,
          terkalibrasi: true,
          pindah_terdeteksi: false,
          diperbarui: new Date().toISOString(),
        };
        await simpanJsonMeta(db, `lokasi_alat:${targetAlat.alatId}`, rekaman);
        if (targetAlat.node === 0 || (!b.terpisah && targetAlat.node === 1)) {
          await simpanJsonMeta(db, `lokasi_alat_stasiun:${targetAlat.stasiun}`, rekaman);
        }
        if (!b.terpisah && targetAlat.alatId === "RUMAH-01:1") {
          await simpanJsonMeta(db, "lokasi_alat", rekaman);
        }

        if (bssids.length && (targetAlat.node === 0 || !b.terpisah)) {
          const profilMeta = await bacaJsonMeta(db, "wifi_lokasi_profil", []);
          const profilLama = Array.isArray(profilMeta.nilai) ? profilMeta.nilai.filter((p) => p.adm4 !== info.adm4) : [];
          await simpanJsonMeta(
            db,
            "wifi_lokasi_profil",
            [{ ...info, bssids, diperbarui: rekaman.diperbarui }, ...profilLama].slice(0, 16)
          );
        }

        const hasil = await bangunRingkasanCuaca(db, { mode: "alat", adm4: info.adm4, alat: targetAlat.alatId, segar: true }, req);
        return res.json({
          ...hasil,
          pesan: `GPS Unit ${targetAlat.node} (${info.desa}) diperbarui.`,
        });
      }

      if (b.aksi === "atur_wilayah") {
        const adm4 = String(b.adm4 || "").trim();
        if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(adm4)) {
          return res.status(400).json({ ok: false, pesan: "Format kode wilayah adm4 tidak valid (contoh: 35.16.05.2010)" });
        }
        await simpanJsonMeta(db, `wilayah_adm4:${targetAlat.alatId}`, { adm4 });
        await simpanJsonMeta(db, "wilayah_adm4", { adm4 });
        const hasil = await bangunRingkasanCuaca(db, { adm4, mode: "manual", alat: targetAlat.alatId, segar: true }, req);
        return res.json({
          ...hasil,
          pesan: `Wilayah BMKG diatur ke ${hasil.bmkg.lokasi.desa}, Kec. ${hasil.bmkg.lokasi.kecamatan}.`,
        });
      }

      if (b.aksi === "atur_modul") {
        const node = angka(b.node ?? 1, 1, 255);
        if (node === null || !Array.isArray(b.modul)) {
          return res.status(400).json({ ok: false, pesan: "Node dan daftar modul harus valid" });
        }
        const bersih = ["inti", ...new Set(b.modul.filter((m) => m !== "inti" && MODUL_SAH.has(m)))];
        const meta = await bacaJsonMeta(db, "modul_node", { "1": ["inti"] });
        const peta = meta.nilai && typeof meta.nilai === "object" ? meta.nilai : {};
        peta[String(node)] = bersih;
        await simpanJsonMeta(db, "modul_node", peta);
        const hasil = await bangunRingkasanCuaca(db, opsiPost, req);
        return res.json({ ...hasil, pesan: `Konfigurasi modul Node ${node} diperbarui.` });
      }

      if (b.aksi === "atur_ambang") {
        const node = angka(b.node ?? 1, 1, 255);
        const kering = angka(b.kering, 5, 85);
        const cukup = angka(b.cukup, 10, 95);
        const suhuMin = angka(b.suhuMin ?? 20, -10, 35);
        const suhuMax = angka(b.suhuMax ?? 35, 20, 70);
        if (node === null || kering === null || cukup === null || kering >= cukup || suhuMin === null || suhuMax === null || suhuMin >= suhuMax) {
          return res.status(400).json({ ok: false, pesan: "Nilai ambang tidak valid (pastikan batas kering < cukup dan suhu min < maks)" });
        }
        const meta = await bacaJsonMeta(db, "ambang_node", { "1": defaultAmbang() });
        const peta = meta.nilai && typeof meta.nilai === "object" ? meta.nilai : {};
        peta[String(node)] = { kering, cukup, suhuMin, suhuMax };
        await simpanJsonMeta(db, "ambang_node", peta);
        const hasil = await bangunRingkasanCuaca(db, opsiPost, req);
        return res.json({ ...hasil, pesan: `Ambang batas Node ${node} tersimpan.` });
      }

      return res.status(400).json({ ok: false, pesan: "Aksi tidak dikenal" });
    }

    return res.status(405).json({ ok: false, pesan: "Metode tidak didukung" });
  });
}

export async function handleTelemetryData(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, pesan: "Gunakan GET" });
  await tangani(res, async () => {
    const db = await penyimpanan();
    const [, r] = await Promise.all([db.setMeta("aplikasi_dibuka", new Date(Date.now()).toISOString()), db.ringkasan()]);
    const metaRumahRows = Array.isArray(r.statusRumah)
      ? r.statusRumah
      : typeof db.getMetaAwalan === "function"
        ? await db.getMetaAwalan("status_rumah:")
        : [];
    const petaRumah = new Map();
    for (const row of metaRumahRows || []) {
      const nama = row.kunci.slice("status_rumah:".length);
      try {
        petaRumah.set(nama, JSON.parse(row.nilai));
      } catch {
        // Ignore malformed station row
      }
    }
    const waktu = r.waktu || hitungInfoWaktuLokal(Date.now(), resolusiTzOffsetDariMeta(r.lokasiMeta || metaRumahRows || []));
    const pengiriman = hitungPengirimanEfektif(r.pengiriman, waktu);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      waktu_server: new Date(Date.now()).toISOString(),
      waktu,
      node: r.terakhir,
      riwayat: r.riwayat,
      perintah_aktif: r.aktif,
      pengiriman,
      batas_detik: r.batas_detik ?? hitungBatasDetik(pengiriman, null, waktu),
      stasiun: r.stasiun.map((s) => {
        const nama = s.kunci.slice("sinkron:".length);
        const m = petaRumah.get(nama) || null;
        return {
          nama,
          unit: 0,
          terakhir: s.nilai,
          wifi_rssi: m?.wifi_rssi ?? null,
          ssid: m?.ssid ?? null,
          lora_ok: m ? m.lora_ok !== false : null,
          uptime_detik: m?.uptime_detik ?? null,
          pengiriman: m?.pengiriman ?? null,
          waktu: m?.waktu ?? null,
          status_node: Array.isArray(m?.status_node) ? m.status_node : [],
        };
      }),
    });
  });
}

export async function handleTelemetryCommand(req, res) {
  await tangani(res, async () => {
    const db = await penyimpanan();

    if (req.method === "GET") {
      const id = angka(req.query.id, 1, 1e12);
      if (!id) return res.status(400).json({ ok: false, pesan: "id tidak valid" });
      const p = await db.bacaPerintah(id);
      if (!p) return res.status(404).json({ ok: false, pesan: "Perintah tidak ditemukan" });
      return res.status(200).json({ ok: true, perintah: p });
    }

    if (req.method === "POST") {
      const body = bacaBody(req);
      if (!body) return res.status(400).json({ ok: false, pesan: "Body bukan JSON" });
      const aksi = AKSI_PERINTAH.includes(body.aksi) ? body.aksi : null;
      if (!aksi) return res.status(400).json({ ok: false, pesan: "Aksi tidak dikenal" });

      if (aksi === "atur_pengiriman") {
        const ubahMalamSaja = body.mode === undefined && (body.hemat_malam !== undefined || body.interval_malam_detik !== undefined);
        const modeRaw = body.mode === undefined ? (ubahMalamSaja ? undefined : "jadwal") : String(body.mode);
        if (modeRaw !== undefined && modeRaw !== "terus" && modeRaw !== "jadwal") {
          return res.status(400).json({ ok: false, pesan: 'Mode pengiriman harus "terus" atau "jadwal"' });
        }
        let ivBulat;
        if (body.interval_detik !== undefined) {
          const interval = angka(body.interval_detik, 1, 60);
          if (interval === null) {
            return res.status(400).json({ ok: false, pesan: "Interval harus antara 1 sampai 60 detik" });
          }
          ivBulat = Math.round(interval);
        } else if (modeRaw !== undefined) {
          ivBulat = modeRaw === "terus" ? 1 : 4;
        }
        let ivMalamBulat;
        if (body.interval_malam_detik !== undefined) {
          const ivMalam = angka(body.interval_malam_detik, 1, 60);
          if (ivMalam === null) {
            return res.status(400).json({ ok: false, pesan: "Interval malam harus antara 1 sampai 60 detik" });
          }
          ivMalamBulat = Math.round(ivMalam);
        }
        const opsiMalam = {
          ...(body.hemat_malam !== undefined ? { hemat_malam: Boolean(body.hemat_malam) } : {}),
          ...(ivMalamBulat !== undefined ? { interval_malam_detik: ivMalamBulat } : {}),
        };
        const [cfg, metaRumah, lokasiRows, wilayahRows] = await Promise.all([
          db.simpanPengiriman(modeRaw, ivBulat, opsiMalam),
          typeof db.getMetaAwalan === "function" ? db.getMetaAwalan("status_rumah:") : Promise.resolve([]),
          typeof db.getMetaAwalan === "function" ? db.getMetaAwalan("lokasi_") : Promise.resolve([]),
          typeof db.getMetaAwalan === "function" ? db.getMetaAwalan("wilayah_adm4") : Promise.resolve([]),
          db.setMeta("aplikasi_dibuka", new Date(Date.now()).toISOString()),
        ]);
        const tzOffset = resolusiTzOffsetDariMeta([...(metaRumah || []), ...(lokasiRows || []), ...(wilayahRows || [])]);
        const waktu = hitungInfoWaktuLokal(Date.now(), tzOffset);
        const pengiriman = hitungPengirimanEfektif(cfg, waktu);
        const batas_detik = hitungBatasDetik(pengiriman, ekstrakNodeCfgDariStatusRumah(metaRumah), waktu);
        return res.status(200).json({
          ok: true,
          pengiriman,
          waktu,
          batas_detik,
          pesan: pengiriman.aktif_malam
            ? `Hemat malam aktif (${pengiriman.interval_malam_detik} detik).`
            : pengiriman.mode_efektif === "terus"
              ? "Mode Kirim Terus aktif (sinkron di ACK berikutnya)."
              : `Mode Terjadwal ${pengiriman.interval_detik} detik aktif (hemat daya saat jeda).`,
        });
      }

      const node = angka(body.node, 1, 250);
      if (!node) return res.status(400).json({ ok: false, pesan: "Nomor node tidak valid" });
      const [p] = await Promise.all([db.buatPerintah(node, aksi), db.setMeta("aplikasi_dibuka", new Date(Date.now()).toISOString())]);
      return res.status(p.baru ? 201 : 200).json({ ok: true, perintah: p });
    }

    return res.status(405).json({ ok: false, pesan: "Gunakan GET atau POST" });
  });
}

function normalisasiWifiSekitar(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => ({
      bssid: String(x?.bssid || "").trim().toUpperCase(),
      rssi: angka(x?.rssi, -120, 0) ?? -99,
      ssid: String(x?.ssid || "").trim().slice(0, 32),
    }))
    .filter((x) => /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(x.bssid))
    .slice(0, 6);
}

async function simpanGpsPerangkat(db, kunciMeta, lat, lon, sumberLabel, ekstra = {}) {
  const prev = _cacheGpsAlat.get(kunciMeta);
  const bergeser = !prev || Math.abs(prev.lat - lat) > 0.0004 || Math.abs(prev.lon - lon) > 0.0004 || Date.now() - prev.ts > 5 * 60000;
  if (!bergeser) return null;
  let info;
  try {
    info = await cariAdm4DariKoordinat(lat, lon, { sumber: sumberLabel });
  } catch {
    info = { adm4: null, lat, lon, sumber: sumberLabel };
  }
  const rekaman = {
    ...info,
    ...ekstra,
    lat,
    lon,
    terkalibrasi: Boolean(info.adm4),
    gps_perangkat: true,
    pindah_terdeteksi: false,
    diperbarui: new Date().toISOString(),
  };
  _cacheGpsAlat.set(kunciMeta, { lat, lon, ts: Date.now() });
  await db.setMeta(kunciMeta, JSON.stringify(rekaman));
  return rekaman;
}

async function perbaruiLokasiStasiunDanNode(db, stasiun, rekaman, tulisStasiun = true) {
  if (tulisStasiun) {
    await db.setMeta(`lokasi_alat_stasiun:${stasiun}`, JSON.stringify(rekaman));
  }
  if (stasiun === "RUMAH-01") {
    await db.setMeta("lokasi_alat", JSON.stringify(rekaman));
  }
  const perNodeRows = await db.getMetaAwalan(`lokasi_alat:${stasiun}:`);
  for (const row of perNodeRows || []) {
    const lama = bacaJsonAman(row);
    if (lama?.gps_node || lama?.terpisah) continue;
    const m = /:(\d+)$/.exec(row.kunci);
    const nodeNum = m ? Number(m[1]) : 1;
    if (nodeNum === 0) continue;
    await db.setMeta(row.kunci, JSON.stringify({ ...rekaman, node: nodeNum, alat_id: `${stasiun}:${nodeNum}` }));
  }
}

async function prosesLokasiSinkron(db, req, stasiun, body, daftarGpsNode) {
  const wifiList = normalisasiWifiSekitar(body.wifi_sekitar);
  const bssidSet = new Set(wifiList.map((w) => w.bssid));

  if (wifiList.length) {
    const lamaWifi = bacaJsonAman(await db.getMeta(`wifi_stasiun:${stasiun}`));
    const bssidLama = (lamaWifi?.ap || []).map((x) => x.bssid).join(",");
    const bssidBaru = wifiList.map((x) => x.bssid).join(",");
    if (bssidLama !== bssidBaru || !lamaWifi?.diperbarui || Date.now() - new Date(lamaWifi.diperbarui).getTime() > 10 * 60000) {
      await db.setMeta(`wifi_stasiun:${stasiun}`, JSON.stringify({ stasiun, ap: wifiList, diperbarui: new Date().toISOString() }));
    }
  }

  let adaGpsStasiunBaru = false;
  if (body.lokasi && body.lokasi.lat !== undefined && body.lokasi.lon !== undefined) {
    const lat = angka(body.lokasi.lat, -90, 90);
    const lon = angka(body.lokasi.lon, -180, 180);
    if (lat !== null && lon !== null) {
      adaGpsStasiunBaru = true;
      const sumberLabel = body.lokasi.sumber === "uji_serial_stasiun" ? "Simulasi Pindah Stasiun" : "GPS Stasiun Rumah";
      const hasil = await simpanGpsPerangkat(db, `lokasi_alat_stasiun:${stasiun}`, lat, lon, sumberLabel, { stasiun });
      if (hasil) {
        await perbaruiLokasiStasiunDanNode(db, stasiun, hasil, false);
      }
    }
  }

  for (const gn of daftarGpsNode) {
    const kunciNode = `lokasi_alat:${stasiun}:${gn.node}`;
    const hasilNode = await simpanGpsPerangkat(db, kunciNode, gn.lat, gn.lon, "GPS Node Lapangan", {
      stasiun,
      node: gn.node,
      alat_id: `${stasiun}:${gn.node}`,
      gps_node: true,
    });
    if (hasilNode && stasiun === "RUMAH-01" && gn.node === 1) {
      await db.setMeta("lokasi_alat", JSON.stringify(hasilNode));
    }
  }

  if (!adaGpsStasiunBaru && bssidSet.size > 0) {
    const profil = bacaJsonAman(await db.getMeta("wifi_lokasi_profil"));
    const daftarProfil = Array.isArray(profil) ? profil : [];
    const cocokProfil = daftarProfil.find((p) => {
      const bssids = Array.isArray(p.bssids) ? p.bssids : [];
      const kena = bssids.filter((b) => bssidSet.has(b)).length;
      return kena >= 2 || (bssids.length === 1 && kena === 1) || (wifiList[0]?.bssid && bssids[0] === wifiList[0].bssid);
    });
    if (cocokProfil?.adm4) {
      const saatIni = bacaJsonAman(await db.getMeta(`lokasi_alat_stasiun:${stasiun}`));
      if (!saatIni || (!saatIni.gps_perangkat && saatIni.adm4 !== cocokProfil.adm4)) {
        const update = {
          ...cocokProfil,
          stasiun,
          sumber: "Auto Wi-Fi Lokasi Tersimpan",
          terkalibrasi: true,
          otomatis_wifi: true,
          pindah_terdeteksi: false,
          diperbarui: new Date().toISOString(),
        };
        await perbaruiLokasiStasiunDanNode(db, stasiun, update);
      }
    }
  }

  const geoStasiun = bacaGeoVercel(req);
  if (geoStasiun && geoStasiun.negara === "ID") {
    const prev = _cacheGeoStasiun.get(stasiun);
    const berubah =
      !prev ||
      Math.abs(prev.lat - geoStasiun.lat) > 0.01 ||
      Math.abs(prev.lon - geoStasiun.lon) > 0.01 ||
      Date.now() - prev.ts > 30 * 60000;
    if (berubah) {
      const ipLama = bacaJsonAman(await db.getMeta(`lokasi_stasiun_ip:${stasiun}`));
      const nilaiGeo = { ...geoStasiun, stasiun, diperbarui: new Date().toISOString() };
      _cacheGeoStasiun.set(stasiun, { ...geoStasiun, ts: Date.now() });
      await db.setMeta(`lokasi_stasiun_ip:${stasiun}`, JSON.stringify(nilaiGeo));
      await db.setMeta("lokasi_stasiun_ip", JSON.stringify(nilaiGeo));

      if (!adaGpsStasiunBaru && ipLama && bssidSet.size > 0) {
        const jarakIp = hitungJarakKm(ipLama.lat, ipLama.lon, geoStasiun.lat, geoStasiun.lon);
        const kunciSaatIni =
          bacaJsonAman(await db.getMeta(`lokasi_alat_stasiun:${stasiun}`)) ||
          (stasiun === "RUMAH-01" ? bacaJsonAman(await db.getMeta("lokasi_alat")) : null);
        const bssidTerkunci = Array.isArray(kunciSaatIni?.bssids) ? kunciSaatIni.bssids : [];
        const masihSamaWifi = bssidTerkunci.some((b) => bssidSet.has(b));
        if (jarakIp !== null && jarakIp > 25 && kunciSaatIni && !kunciSaatIni.gps_perangkat && !masihSamaWifi) {
          try {
            const pindahan = await cariAdm4DariKoordinat(geoStasiun.lat, geoStasiun.lon, {
              kotaHint: geoStasiun.kota,
              provKodeIso: geoStasiun.provKodeIso,
              sumber: "Auto Pindah Lokasi (IP Wi-Fi)",
            });
            const baru = { ...pindahan, stasiun, terkalibrasi: false, pindah_terdeteksi: true, diperbarui: new Date().toISOString() };
            await perbaruiLokasiStasiunDanNode(db, stasiun, baru);
          } catch {
            // Keep existing IP fallback if lookup fails transiently
          }
        }
      }
    }
  }
}

export async function handleTelemetrySync(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, pesan: "Gunakan POST" });
  if (!tokenStasiunBenar(req)) return res.status(401).json({ ok: false, pesan: "Token stasiun salah" });
  const body = bacaBody(req);
  if (!body) return res.status(400).json({ ok: false, pesan: "Body bukan JSON" });

  await tangani(res, async () => {
    const db = await penyimpanan();
    const stasiun = String(body.stasiun || "RUMAH-01").slice(0, 32);

    for (const l of Array.isArray(body.laporan) ? body.laporan : []) {
      const id = angka(l.id, 1, 1e12);
      if (id && l.status === "diteruskan") await db.tandaiDiteruskan(id);
    }

    let tersimpan = 0;
    const selesai = [];
    const daftarGpsNode = [];
    for (const d of Array.isArray(body.data) ? body.data.slice(0, 100) : []) {
      const node = angka(d.node, 1, 250);
      const seq = angka(d.seq, 0, 65535);
      if (node === null || seq === null) continue;
      if (d.gps && d.gps.lat !== undefined && d.gps.lon !== undefined) {
        const gLat = angka(d.gps.lat, -90, 90);
        const gLon = angka(d.gps.lon, -180, 180);
        if (gLat !== null && gLon !== null) daftarGpsNode.push({ node, lat: gLat, lon: gLon });
      }
      const bersih = {
        node,
        seq,
        jenis: d.jenis === "sampel" ? "sampel" : "rutin",
        lembap: angka(d.lembap, 0, 100),
        suhu: angka(d.suhu, -20, 100),
        baterai: angka(d.baterai, 0, 10),
        rssi: angka(d.rssi, -200, 20),
        snr: angka(d.snr, -40, 40),
        api: Boolean(d.api),
        t_tanah: angka(d.t_tanah, -40, 200),
        umur_detik: angka(d.umur_detik, 0, 86400) ?? 0,
      };
      const id = await db.simpanBacaan(stasiun, bersih);
      tersimpan += 1;
      const token = angka(d.token, 0, 65535);
      if (bersih.jenis === "sampel" && token !== null) {
        const p = await db.selesaikanSampel(node, token, id);
        if (p) selesai.push(p);
      }
    }

    for (const gn of Array.isArray(body.lokasi_node) ? body.lokasi_node.slice(0, 16) : []) {
      const node = angka(gn?.node, 1, 250);
      const gLat = angka(gn?.lat, -90, 90);
      const gLon = angka(gn?.lon, -180, 180);
      if (node !== null && gLat !== null && gLon !== null) {
        daftarGpsNode.push({ node, lat: gLat, lon: gLon });
      }
    }

    const srRaw = body.status_rumah && typeof body.status_rumah === "object" ? body.status_rumah : {};
    const statusNodeBersih = Array.isArray(body.status_node)
      ? body.status_node
          .slice(0, 16)
          .map((sn) => ({
            node: angka(sn?.node, 1, 250),
            aktif: Boolean(sn?.aktif),
            detik_lalu: angka(sn?.detik_lalu, 0, 864000),
            rssi: angka(sn?.rssi, -200, 20),
            snr: angka(sn?.snr, -40, 40),
            mode: sn?.mode === "terus" || sn?.mode === "jadwal" ? sn.mode : null,
            interval_detik: angka(sn?.interval_detik, 1, 60),
            waktu_sah: Boolean(sn?.waktu_sah),
            periode: sn?.periode === "malam" ? "malam" : sn?.periode === "siang" ? "siang" : null,
            siang: sn?.siang !== undefined && sn?.siang !== null ? Boolean(sn.siang) : null,
          }))
          .filter((sn) => sn.node !== null)
      : [];
    const pgRumahRaw = body.pengiriman && typeof body.pengiriman === "object" ? body.pengiriman : null;
    const pengirimanRumah = pgRumahRaw
      ? {
          mode: pgRumahRaw.mode === "terus" ? "terus" : "jadwal",
          interval_detik: angka(pgRumahRaw.interval_detik, 1, 60) ?? 4,
        }
      : null;
    const srWaktuRaw = srRaw.waktu && typeof srRaw.waktu === "object" ? srRaw.waktu : null;
    const waktuRumah = srWaktuRaw
      ? {
          sah: Boolean(srWaktuRaw.sah),
          sumber: srWaktuRaw.sumber ? String(srWaktuRaw.sumber).trim().slice(0, 16) : null,
          epoch_utc: angka(srWaktuRaw.epoch_utc, 1577836800, 4102444800),
          tz_offset_menit: angka(srWaktuRaw.tz_offset_menit, -720, 840),
          jam_teks: /^\d{2}:\d{2}(:\d{2})?$/.test(String(srWaktuRaw.jam_teks || "")) ? String(srWaktuRaw.jam_teks) : null,
          periode: srWaktuRaw.periode === "malam" ? "malam" : srWaktuRaw.periode === "siang" ? "siang" : null,
          siang: srWaktuRaw.siang !== undefined && srWaktuRaw.siang !== null ? Boolean(srWaktuRaw.siang) : null,
        }
      : null;
    const wifiRssi = angka(srRaw.wifi_rssi ?? body.wifi_rssi, -120, 0);
    const statusRumahMeta = {
      stasiun,
      unit: 0,
      wifi_rssi: wifiRssi,
      ssid: String(srRaw.ssid || body.wifi_sekitar?.[0]?.ssid || "").trim().slice(0, 32) || null,
      lora_ok: srRaw.lora_ok !== false,
      uptime_detik: angka(srRaw.uptime_detik, 0, 1e9),
      pengiriman: pengirimanRumah,
      waktu: waktuRumah,
      status_node: statusNodeBersih,
      terakhir_sinkron: new Date(Date.now()).toISOString(),
    };
    const [, , , perintah, sedangAktif, pengirimanDasar, lokasiRows, wilayahRows] = await Promise.all([
      db.setMeta("sinkron:" + stasiun, statusRumahMeta.terakhir_sinkron),
      db.setMeta("status_rumah:" + stasiun, JSON.stringify(statusRumahMeta)),
      prosesLokasiSinkron(db, req, stasiun, body, daftarGpsNode),
      db.ambilPerintahBaru(stasiun),
      db.aplikasiAktif(3),
      db.bacaPengiriman(),
      typeof db.getMetaAwalan === "function" ? db.getMetaAwalan("lokasi_") : Promise.resolve([]),
      typeof db.getMetaAwalan === "function" ? db.getMetaAwalan("wilayah_adm4") : Promise.resolve([]),
    ]);
    const tzOffset = resolusiTzOffsetDariMeta(
      [...(lokasiRows || []), ...(wilayahRows || []), { kunci: `status_rumah:${stasiun}`, nilai: JSON.stringify(statusRumahMeta) }],
      stasiun
    );
    const waktu = hitungInfoWaktuLokal(Date.now(), tzOffset);
    const pengiriman = hitungPengirimanEfektif(pengirimanDasar, waktu);
    const baruUbahKirim = pengiriman.diperbarui && Date.now() - new Date(pengiriman.diperbarui).getTime() < 90000;
    const poll =
      perintah.length ||
      sedangAktif ||
      baruUbahKirim ||
      pengiriman.mode_efektif === "terus" ||
      pengiriman.interval_efektif <= 3
        ? POLL_CEPAT
        : POLL_HEMAT;
    res.status(200).json({ ok: true, tersimpan, selesai, perintah, poll, pengiriman, waktu });
  });
}

