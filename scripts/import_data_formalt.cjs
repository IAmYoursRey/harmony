const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function run() {
  console.log("Starting data_formalt.xlsx Pipeline...");

  let xlsx;
  try {
    xlsx = require("xlsx");
  } catch (e) {
    console.error(
      "Error: 'xlsx' package is not installed. Please run 'npm install xlsx' in the backend directory.",
    );
    process.exit(1);
  }

  const excelPath = path.join(__dirname, "../../data_formalt.xlsx");

  if (!fs.existsSync(excelPath)) {
    console.error(`[CRITICAL ERROR] File not found: ${excelPath}`);
    console.error(
      `Silakan pastikan file 'data_formalt.xlsx' sudah diletakkan di root direktori Harmony sebelum menjalankan script ini.`,
    );
    process.exit(1);
  }

  console.log(
    "Reading Excel file (this might take a while depending on size)...",
  );
  const workbook = xlsx.readFile(excelPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  console.log("Parsing data...");

  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
  console.log(`Extracted ${rawData.length} rows.`);

  const data = [];
  let validCoords = 0;

  for (const row of rawData) {
    const keys = Object.keys(row).map((k) => k.toLowerCase().trim());
    const getVal = (possibleNames) => {
      for (const name of possibleNames) {
        const actualKey = Object.keys(row).find(
          (k) => k.toLowerCase().trim() === name,
        );
        if (actualKey && row[actualKey]) return String(row[actualKey]).trim();
      }
      return "";
    };

    const npsn = getVal(["npsn", "id_sekolah", "nomor pokok"]);
    const name = getVal(["sekolah", "nama_sekolah", "school", "nama"]);
    let province = getVal([
      "propinsi",
      "provinsi",
      "province_name",
      "province",
    ]);
    let regency = getVal([
      "kabupaten_kota",
      "kabupaten",
      "kota",
      "city_name",
      "city",
    ]);
    let district = getVal(["kecamatan", "kec", "district"]);
    let address = getVal(["alamat", "alamat_jalan", "street_name", "street"]);
    let stage = getVal(["bentuk", "jenjang", "stage", "level"]);
    let status = getVal(["status"]);

    let latStr = getVal(["lintang", "latitude", "lat"]);
    let lngStr = getVal(["bujur", "longitude", "long", "lng"]);

    if (province.toUpperCase().startsWith("PROV. "))
      province = province.substring(6).trim();
    if (province.toUpperCase().startsWith("PROV "))
      province = province.substring(5).trim();
    province = province.replace(
      /\w\S*/g,
      (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(),
    );

    if (regency.toUpperCase().startsWith("KAB. "))
      regency = "Kabupaten " + regency.substring(5).trim();
    else if (regency.toUpperCase().startsWith("KAB "))
      regency = "Kabupaten " + regency.substring(4).trim();
    else if (regency.toUpperCase().startsWith("KOTA "))
      regency = "Kota " + regency.substring(5).trim();
    regency = regency.replace(
      /\w\S*/g,
      (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase(),
    );

    let latitude = null;
    let longitude = null;
    let location_verified = false;

    if (latStr && lngStr) {
      let latF = parseFloat(latStr);
      let lngF = parseFloat(lngStr);

      if (latF > 90 && lngF < 10) {
        const temp = latF;
        latF = lngF;
        lngF = temp;
      }

      if (!isNaN(latF) && !isNaN(lngF) && latF !== 0 && lngF !== 0) {
        if (latF >= -15 && latF <= 10 && lngF >= 90 && lngF <= 145) {
          latitude = latF;
          longitude = lngF;
          location_verified = true;
          validCoords++;
        }
      }
    }

    const school = {
      id: crypto.randomUUID(),
      npsn: npsn || "MISSING",
      name: name,
      level: stage || "UNKNOWN",
      status:
        status === "N" || status.toLowerCase() === "negeri"
          ? "Negeri"
          : status === "S" || status.toLowerCase() === "swasta"
            ? "Swasta"
            : "UNKNOWN",
      address: address || "NOT_FOUND",
      province: province,
      regency: regency,
      district: district,
      latitude: latitude,
      longitude: longitude,
      location_verified: location_verified,
    };

    data.push(school);
  }

  console.log(`Validated ${validCoords} valid coordinates.`);

  console.log("Sorting dataset alphabetically...");
  data.sort((a, b) => {
    const p = a.province.localeCompare(b.province);
    if (p !== 0) return p;
    const r = a.regency.localeCompare(b.regency);
    if (r !== 0) return r;
    const d = a.district.localeCompare(b.district);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name);
  });

  console.log("Writing to backend database.json efficiently...");
  const dbPath = path.join(__dirname, "../database.json");
  let db = {};
  if (fs.existsSync(dbPath)) {
    db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  }

  db.schools = data;

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  console.log("=========================================");
  console.log("✅ PIPELINE BERHASIL DIEKSEKUSI");
  console.log(`Total Sekolah: ${data.length}`);
  console.log(`Database backend telah diupdate.`);
  console.log(
    "Catatan Risiko Bencana (Enrichment): Backend Harmony (routes/schools.js) secara otomatis memperkaya (enrich) data sekolah ini dengan profil risiko spesifik dari BNPB IRBI berdasarkan 'Regency' (Kabupaten/Kota) pada saat runtime (tanpa membebani memori).",
  );
  console.log("=========================================");
}

run().catch(console.error);
