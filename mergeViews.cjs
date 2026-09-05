const fs = require('fs');
const path = require('path');

function mergeReactFiles(filePaths, outputPath) {
  const importsMap = new Map();
  const defaultImportsMap = new Map();
  const sideEffectImports = new Set();
  let combinedCode = '';

  for (const fp of filePaths) {
    if (!fs.existsSync(fp)) {
      console.warn('File not found:', fp);
      continue;
    }
    const content = fs.readFileSync(fp, 'utf8');
    const lines = content.split('\n');
    const codeLines = [];
    
    let inImport = false;
    let importBuffer = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('import ') || inImport) {
        importBuffer += line + '\n';
        if (trimmed.includes(';') || (trimmed.includes('from') && !trimmed.endsWith(','))) {
          const str = importBuffer.trim();
          if (str.startsWith('import \'') || str.startsWith('import "')) {
             sideEffectImports.add(str);
          } else {
             // Extract optional type keyword, defaults, named, and module
             // e.g. import type { A } from 'B'
             // e.g. import React, { useState } from 'react'
             const match = str.match(/import\s+(type\s+)?(?:([\w]+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s+from\s+['"]([^'"]+)['"]/);
             if (match) {
               const isType = match[1] ? 'type ' : '';
               const defaultImport = match[2];
               const namedImports = match[3];
               const moduleName = match[4];
               
               if (defaultImport) {
                 defaultImportsMap.set(`${moduleName}::${defaultImport}`, `import ${defaultImport} from '${moduleName}';`);
               }
               if (namedImports) {
                 if (!importsMap.has(moduleName)) {
                   importsMap.set(moduleName, { types: new Set(), values: new Set() });
                 }
                 const names = namedImports.split(',').map(s => s.trim()).filter(s => s);
                 names.forEach(n => {
                   // if the import block was 'import type { A }', all are types
                   // if the import block was 'import { type A, B }', handle per item
                   if (isType || n.startsWith('type ')) {
                     importsMap.get(moduleName).types.add(n.replace(/^type\s+/, ''));
                   } else {
                     importsMap.get(moduleName).values.add(n);
                   }
                 });
               }
             } else {
               codeLines.push(str);
             }
          }
          inImport = false;
          importBuffer = '';
        } else {
          inImport = true;
        }
      } else {
        let codeLine = line;
        if (codeLine.startsWith('export default function')) {
           codeLine = codeLine.replace('export default function', 'export function');
        } else if (codeLine.startsWith('export default ')) {
           continue; 
        }
        codeLines.push(codeLine);
      }
    }
    combinedCode += `\n// --- Merged from ${path.basename(fp)} ---\n` + codeLines.join('\n') + '\n';
  }

  let finalOutput = '';
  for (const imp of sideEffectImports) {
    finalOutput += imp + '\n';
  }
  for (const [key, imp] of defaultImportsMap.entries()) {
    finalOutput += imp + '\n';
  }
  for (const [moduleName, importData] of importsMap.entries()) {
    const valueNames = Array.from(importData.values);
    const typeNames = Array.from(importData.types).map(n => `type ${n}`);
    const allNames = [...valueNames, ...typeNames].join(', ');
    if (allNames) {
       finalOutput += `import { ${allNames} } from '${moduleName}';\n`;
    }
  }
  
  finalOutput += '\n' + combinedCode;
  
  fs.writeFileSync(outputPath, finalOutput, 'utf8');
  console.log('Successfully wrote', outputPath);
}

const basePath = 'D:/vscode/GeoSense/src/components/dashboard/views';
mergeReactFiles([
  path.join(basePath, 'GSSView.tsx'),
  path.join(basePath, 'SchoolResilienceIndexView.tsx'),
  path.join(basePath, 'SurveyAnalyticsView.tsx'),
  path.join(basePath, 'LeaderboardView.tsx')
], path.join(basePath, 'AnalyticsViews.tsx'));

mergeReactFiles([
  path.join(basePath, 'DevDashboardView.tsx'),
  path.join(basePath, 'TeacherDashboardView.tsx'),
  path.join(basePath, 'ProfileView.tsx')
], path.join(basePath, 'RoleDashboards.tsx'));

mergeReactFiles([
  path.join(basePath, 'AILearningView.tsx'),
  path.join(basePath, 'DisasterSimulationView.tsx')
], path.join(basePath, 'LearningViews.tsx'));

mergeReactFiles([
  path.join(basePath, 'GeoRiskMapView.tsx'),
  path.join(basePath, 'DigitalTwinView.tsx')
], path.join(basePath, 'SpatialViews.tsx'));
