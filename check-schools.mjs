import { readFileSync } from 'fs';
const d = JSON.parse(readFileSync('apps/web/public/data/schools-lite.json', 'utf8'));
console.log('count:', d.length);
console.log('sample:', JSON.stringify(d[0], null, 2));
console.log('keys:', Object.keys(d[0]));
