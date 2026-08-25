const fs = require('fs');
const path = require('path');

const excludeFiles = ['ThemePicker.tsx'];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (file.endsWith('.tsx') && !excludeFiles.includes(file)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('./src/components');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  // Replace all color utility classes with brand
  newContent = newContent
    .replace(/(bg|text|border|ring|shadow|from|to|via)-(emerald|sky|cyan|indigo|teal|blue)-(\d{2,3})/g, '$1-brand-$3')
    .replace(/(bg|text|border|ring|shadow|from|to|via)-(emerald|sky|cyan|indigo|teal|blue)-(\d{2,3})\/(\d{1,2})/g, '$1-brand-$3/$4');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
  }
});

console.log(`Updated ${changedCount} files with brand classes.`);
