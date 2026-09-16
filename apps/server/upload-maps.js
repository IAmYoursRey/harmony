import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is missing");
  process.exit(1);
}

const filesToUpload = [
  '../web/public/indonesia-desa.topojson',
  '../web/public/indonesia-hutan.topojson',
  '../web/public/indonesia-kab.topojson',
  'src/database/data/mountains.json',
  'src/database/data/schools-lite.json'
];

async function uploadFiles() {
  for (const relPath of filesToUpload) {
    const filePath = path.join(__dirname, relPath);
    const fileName = path.basename(filePath);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${fileName} (not found)`);
      continue;
    }
    
    console.log(`Uploading ${fileName} (${fs.statSync(filePath).size} bytes)...`);
    const fileContent = fs.readFileSync(filePath);
    
    try {
      const blob = await put(`maps/${fileName}`, fileContent, {
        access: 'public',
        token: token,
        addRandomSuffix: false
      });
      console.log(`✅ Uploaded ${fileName} to: ${blob.url}`);
    } catch (e) {
      console.error(`❌ Failed to upload ${fileName}:`, e.message);
    }
  }
}

uploadFiles();
