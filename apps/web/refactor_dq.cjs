const fs = require('fs');  
const clean = fs.readFileSync('dq_clean.tsx', 'utf8');  
const simStart = clean.indexOf('{/* 1. SIMULASI TAB */}');  
const materiStart = clean.indexOf('{/* 2. MATERI PEMBELAJARAN BERKELANJUTAN TAB */}');  
console.log(simStart, materiStart);
