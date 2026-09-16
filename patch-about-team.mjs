import { readFileSync, writeFileSync } from 'fs';

const file = 'apps/web/src/components/AboutSection.tsx';
let content = readFileSync(file, 'utf8');

const oldTeam = `}[] = [
  {
    initials: "GEO",
    name: "Geospatial Data",
    role: "Analis Data",
    subtitle: "Pemetaan Wilayah",
    icon: BarChart3,
    bio: "Bertanggung jawab memproses titik data satelit dan topografi.",
  },
  {
    initials: "RA",
    name: "Raihan Ansari",
    role: "Lead Developer",
    subtitle: "Rekayasa Perangkat Lunak",
    icon: Code2,
    bio: "Pengembang utama arsitektur platform dan integrasi digital twin.",
  },
  {
    initials: "AI",
    name: "Harmony AI",
    role: "Sistem Pakar",
    subtitle: "Prediksi Kebencanaan",
    icon: Sparkles,
    bio: "Otak kecerdasan buatan untuk mengelola perhitungan model AI.",
  },
];`;

const newTeam = `}[] = [
  {
    initials: "MD",
    name: "M. David Silva W.",
    role: "Data & Research Analyst",
    subtitle: "Geospatial Data Collection",
    icon: BarChart3,
    bio: "Responsible for collecting, validating, and managing geospatial field data across Indonesia.",
  },
  {
    initials: "AF",
    name: "Alvira Fitriatun Nizha",
    role: "Project Leader & Ideator",
    subtitle: "Principal Coordinator",
    icon: Sparkles,
    bio: "Originated the concept of Harmony and leads the team as the project's chief coordinator.",
  },
  {
    initials: "RA",
    name: "Raihan Ansari",
    role: "Lead Software Engineer",
    subtitle: "Full Stack & UI/UX Developer",
    icon: Code2,
    bio: "Architected and built the entire platform — from backend systems to the interactive geospatial interface.",
  },
];`;

// Normalize line endings for comparison
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOld = oldTeam.replace(/\r\n/g, '\n');
const normalizedNew = newTeam.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedOld)) {
  console.error('ERROR: Could not find target string in file!');
  // Print what we found
  const idx = normalizedContent.indexOf('initials: "GEO"');
  if (idx === -1) {
    console.log('GEO not found either...');
    console.log('File snippet around members:');
    const membersIdx = normalizedContent.indexOf('][] = [');
    console.log(normalizedContent.substring(membersIdx, membersIdx + 800));
  }
  process.exit(1);
}

const replaced = normalizedContent.replace(normalizedOld, normalizedNew);
// Write back with original line endings (CRLF)
writeFileSync(file, replaced.replace(/\n/g, '\r\n'), 'utf8');
console.log('Done! Team members updated successfully.');
