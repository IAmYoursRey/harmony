import xlsx from 'xlsx';
import path from 'path';

const filePath = 'D:/vscode/Harmony/ABSENSI SISWA KELAS X GASAL 2026-2027.xlsx';
const workbook = xlsx.readFile(filePath);

const sheet = workbook.Sheets['INDUK'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log(JSON.stringify(data.slice(5, 30), null, 2));
