const fs = require('fs');

const path = 'src/components/HeroIllustration.tsx';
let content = fs.readFileSync(path, 'utf8');

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

for (const [hex, cssVar] of Object.entries(replacements)) {
  const regex = new RegExp(hex, 'gi');
  content = content.replace(regex, cssVar);
}

fs.writeFileSync(path, content);
