import { pool } from "../../repositories/repository.js";

// Lifecycle of "ambil_sampel" commands: menunggu -> diambil -> diteruskan -> selesai | kedaluwarsa.
export const BATAS_DETIK = 20;
const AKTIF = ["menunggu", "diambil", "diteruskan"];
const KODE_PROVINSI_WITA = new Set(["51", "52", "53", "63", "64", "65", "71", "72", "73", "74", "75", "76"]);
const KODE_PROVINSI_WIT = new Set(["81", "82", "91", "92", "93", "94", "95", "96"]);

let _forceMemoryStorage = false;
let _db = null;

export function __resetTelemetryStorageForTest({ useMemory = true } = {}) {
  _db = null;
  _forceMemoryStorage = Boolean(useMemory);
}

export function tzOffsetDariWilayah({ adm4, lon, tzOffset } = {}) {
  if (tzOffset !== undefined && tzOffset !== null && Number.isFinite(Number(tzOffset))) {
    const clamped = Math.max(-720, Math.min(840, Number(tzOffset)));
    return Math.round(clamped / 15) * 15;
  }
  const admStr = String(adm4 || "").trim();
  const prov = admStr.slice(0, 2);
  if (KODE_PROVINSI_WIT.has(prov)) return 540;
  if (KODE_PROVINSI_WITA.has(prov)) return 480;
  if (/^\d{2}$/.test(prov)) return 420;
  const lonNum = lon !== undefined && lon !== null && lon !== "" ? Number(lon) : NaN;
  if (Number.isFinite(lonNum)) {
    if (lonNum >= 125) return 540;
    if (lonNum >= 114.5) return 480;
  }
  return 420;
}

export function resolusiTzOffsetDariMeta(rows, stasiun = null) {
  const peta = new Map();
  for (const r of rows || []) {
    if (!r?.kunci || !r?.nilai) continue;
    try {
      peta.set(r.kunci, typeof r.nilai === "string" ? JSON.parse(r.nilai) : r.nilai);
    } catch {
      // Ignore malformed JSON metadata rows
    }
  }
  const kandidatKunci = stasiun
    ? [
        `lokasi_alat:${stasiun}:1`,
        `lokasi_alat:${stasiun}:0`,
        `lokasi_alat_stasiun:${stasiun}`,
        `lokasi_stasiun_ip:${stasiun}`,
        `wilayah_adm4:${stasiun}:1`,
      ]
    : [];
  kandidatKunci.push("wilayah_adm4", "lokasi_alat", "lokasi_stasiun_ip");
  for (const k of kandidatKunci) {
    const v = peta.get(k);
    if (v && (v.adm4 || Number.isFinite(Number(v.lon)) || v.tz_offset_menit != null)) {
      return tzOffsetDariWilayah({ adm4: v.adm4, lon: v.lon, tzOffset: v.tz_offset_menit });
    }
  }
  for (const [k, v] of peta.entries()) {
    if (
      (k.startsWith("wilayah_adm4") || k.startsWith("lokasi_alat") || k.startsWith("lokasi_stasiun_ip")) &&
      v &&
      (v.adm4 || Number.isFinite(Number(v.lon)))
    ) {
      return tzOffsetDariWilayah({ adm4: v.adm4, lon: v.lon });
    }
  }
  if (stasiun) {
    const sr = peta.get(`status_rumah:${stasiun}`);
    if (sr?.waktu?.tz_offset_menit != null) {
      return tzOffsetDariWilayah({ tzOffset: sr.waktu.tz_offset_menit });
    }
  }
  return 420;
}

