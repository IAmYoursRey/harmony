// BMKG forecast normalization, Van Wagner (1987) / cffdrs FFMC calculation, fire danger classification, and planting readiness logic.

export const ADM4_BAKU = "35.16.05.2010";
export const FFMC_AWAL_BAKU = 85.0;

export const DAFTAR_DESA_NGORO = [
  { adm4: "35.16.05.2010", nama: "Desa Ngoro, Kec. Ngoro" },
  { adm4: "35.16.05.2001", nama: "Desa Srigading, Kec. Ngoro" },
  { adm4: "35.16.05.2002", nama: "Desa Kesemen, Kec. Ngoro" },
  { adm4: "35.16.05.2003", nama: "Desa Kutogirang, Kec. Ngoro" },
  { adm4: "35.16.05.2004", nama: "Desa Lolawang, Kec. Ngoro" },
  { adm4: "35.16.05.2005", nama: "Desa Wotanmasjedong, Kec. Ngoro" },
  { adm4: "35.16.05.2006", nama: "Desa Tanjangrono, Kec. Ngoro" },
  { adm4: "35.16.05.2007", nama: "Desa Kunjorowesi, Kec. Ngoro" },
  { adm4: "35.16.05.2008", nama: "Desa Manduro Manggunggajah, Kec. Ngoro" },
  { adm4: "35.16.05.2009", nama: "Desa Wonosari, Kec. Ngoro" },
  { adm4: "35.16.05.2011", nama: "Desa Sedati, Kec. Ngoro" },
  { adm4: "35.16.05.2012", nama: "Desa Purwojati, Kec. Ngoro" },
  { adm4: "35.16.05.2013", nama: "Desa Jasem, Kec. Ngoro" },
  { adm4: "35.16.05.2014", nama: "Desa Sukoanyar, Kec. Ngoro" },
  { adm4: "35.16.05.2015", nama: "Desa Bandarasri, Kec. Ngoro" },
  { adm4: "35.16.05.2016", nama: "Desa Kembangsri, Kec. Ngoro" },
  { adm4: "35.16.05.2017", nama: "Desa Candiharjo, Kec. Ngoro" },
  { adm4: "35.16.05.2018", nama: "Desa Watesnegoro, Kec. Ngoro" },
  { adm4: "35.16.05.2019", nama: "Desa Tambakrejo, Kec. Ngoro" },
];

export const KATALOG_MODUL = [
  { id: "inti", kode: "Inti", wajib: true, nama: "Node Inti + NTC 3950", fungsi: "Kelembapan tanah kapasitif, suhu kotak/lingkungan, baterai, LoRa 922 MHz", pin: "GPIO34, NTC GPIO35, LoRa SPI", biaya: "Rp260.000" },
  { id: "M1", kode: "M1", wajib: false, nama: "Suhu Tanah (DS18B20)", fungsi: "Pantau suhu tanah dan indikator ganda modul api", pin: "1-Wire GPIO4 (pull-up 4,7 kΩ)", biaya: "Rp15.000" },
  { id: "M2", kode: "M2", wajib: false, nama: "Sensor Api IR", fungsi: "Deteksi nyala api di sekitar lahan (dipasang bersama M1)", pin: "Digital GPIO33", biaya: "Rp6.000" },
  { id: "M3", kode: "M3", wajib: false, nama: "Sawah AWD (-15 cm / +3 cm)", fungsi: "Tanda AIRI / TUNGGU / CUKUP lewat pelampung pipa pantau", pin: "Digital GPIO13 & GPIO21", biaya: "Rp12.000–24.000" },
  { id: "M4", kode: "M4", wajib: false, nama: "Daya Dukung Tanah (Penetrometer)", fungsi: "Kalibrasi kurva kelembapan vs Tp untuk keselamatan traktor", pin: "Kalibrasi manual di aplikasi", biaya: "Rp20.000" },
  { id: "M5", kode: "M5", wajib: false, nama: "Siram Otomatis (Relai Pompa)", fungsi: "Kendali pompa lokal sesuai batas kering dan waktu pengaman", pin: "Digital GPIO32", biaya: "Rp15.000" },
  { id: "M6", kode: "M6", wajib: false, nama: "Titik Kelembapan Kedua", fungsi: "Sensor kelembapan di kedalaman atau titik tambahan", pin: "Analog GPIO35", biaya: "Rp12.000" },
  { id: "M7", kode: "M7", wajib: false, nama: "Kesuburan NPK + pH (RS485)", fungsi: "Pemantauan hara N, P, K, pH, EC (opsional eksperimental)", pin: "UART RX16/TX17 + DE/RE 27", biaya: "±Rp1.265.000" },
];

