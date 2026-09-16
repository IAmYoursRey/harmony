const fs = require('fs');
const path = require('path');

const rootDir = 'd:\\vscode\\GeoSense';
const excludeDirs = ['node_modules', '.git', '.gemini', 'dist', 'build', '.vercel'];
const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.tar', '.gz'];

let stats = {
  folders: 0,
  files: 0,
  readable: 0,
  empty: 0,
  errors: 0,
  binary: 0
};

let emptyFiles = [];
let errorFiles = [];
let binaryFiles = [];

let outputLines = [];

function isBinary(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return binaryExtensions.includes(ext);
}

function traverse(currentDir, indent = '') {
  let entries;
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch (e) {
    return;
  }

  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;

    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      stats.folders++;
      outputLines.push(`${indent}${entry.name}/`);
      traverse(fullPath, indent + '  ');
    } else {
      stats.files++;
      if (isBinary(fullPath)) {
        stats.binary++;
        binaryFiles.push(relPath);
        outputLines.push(`${indent}${entry.name} — LINES: 0 — STATUS: BINARY`);
      } else {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.length === 0) {
            stats.empty++;
            emptyFiles.push(relPath);
            outputLines.push(`${indent}${entry.name} — LINES: 0 — STATUS: EMPTY`);
          } else {
            const lines = content.split('\n').length;
            stats.readable++;
            outputLines.push(`${indent}${entry.name} — LINES: ${lines} — STATUS: OK`);
          }
        } catch (e) {
          stats.errors++;
          errorFiles.push(relPath);
          outputLines.push(`${indent}${entry.name} — LINES: 0 — STATUS: ERROR`);
        }
      }
    }
  }
}

outputLines.push('PROJECT ROOT');
traverse(rootDir, '  ');

outputLines.push('\nFILES WITH ERRORS');
errorFiles.forEach(f => outputLines.push(f));

outputLines.push('\nEMPTY FILES');
emptyFiles.forEach(f => outputLines.push(f));

outputLines.push('\nBINARY FILES');
binaryFiles.forEach(f => outputLines.push(f));

outputLines.push('\nTOTAL');
outputLines.push(`Folders: ${stats.folders}`);
outputLines.push(`Files: ${stats.files}`);
outputLines.push(`Readable: ${stats.readable}`);
outputLines.push(`Empty: ${stats.empty}`);
outputLines.push(`Errors: ${stats.errors}`);
outputLines.push(`Binary: ${stats.binary}`);

fs.writeFileSync(path.join(rootDir, 'snapshot_output.txt'), outputLines.join('\n'), 'utf8');
console.log('Done');