export function hitungInfoWaktuLokal(now = Date.now(), tzOffsetMenit = 420) {
  const ref = now instanceof Date ? now : new Date(now);
  const tsMs = Number.isFinite(ref.getTime()) ? ref.getTime() : Date.now();
  const offsetMenit = Number.isFinite(Number(tzOffsetMenit))
    ? Math.max(-720, Math.min(840, Math.round(Number(tzOffsetMenit))))
    : 420;
  const lokal = new Date(tsMs + offsetMenit * 60000);
  const jam = lokal.getUTCHours();
  const menit = lokal.getUTCMinutes();
  const detik = lokal.getUTCSeconds();
  const tahun = lokal.getUTCFullYear();
  const bulan = lokal.getUTCMonth() + 1;
  const tanggal = lokal.getUTCDate();
  const siang = jam >= 6 && jam < 18;
  const periode = siang ? "siang" : "malam";
  const pad2 = (n) => String(n).padStart(2, "0");
  const tz_label =
    offsetMenit === 540
      ? "WIT"
      : offsetMenit === 480
        ? "WITA"
        : offsetMenit === 420
          ? "WIB"
          : `UTC${offsetMenit >= 0 ? "+" : ""}${offsetMenit / 60}`;
  return {
    epoch_utc: Math.floor(tsMs / 1000),
    iso_utc: new Date(tsMs).toISOString(),
    tz_offset_menit: offsetMenit,
    tz_label,
    tahun,
    bulan,
    tanggal,
    jam,
    menit,
    detik,
    jam_teks: `${pad2(jam)}:${pad2(menit)}`,
    waktu_lengkap: `${pad2(jam)}:${pad2(menit)}:${pad2(detik)}`,
    tanggal_lokal: `${tahun}-${pad2(bulan)}-${pad2(tanggal)}`,
    periode,
    siang,
  };
}

export function normalisasiKonfigPengiriman(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }
  const mode = obj?.mode === "terus" ? "terus" : "jadwal";
  const ivNum = Number(obj?.interval_detik);
  const interval_detik = Number.isFinite(ivNum) ? Math.max(1, Math.min(60, Math.round(ivNum))) : 4;
  const hemat_malam = Boolean(obj?.hemat_malam);
  const ivMalamNum = Number(obj?.interval_malam_detik);
  const interval_malam_detik = Number.isFinite(ivMalamNum) ? Math.max(1, Math.min(60, Math.round(ivMalamNum))) : 30;
  return {
    mode,
    interval_detik,
    hemat_malam,
    interval_malam_detik,
    diperbarui: obj?.diperbarui || null,
  };
}

export function hitungPengirimanEfektif(cfg, waktuInfo = null) {
  const dasar = normalisasiKonfigPengiriman(cfg);
  const waktu = waktuInfo || hitungInfoWaktuLokal();
  const aktifMalam = Boolean(dasar.hemat_malam && !waktu.siang);
  const mode_efektif = aktifMalam ? "jadwal" : dasar.mode;
  const interval_efektif = aktifMalam
    ? dasar.interval_malam_detik
    : dasar.mode === "terus"
      ? 1
      : dasar.interval_detik;
  return {
    ...dasar,
    mode_efektif,
    interval_efektif,
    aktif_malam: aktifMalam,
    periode: waktu.periode,
  };
}

export function hitungBatasDetik(cfg, nodeCfg = null, waktuInfo = null) {
  const eff = hitungPengirimanEfektif(cfg, waktuInfo);
  const targetIv = eff.mode_efektif === "terus" ? 1 : Number(eff.interval_efektif || 4);
  const nodeIv =
    nodeCfg && nodeCfg.mode === "jadwal" && Number.isFinite(Number(nodeCfg.interval_detik))
      ? Math.max(1, Math.min(60, Math.round(Number(nodeCfg.interval_detik))))
      : 1;
  const iv = Math.max(targetIv, nodeIv);
  return iv > 5 ? Math.max(BATAS_DETIK, Math.min(90, iv + 18)) : BATAS_DETIK;
}

export function ekstrakNodeCfgDariStatusRumah(rows, nodeFilter = null) {
  let maksIv = null;
  let terpilih = null;
  for (const row of rows || []) {
    if (!row?.nilai) continue;
    let j = null;
    try {
      j = JSON.parse(row.nilai);
    } catch {
      j = null;
    }
    for (const sn of Array.isArray(j?.status_node) ? j.status_node : []) {
      if (nodeFilter != null && Number(sn?.node) !== Number(nodeFilter)) continue;
      if (sn?.mode !== "jadwal" && sn?.mode !== "terus") continue;
      const iv = sn.mode === "terus" ? 1 : Number(sn.interval_detik || 4);
      if (maksIv === null || iv > maksIv) {
        maksIv = iv;
        terpilih = { mode: sn.mode, interval_detik: iv };
      }
    }
  }
  return terpilih;
}

function denganStatusAkhir(p, batas = BATAS_DETIK) {
  if (!p) return p;
  const umurDetik = (Date.now() - new Date(p.dibuat).getTime()) / 1000;
  if (AKTIF.includes(p.status) && umurDetik > batas) {
    return { ...p, status_terakhir: p.status, status: "kedaluwarsa" };
  }
  return p;
}

