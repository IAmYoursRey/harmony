const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/\.theme-([a-z]+) {/g, ':root.theme-$1 {');
fs.writeFileSync('src/index.css', css);
