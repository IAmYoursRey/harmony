const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/--brand-(\d+):\s*(\d+)\s+(\d+%)\s+(\d+%);/g, '--brand-$1: $2, $3, $4;');
fs.writeFileSync('src/index.css', css);