function createPoolSqlTag(pgPool) {
  return async function sql(strings, ...values) {
    let text = "";
    for (let i = 0; i < strings.length; i += 1) {
      text += strings[i];
      if (i < values.length) {
        text += `$${i + 1}`;
      }
    }
    const res = await pgPool.query(text, values);
    return res.rows;
  };
}

// Prefixed telemetry_* tables prevent name collisions inside Harmony's shared PostgreSQL schema.
export async function buatSql(sql) {
  await sql`create table if not exists telemetry_bacaan (
    id bigserial primary key,
    stasiun text not null,
    node int not null,
    seq int not null,
    jenis text not null default 'rutin',
    lembap real,
    suhu real,
    baterai real,
    rssi real,
    snr real,
    diterima timestamptz not null default now())`;
  await sql`alter table telemetry_bacaan add column if not exists suhu real`;
  await sql`create table if not exists telemetry_perintah (
    id bigserial primary key,
    node int not null,
    aksi text not null,
    status text not null default 'menunggu',
    stasiun text,
    dibuat timestamptz not null default now(),
    diambil timestamptz,
    diteruskan timestamptz,
    selesai timestamptz,
    bacaan_id bigint)`;
  await sql`create table if not exists telemetry_meta (
    kunci text primary key,
    nilai text,
    diubah timestamptz not null default now())`;

  const bacaKonfigSql = async () => {
    const r = await sql`select nilai, diubah from telemetry_meta where kunci = 'konfig_pengiriman' limit 1`;
    if (!r.length) return normalisasiKonfigPengiriman(null);
    return normalisasiKonfigPengiriman(r[0].nilai);
  };
  const bacaBatasSql = async (nodeFilter = null) => {
    const rows = await sql`select kunci, nilai from telemetry_meta
      where kunci = 'konfig_pengiriman' or kunci like 'status_rumah:%' or kunci like 'lokasi_%' or kunci like 'wilayah_adm4%'`;
    const cfg = normalisasiKonfigPengiriman(rows.find((x) => x.kunci === "konfig_pengiriman")?.nilai);
    const nodeCfg = ekstrakNodeCfgDariStatusRumah(
      rows.filter((x) => x.kunci.startsWith("status_rumah:")),
      nodeFilter
    );
    const waktuInfo = hitungInfoWaktuLokal(Date.now(), resolusiTzOffsetDariMeta(rows));
    return { cfg, nodeCfg, waktuInfo, batas: hitungBatasDetik(cfg, nodeCfg, waktuInfo) };
  };

  return {
    async bacaPengiriman() {
      return await bacaKonfigSql();
    },
    async simpanPengiriman(mode, intervalDetik, opsi = {}) {
      const sebelum = await bacaKonfigSql();
      const cfg = normalisasiKonfigPengiriman({
        mode: mode ?? sebelum.mode,
        interval_detik: intervalDetik ?? sebelum.interval_detik,
        hemat_malam: opsi.hemat_malam !== undefined ? Boolean(opsi.hemat_malam) : sebelum.hemat_malam,
        interval_malam_detik: opsi.interval_malam_detik !== undefined ? opsi.interval_malam_detik : sebelum.interval_malam_detik,
        diperbarui: new Date(Date.now()).toISOString(),
      });
      await sql`insert into telemetry_meta (kunci, nilai, diubah) values ('konfig_pengiriman', ${JSON.stringify(cfg)}, now())
        on conflict (kunci) do update set nilai = excluded.nilai, diubah = now()`;
      return cfg;
    },
    async simpanBacaan(stasiun, d) {
      const umurDetik = Number(d.umur_detik || 0);
      const [r] = await sql`insert into telemetry_bacaan (stasiun, node, seq, jenis, lembap, suhu, baterai, rssi, snr, diterima)
        values (${stasiun}, ${d.node}, ${d.seq}, ${d.jenis}, ${d.lembap}, ${d.suhu ?? null}, ${d.baterai}, ${d.rssi}, ${d.snr},
                now() - make_interval(secs => ${umurDetik}::double precision))
        returning id`;
      return Number(r.id);
    },
    async selesaikanSampel(node, token, bacaanId) {
      const r = await sql`update telemetry_perintah set status = 'selesai', selesai = now(), bacaan_id = ${bacaanId}
        where id = (select id from telemetry_perintah where node = ${node} and (id % 65536) = ${token}
                    and status in ('menunggu', 'diambil', 'diteruskan') order by id desc limit 1)
        returning id`;
      return r.length ? Number(r[0].id) : null;
    },
    async tandaiDiteruskan(id) {
      await sql`update telemetry_perintah set status = 'diteruskan', diteruskan = now()
        where id = ${id} and status in ('menunggu', 'diambil')`;
    },
    async ambilPerintahBaru(stasiun) {
      const { batas } = await bacaBatasSql();
      const r = await sql`update telemetry_perintah set status = 'diambil', diambil = now(), stasiun = ${stasiun}
        where status = 'menunggu' and dibuat > now() - make_interval(secs => ${Number(batas)}::double precision)
        returning id, node, aksi`;
      return r.map((p) => ({ id: Number(p.id), node: p.node, aksi: p.aksi }));
    },
    async buatPerintah(node, aksi) {
      const { batas } = await bacaBatasSql(node);
      const ada = await sql`select * from telemetry_perintah where node = ${node} and aksi = ${aksi}
        and status in ('menunggu', 'diambil', 'diteruskan') and dibuat > now() - make_interval(secs => ${Number(batas)}::double precision)
        order by id desc limit 1`;
      if (ada.length) {
        const item = denganStatusAkhir(ada[0], batas);
        if (item.status !== "kedaluwarsa") return { ...item, id: Number(item.id), baru: false };
      }
      const [p] = await sql`insert into telemetry_perintah (node, aksi) values (${node}, ${aksi}) returning *`;
      return { ...p, id: Number(p.id), baru: true };
    },
    async bacaPerintah(id) {
      const [r, batasInfo] = await Promise.all([
        sql`select p.*, b.lembap, b.suhu, b.baterai, b.rssi, b.snr, b.diterima as waktu_sampel
          from telemetry_perintah p left join telemetry_bacaan b on b.id = p.bacaan_id where p.id = ${id}`,
        bacaBatasSql(),
      ]);
      if (!r.length) return null;
      const nodeCfg =
        ekstrakNodeCfgDariStatusRumah(
          await sql`select nilai from telemetry_meta where kunci like 'status_rumah:%'`,
          r[0].node
        ) || batasInfo.nodeCfg;
      const batas = hitungBatasDetik(batasInfo.cfg, nodeCfg, batasInfo.waktuInfo);
      return denganStatusAkhir({ ...r[0], id: Number(r[0].id) }, batas);
    },
    async ringkasan() {
      const [terakhir, riwayat, aktif, metaRows] = await Promise.all([
        sql`select distinct on (stasiun, node) * from telemetry_bacaan order by stasiun, node, diterima desc`,
        sql`select stasiun, node, jenis, lembap, suhu, baterai, diterima from telemetry_bacaan
          where diterima > now() - interval '24 hours' order by diterima desc limit 400`,
        sql`select id, node, aksi, status, dibuat from telemetry_perintah
          where status in ('menunggu', 'diambil', 'diteruskan') and dibuat > now() - interval '90 seconds'
          order by id desc limit 20`,
        sql`select kunci, nilai from telemetry_meta
          where kunci like 'sinkron:%' or kunci = 'konfig_pengiriman' or kunci like 'status_rumah:%' or kunci like 'lokasi_%' or kunci like 'wilayah_adm4%'`,
      ]);
      const konfigRow = metaRows.find((m) => m.kunci === "konfig_pengiriman");
      const statusRumah = metaRows.filter((m) => m.kunci.startsWith("status_rumah:"));
      const lokasiMeta = metaRows.filter((m) => m.kunci.startsWith("lokasi_") || m.kunci.startsWith("wilayah_adm4"));
      const waktu = hitungInfoWaktuLokal(Date.now(), resolusiTzOffsetDariMeta(metaRows));
      const pengiriman = hitungPengirimanEfektif(konfigRow?.nilai, waktu);
      const nodeCfg = ekstrakNodeCfgDariStatusRumah(statusRumah);
      const batas_detik = hitungBatasDetik(pengiriman, nodeCfg, waktu);
      const stasiun = metaRows.filter((m) => m.kunci.startsWith("sinkron:"));
      return {
        terakhir,
        riwayat,
        aktif: aktif
          .map((p) =>
            denganStatusAkhir(
              { ...p, id: Number(p.id) },
              hitungBatasDetik(pengiriman, ekstrakNodeCfgDariStatusRumah(statusRumah, p.node) || nodeCfg, waktu)
            )
          )
          .filter((p) => p.status !== "kedaluwarsa"),
        stasiun,
        statusRumah,
        lokasiMeta,
        waktu,
        pengiriman,
        batas_detik,
      };
    },
    async setMeta(kunci, nilai) {
      await sql`insert into telemetry_meta (kunci, nilai, diubah) values (${kunci}, ${nilai}, now())
        on conflict (kunci) do update set nilai = excluded.nilai, diubah = now()`;
    },
    async getMeta(kunci) {
      const r = await sql`select kunci, nilai, diubah from telemetry_meta where kunci = ${kunci} limit 1`;
      return r.length ? r[0] : null;
    },
    async getMetaAwalan(awalan) {
      return await sql`select kunci, nilai, diubah from telemetry_meta where kunci like ${awalan + "%"} order by kunci asc`;
    },
    async aplikasiAktif(menit) {
      const { batas } = await bacaBatasSql();
      const minsInt = Math.max(1, Math.round(Number(menit || 3)));
      const r = await sql`select 1 from telemetry_meta where kunci = 'aplikasi_dibuka' and diubah > now() - make_interval(mins => ${minsInt}::int)
        union all select 1 from telemetry_perintah where status in ('menunggu', 'diambil', 'diteruskan')
        and dibuat > now() - make_interval(secs => ${Number(batas)}::double precision) limit 1`;
      return r.length > 0;
    },
  };
}

