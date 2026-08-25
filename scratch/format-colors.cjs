const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/#e0e7ff/g, 'hsl(var(--brand-100))')
         .replace(/#c7d2fe/g, 'hsl(var(--brand-200))')
         .replace(/#eff6ff/g, 'hsl(var(--brand-50))')
         .replace(/#93c5fd/g, 'hsl(var(--brand-300))')
         .replace(/#60a5fa/g, 'hsl(var(--brand-400))');
fs.writeFileSync('src/index.css', css);