export function tanggalWIB(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function hitungFFMC(ffmcSebelumnya, suhuC, kelembapanRh, anginKmJam, hujan24JamMm) {
  if (
    suhuC === null ||
    suhuC === undefined ||
    kelembapanRh === null ||
    kelembapanRh === undefined ||
    anginKmJam === null ||
    anginKmJam === undefined
  ) {
    return null;
  }
  const f0 = Math.max(0, Math.min(101, Number.isFinite(Number(ffmcSebelumnya)) ? Number(ffmcSebelumnya) : FFMC_AWAL_BAKU));
  const t = Number.isFinite(Number(suhuC)) ? Number(suhuC) : 30;
  const h = Math.max(0.1, Math.min(100, Number.isFinite(Number(kelembapanRh)) ? Number(kelembapanRh) : 70));
  const w = Math.max(0, Number.isFinite(Number(anginKmJam)) ? Number(anginKmJam) : 5);
  const r0 = Math.max(0, Number.isFinite(Number(hujan24JamMm)) ? Number(hujan24JamMm) : 0);

  let mo = (147.2 * (101 - f0)) / (59.5 + f0);

  if (r0 > 0.5) {
    const rf = r0 - 0.5;
    let mr = mo + 42.5 * rf * Math.exp(-100 / (251 - mo)) * (1 - Math.exp(-6.93 / rf));
    if (mo > 150) {
      mr += 0.0015 * Math.pow(mo - 150, 2) * Math.sqrt(rf);
    }
    mo = Math.min(250, mr);
  }

  const ed =
    0.942 * Math.pow(h, 0.679) +
    11 * Math.exp((h - 100) / 10) +
    0.18 * (21.1 - t) * (1 - Math.exp(-0.115 * h));

  const ew =
    0.618 * Math.pow(h, 0.753) +
    10 * Math.exp((h - 100) / 10) +
    0.18 * (21.1 - t) * (1 - Math.exp(-0.115 * h));

  let m = mo;
  if (mo > ed) {
    const ko =
      0.424 * (1 - Math.pow(h / 100, 1.7)) +
      0.0694 * Math.sqrt(w) * (1 - Math.pow(h / 100, 8));
    const kd = ko * 0.581 * Math.exp(0.0365 * t);
    m = ed + (mo - ed) * Math.pow(10, -kd);
  } else if (mo < ew) {
    const k1 =
      0.424 * (1 - Math.pow((100 - h) / 100, 1.7)) +
      0.0694 * Math.sqrt(w) * (1 - Math.pow((100 - h) / 100, 8));
    const kw = k1 * 0.581 * Math.exp(0.0365 * t);
    m = ew - (ew - mo) * Math.pow(10, -kw);
  }

  const ffmc = (59.5 * (250 - m)) / (147.2 + m);
  return Math.round(Math.max(0, Math.min(101, ffmc)) * 10) / 10;
}

export function kelasFFMC(ffmc) {
  if (ffmc === null || ffmc === undefined || !Number.isFinite(Number(ffmc))) {
    return { status: "OFFLINE", keterangan: "Data cuaca BMKG tidak tersedia", nada: "offline" };
  }
  const n = Number(ffmc);
  if (n <= 72.5) {
    return { status: "AMAN", keterangan: "Bahan basah, sulit terbakar", nada: "aman" };
  }
  if (n < 78) {
    return { status: "WASPADA", keterangan: "Lembap, cukup sulit terbakar", nada: "waspada" };
  }
  return { status: "SIAGA", keterangan: "Kering, mudah terbakar", nada: "siaga" };
}

export function hitungStatusKebakaran({
  ffmc,
  apiTerdeteksi = false,
  lonjakanSuhuTanah = false,
  modulM1Aktif = false,
  modulM2Aktif = false,
}) {
  const kelas = kelasFFMC(ffmc);
  if (modulM1Aktif && modulM2Aktif && apiTerdeteksi && lonjakanSuhuTanah) {
    return {
      status: "BAHAYA",
      nada: "bahaya",
      interval: "Segera (Alarm Prioritas)",
      judul: "Nyala Api & Lonjakan Suhu Tanah Terdeteksi Bersamaan",
      saran: "Buzzer Stasiun Rumah dibunyikan dan notifikasi prioritas dikirim. Segera periksa lokasi lahan.",
      kelas_ffmc: kelas.keterangan,
    };
  }
  if (apiTerdeteksi || lonjakanSuhuTanah || (ffmc !== null && Number(ffmc) >= 78)) {
    const pemicu =
      apiTerdeteksi || lonjakanSuhuTanah
        ? "Salah satu indikator api lapangan muncul"
        : `FFMC ${ffmc} (≥ 78: kering, mudah terbakar)`;
    return {
      status: "SIAGA",
      nada: "siaga",
      interval: "1 menit (node bermodul api)",
      judul: pemicu,
      saran: "Jangan bakar sisa panen; olah menjadi kompos. Hubungi tetangga atau kelompok tani bila ada asap.",
      kelas_ffmc: kelas.keterangan,
    };
  }
  if (ffmc === null || ffmc === undefined || !Number.isFinite(Number(ffmc))) {
    return {
      status: "OFFLINE",
      nada: "offline",
      interval: "Menunggu data BMKG",
      judul: "Indeks FFMC tidak tersedia (BMKG offline)",
      saran: "Layanan prakiraan BMKG gagal dijangkau saat ini. Periksa koneksi jaringan atau pilih wilayah lain.",
      kelas_ffmc: kelas.keterangan,
    };
  }
  const ffmcNum = Number(ffmc);
  if (ffmcNum > 72.5) {
    return {
      status: "WASPADA",
      nada: "waspada",
      interval: "10 menit",
      judul: `FFMC ${ffmcNum} (73–77: bahan permukaan mulai mengering)`,
      saran: "Jangan membakar sisa panen; olah menjadi kompos dan pantau kondisi angin siang hari.",
      kelas_ffmc: kelas.keterangan,
    };
  }
  return {
    status: "AMAN",
    nada: "aman",
    interval: "10 menit",
    judul: `FFMC ${ffmcNum} (≤ 72: bahan basah, sulit terbakar)`,
    saran: "Risiko kebakaran rendah. Tetap hindari pembakaran terbuka agar unsur hara tanah terjaga.",
    kelas_ffmc: kelas.keterangan,
  };
}

export function hitungWaktuTanam({
  berjalan = "sedang",
  berikutnya = "sedang",
  riwayatHujan = [],
  lembapTanah = null,
  batasCukup = 40,
  sekarang = new Date(),
}) {
  const tujuhHariLalu = sekarang.getTime() - 7 * 86400000;
  const lapHujan = (riwayatHujan || []).filter((h) => {
    const t = new Date(h.waktu || h.tanggal).getTime();
    return Number.isFinite(t) && t >= tujuhHariLalu && Number(h.curah_mm) > 0;
  });
  const total7HariMm = Math.round(lapHujan.reduce((a, b) => a + Number(b.curah_mm || 0), 0) * 10) / 10;
  const adaHujan = lapHujan.length > 0;
  const lembapNum =
    lembapTanah !== null && lembapTanah !== undefined && Number.isFinite(Number(lembapTanah)) ? Number(lembapTanah) : null;
  const tanahCukup = lembapNum !== null && lembapNum >= batasCukup;

  let teksLaporan = "Belum ada laporan hujan 7 hari terakhir";
  if (adaHujan) {
    const terbaru = [...lapHujan].sort((a, b) => new Date(b.waktu || b.tanggal) - new Date(a.waktu || a.tanggal))[0];
    const selisihHari = Math.max(
      0,
      Math.floor((sekarang.getTime() - new Date(terbaru.waktu || terbaru.tanggal).getTime()) / 86400000)
    );
    teksLaporan =
      selisihHari === 0
        ? `Hujan dilaporkan hari ini (${terbaru.curah_mm} mm)`
        : `Hujan ${selisihHari} hari terakhir (${total7HariMm} mm / 7 hari)`;
  }

  let indikasi = "PANTAU";
  let nada = "pantau";
  let alasan = "";

  if (berjalan === "tinggi" && berikutnya === "tinggi" && adaHujan && tanahCukup) {
    indikasi = "INDIKASI SIAP TANAM";
    nada = "siap";
    alasan = `Peluang hujan >50 mm tinggi pada 2 dasarian berurutan, ${teksLaporan.toLowerCase()}, dan kelembapan tanah (${lembapNum.toFixed(1)} %) sudah di atas batas cukup (${batasCukup} %).`;
  } else if (berjalan === "rendah" && berikutnya !== "tinggi" && !adaHujan) {
    indikasi = "BELUM SIAP";
    nada = "belum";
    alasan = "Peluang hujan dasarian >50 mm rendah dan belum ada laporan hujan dari petani.";
  } else {
    indikasi = "PANTAU";
    nada = "pantau";
    if (!adaHujan) {
      alasan = `Peluang hujan >50 mm dasarian berjalan ${berjalan} (berikutnya ${berikutnya}), namun belum ada laporan hujan lapangan.`;
    } else if (lembapNum === null) {
      alasan = `${teksLaporan}; menunggu pembacaan kelembapan tanah dari node untuk memastikan kesiapan olah lahan.`;
    } else if (!tanahCukup) {
      alasan = `${teksLaporan}, namun kelembapan tanah (${lembapNum.toFixed(1)} %) masih di bawah batas cukup (${batasCukup} %).`;
    } else {
      alasan = `Kelembapan tanah (${lembapNum.toFixed(1)} %) sudah cukup, tetapi peluang hujan >50 mm pada dua dasarian ke depan belum sama-sama tinggi.`;
    }
  }

  return {
    indikasi,
    nada,
    alasan,
    ada_hujan_7hari: adaHujan,
    total_hujan_7hari_mm: total7HariMm,
    tanah_cukup: tanahCukup,
    teks_laporan: teksLaporan,
    catatan_penyuluh: "Status merupakan data pendukung keputusan; tetap padukan dengan arahan penyuluh pertanian setempat.",
  };
}

export function normalisasiDataBMKG(json, adm4) {
  const item = Array.isArray(json?.data) && json.data.length ? json.data[0] : null;
  if (!item) throw new Error("Format data BMKG tidak sesuai atau kode wilayah tidak ditemukan");

  const lok = item.lokasi || json.lokasi || {};
  const daftarSlot = (item.cuaca || [])
    .flat()
    .map((s) => {
      const lokal = String(s.local_datetime || "");
      const [tanggal = "", jamFull = ""] = lokal.split(" ");
      return {
        waktu_lokal: lokal,
        tanggal,
        jam: jamFull.slice(0, 5),
        utc_datetime: s.utc_datetime || s.datetime || "",
        suhu: Number(s.t),
        rh: Number(s.hu),
        angin_km_jam: Number(s.ws),
        arah_angin: s.wd || "-",
        arah_angin_derajat: Number.isFinite(Number(s.wd_deg)) ? Math.round(Number(s.wd_deg)) : null,
        arah_angin_menuju: s.wd_to || null,
        hujan_mm: Number(s.tp || 0),
        tutupan_awan: Number(s.tcc || 0),
        kode_cuaca: Number(s.weather || 0),
        cuaca: s.weather_desc || "-",
        ikon_url: s.image ? String(s.image).replace(/ /g, "%20") : "",
      };
    })
    .filter((s) => s.tanggal && Number.isFinite(s.suhu));

  if (!daftarSlot.length) throw new Error("Slot prakiraan BMKG kosong");

  const sekarangIso = tanggalWIB();
  const sekarangWibStr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  let saatIni = daftarSlot[0];
  let selisihMin = Infinity;
  const targetMs = Date.parse(sekarangWibStr.replace(" ", "T") + "+07:00");
  for (const s of daftarSlot) {
    const ms = Date.parse(s.waktu_lokal.replace(" ", "T") + "+07:00");
    const d = Math.abs(ms - targetMs);
    if (Number.isFinite(d) && d < selisihMin) {
      selisihMin = d;
      saatIni = s;
    }
  }

  const perTanggal = new Map();
  for (const s of daftarSlot) {
    if (!perTanggal.has(s.tanggal)) perTanggal.set(s.tanggal, []);
    perTanggal.get(s.tanggal).push(s);
  }

  const harian = [];
  for (const [tanggal, slots] of perTanggal.entries()) {
    // Anchor daily FFMC evaluation around 12:00 local solar peak
    let slotSiang = slots[0];
    let jarak12 = Infinity;
    for (const s of slots) {
      const jamNum = Number(s.jam.split(":")[0]);
      const d = Math.abs(jamNum - 12);
      if (d < jarak12) {
        jarak12 = d;
        slotSiang = s;
      }
    }
    const hujanTotalMm = Math.round(slots.reduce((a, b) => a + (Number.isFinite(b.hujan_mm) ? b.hujan_mm : 0), 0) * 10) / 10;
    const adaHujan = slots.some((s) => s.hujan_mm >= 0.5 || /hujan|petir/i.test(s.cuaca));
    harian.push({
      tanggal,
      suhu_siang: slotSiang.suhu,
      rh_siang: slotSiang.rh,
      angin_siang: slotSiang.angin_km_jam,
      jam_acuan_siang: slotSiang.jam,
      suhu_min: Math.min(...slots.map((s) => s.suhu)),
      suhu_maks: Math.max(...slots.map((s) => s.suhu)),
      prakiraan_hujan_mm: hujanTotalMm,
      potensi_hujan: adaHujan,
      cuaca: slotSiang.cuaca,
      ikon_url: slotSiang.ikon_url,
    });
  }

  const hariIniData = harian.find((h) => h.tanggal === sekarangIso) || harian[0];
  const per3Jam = daftarSlot
    .filter((s) => Date.parse(s.waktu_lokal.replace(" ", "T") + "+07:00") >= targetMs - 3 * 3600 * 1000)
    .slice(0, 8);

  return {
    sumber_ok: true,
    cadangan: false,
    sumber: "BMKG (api.bmkg.go.id)",
    diambil_pada: new Date().toISOString(),
    lokasi: {
      adm4: lok.adm4 || adm4,
      desa: lok.desa || "Ngoro",
      kecamatan: lok.kecamatan || "Ngoro",
      kotkab: lok.kotkab || "Mojokerto",
      provinsi: lok.provinsi || "Jawa Timur",
      lat: Number.isFinite(Number(lok.lat)) ? Number(lok.lat) : null,
      lon: Number.isFinite(Number(lok.lon)) ? Number(lok.lon) : null,
    },
    saat_ini: saatIni,
    hari_ini: hariIniData,
    harian: harian.slice(0, 3),
    per_3_jam: per3Jam.length ? per3Jam : daftarSlot.slice(0, 8),
  };
}

export async function ambilPrakiraanBMKG(adm4 = ADM4_BAKU, fetcher = fetch) {
  const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`;
  const r = await fetcher(url, {
    headers: { Accept: "application/json", "User-Agent": "Harmony-FieldTelemetry/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    throw new Error(`BMKG merespons HTTP ${r.status}`);
  }
  const json = await r.json();
  return normalisasiDataBMKG(json, adm4);
}