export function buatMemori() {
  const bacaan = [];
  const perintah = [];
  const meta = new Map();
  const sekarang = () => new Date(Date.now());
  const bacaKonfigMem = () => normalisasiKonfigPengiriman(meta.get("konfig_pengiriman")?.nilai);
  const statusRumahRowsMem = () =>
    [...meta].filter(([k]) => k.startsWith("status_rumah:")).map(([kunci, v]) => ({ kunci, nilai: v.nilai }));
  const lokasiMetaRowsMem = () =>
    [...meta]
      .filter(([k]) => k.startsWith("lokasi_") || k.startsWith("wilayah_adm4"))
      .map(([kunci, v]) => ({ kunci, nilai: v.nilai }));
  const waktuInfoMem = (stasiun = null) =>
    hitungInfoWaktuLokal(sekarang(), resolusiTzOffsetDariMeta([...statusRumahRowsMem(), ...lokasiMetaRowsMem()], stasiun));
  const bacaBatasMem = (nodeFilter = null) => {
    const cfg = bacaKonfigMem();
    const nodeCfg = ekstrakNodeCfgDariStatusRumah(statusRumahRowsMem(), nodeFilter);
    return hitungBatasDetik(cfg, nodeCfg, waktuInfoMem());
  };

  return {
    async bacaPengiriman() {
      return bacaKonfigMem();
    },
    async simpanPengiriman(mode, intervalDetik, opsi = {}) {
      const sebelum = bacaKonfigMem();
      const cfg = normalisasiKonfigPengiriman({
        mode: mode ?? sebelum.mode,
        interval_detik: intervalDetik ?? sebelum.interval_detik,
        hemat_malam: opsi.hemat_malam !== undefined ? Boolean(opsi.hemat_malam) : sebelum.hemat_malam,
        interval_malam_detik:
          opsi.interval_malam_detik !== undefined ? opsi.interval_malam_detik : sebelum.interval_malam_detik,
        diperbarui: sekarang().toISOString(),
      });
      meta.set("konfig_pengiriman", { nilai: JSON.stringify(cfg), diubah: sekarang() });
      return cfg;
    },
    async simpanBacaan(stasiun, d) {
      const id = bacaan.length + 1;
      bacaan.push({ id, stasiun, ...d, diterima: new Date(Date.now() - d.umur_detik * 1000) });
      return id;
    },
    async selesaikanSampel(node, token, bacaanId) {
      const p = [...perintah].reverse().find((x) => x.node === node && x.id % 65536 === token && AKTIF.includes(x.status));
      if (!p) return null;
      Object.assign(p, { status: "selesai", selesai: sekarang(), bacaan_id: bacaanId });
      return p.id;
    },
    async tandaiDiteruskan(id) {
      const p = perintah.find((x) => x.id === id);
      if (p && ["menunggu", "diambil"].includes(p.status)) Object.assign(p, { status: "diteruskan", diteruskan: sekarang() });
    },
    async ambilPerintahBaru(stasiun) {
      return perintah
        .filter((p) => denganStatusAkhir(p, bacaBatasMem(p.node)).status === "menunggu")
        .map((p) => {
          Object.assign(p, { status: "diambil", diambil: sekarang(), stasiun });
          return { id: p.id, node: p.node, aksi: p.aksi };
        });
    },
    async buatPerintah(node, aksi) {
      const batas = bacaBatasMem(node);
      const ada = [...perintah]
        .reverse()
        .find((p) => p.node === node && p.aksi === aksi && AKTIF.includes(denganStatusAkhir(p, batas).status));
      if (ada) return { ...ada, baru: false };
      const p = { id: perintah.length + 1, node, aksi, status: "menunggu", dibuat: sekarang() };
      perintah.push(p);
      return { ...p, baru: true };
    },
    async bacaPerintah(id) {
      const p = perintah.find((x) => x.id === id);
      if (!p) return null;
      const batas = bacaBatasMem(p.node);
      const b = bacaan.find((x) => x.id === p.bacaan_id) || {};
      return denganStatusAkhir(
        { ...p, lembap: b.lembap, suhu: b.suhu, baterai: b.baterai, rssi: b.rssi, snr: b.snr, waktu_sampel: b.diterima },
        batas
      );
    },
    async ringkasan() {
      const statusRumah = statusRumahRowsMem();
      const lokasiMeta = lokasiMetaRowsMem();
      const waktu = waktuInfoMem();
      const pengiriman = hitungPengirimanEfektif(bacaKonfigMem(), waktu);
      const batas_detik = hitungBatasDetik(pengiriman, ekstrakNodeCfgDariStatusRumah(statusRumah), waktu);
      const urut = [...bacaan].sort((a, b) => b.diterima - a.diterima);
      const terakhir = [];
      for (const b of urut) {
        if (!terakhir.find((t) => t.stasiun === b.stasiun && t.node === b.node)) terakhir.push(b);
      }
      const aktif = perintah
        .map((p) => denganStatusAkhir(p, hitungBatasDetik(pengiriman, ekstrakNodeCfgDariStatusRumah(statusRumah, p.node), waktu)))
        .filter((p) => AKTIF.includes(p.status));
      const stasiun = [...meta]
        .filter(([k]) => k.startsWith("sinkron:"))
        .map(([kunci, v]) => ({ kunci, nilai: v.nilai }));
      return { terakhir, riwayat: urut.slice(0, 400), aktif, stasiun, statusRumah, lokasiMeta, waktu, pengiriman, batas_detik };
    },
    async setMeta(kunci, nilai) {
      meta.set(kunci, { nilai, diubah: sekarang() });
    },
    async getMeta(kunci) {
      const m = meta.get(kunci);
      return m ? { kunci, nilai: m.nilai, diubah: m.diubah } : null;
    },
    async getMetaAwalan(awalan) {
      return [...meta.entries()]
        .filter(([k]) => k.startsWith(awalan))
        .map(([kunci, v]) => ({ kunci, nilai: v.nilai, diubah: v.diubah }));
    },
    async aplikasiAktif(menit) {
      const batas = bacaBatasMem();
      const m = meta.get("aplikasi_dibuka");
      const baruDibuka = m && Date.now() - m.diubah.getTime() < menit * 60000;
      return Boolean(baruDibuka || perintah.some((p) => AKTIF.includes(denganStatusAkhir(p, batas).status)));
    },
  };
}

export async function penyimpanan() {
  if (_db) return _db;
  if (pool && !_forceMemoryStorage) {
    try {
      _db = await buatSql(createPoolSqlTag(pool));
      return _db;
    } catch (err) {
      console.warn("[TelemetryStorage] PostgreSQL initialization failed, using in-memory store:", err?.message || err);
    }
  }
  _db = buatMemori();
  return _db;
}

export function bacaBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
}

export function tokenStasiunBenar(req) {
  const harus = process.env.STASIUN_TOKEN || (process.env.VERCEL ? "" : "uji");
  if (!harus) return false;
  const h = req.headers?.authorization || "";
  return h === `Bearer ${harus}`;
}

export function angka(v, min, max) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export async function tangani(res, fn) {
  try {
    await fn();
  } catch (e) {
    console.error("[FieldTelemetry]", e);
    res.status(500).json({ ok: false, pesan: e?.message || "Kesalahan server" });
  }
}

