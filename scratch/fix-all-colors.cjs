const fs = require('fs');
const path = require('path');

const replacements = {
  '#eff6ff': 'hsl(var(--brand-50))',
  '#dbeafe': 'hsl(var(--brand-100))',
  '#bfdbfe': 'hsl(var(--brand-200))',
  '#93c5fd': 'hsl(var(--brand-300))',
  '#60a5fa': 'hsl(var(--brand-400))',
  '#3b82f6': 'hsl(var(--brand-500))',
  '#2563eb': 'hsl(var(--brand-600))',
  '#1d4ed8': 'hsl(var(--brand-700))',
  '#1e40af': 'hsl(var(--brand-800))',
  '#1e3a8a': 'hsl(var(--brand-900))',
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  for (const [hex, cssVar] of Object.entries(replacements)) {
    // Replace hex (case insensitive)
    const regex = new RegExp(hex, 'gi');
    newContent = newContent.replace(regex, cssVar);
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
  }
});

console.log(`Updated ${changedCount} files with CSS variables.`);
