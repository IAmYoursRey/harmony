const fs = require('fs');
let cfg = fs.readFileSync('tailwind.config.js', 'utf8');
cfg = cfg.replace(/hsl\(var\(--brand-(\d+)\)\s*\/\s*<alpha-value>\)/g, 'hsla(var(--brand-$1), <alpha-value>)');
fs.writeFileSync('tailwind.config.js', cfg);
