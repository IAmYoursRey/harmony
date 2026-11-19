import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createTimeoutSignal,
  safeStructuredClone,
  safeScrollY,
} from "../apps/web/src/utils/browserCompat.ts";

const root = process.cwd();
const readSrc = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test("Browser targets in package.json and vite.config.ts support Safari 14+, Firefox 90+, Chrome/Edge 90+, Samsung 15+", () => {
  const pkg = JSON.parse(readSrc("apps/web/package.json"));
  assert.ok(Array.isArray(pkg.browserslist), "browserslist array must exist in apps/web/package.json");
  const listStr = pkg.browserslist.join(" ");
  assert.match(listStr, /safari >= 14/);
  assert.match(listStr, /ios_saf >= 14/);
  assert.match(listStr, /firefox >= 90/);
  assert.match(listStr, /chrome >= 90/);
  assert.match(listStr, /samsung >= 15/);

  const viteCfg = readSrc("apps/web/vite.config.ts");
  assert.match(viteCfg, /build:\s*\{[\s\S]*target:\s*\[[^\]]*'safari14'/);
  assert.match(viteCfg, /target:\s*\[[^\]]*'firefox90'/);
  assert.match(viteCfg, /target:\s*\[[^\]]*'chrome90'/);
  assert.match(viteCfg, /cssTarget:\s*\[[^\]]*chrome90[^\]]*safari14[^\]]*firefox90/);

  const html = readSrc("apps/web/index.html");
  assert.match(html, /<meta name="color-scheme" content="light dark"/);
});

test("Tailwind config defines missing utility scales and index.css provides progressive viewport and backdrop fallbacks", () => {
  const tw = readSrc("apps/web/tailwind.config.js");
  assert.match(tw, /'0\.2':\s*'0\.05rem'/);
  assert.match(tw, /'8\.5':\s*'2\.125rem'/);
  assert.match(tw, /'84':\s*'21rem'/);
  assert.match(tw, /'2xs':/);
  assert.match(tw, /\bxs:/);
  assert.match(tw, /backdropBlur:\s*\{\s*xs:\s*'2px',?\s*\}/);

  const css = readSrc("apps/web/src/index.css");
  assert.match(css, /--vh-full:\s*100vh;/);
  assert.match(css, /@supports\s*\(height:\s*100dvh\)/);
  assert.match(css, /--vh-full:\s*100dvh;/);
  assert.match(css, /\.h-viewport\s*\{[\s\S]*height:\s*100vh;[\s\S]*height:\s*100dvh;/);
  assert.match(css, /\.min-h-viewport\s*\{[\s\S]*min-height:\s*100vh;[\s\S]*min-height:\s*100dvh;/);
  assert.match(css, /\.no-scrollbar,\s*\.scrollbar-none/);
  assert.match(css, /@supports\s*\(overflow-x:\s*clip\)/);
  assert.match(css, /@supports not \(\(backdrop-filter:\s*blur\(1px\)\) or \(-webkit-backdrop-filter:\s*blur\(1px\)\)\)/);
  assert.match(css, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="range"\]\)/);
});

test("No unguarded AbortSignal.timeout, structuredClone, or navigator.clipboard.writeText calls remain outside browserCompat.ts", () => {
  const srcRoot = path.join(root, "apps/web/src");
  const compatPath = path.join(srcRoot, "utils/browserCompat.ts");
  const files = walkFiles(srcRoot).filter((f) => path.resolve(f) !== path.resolve(compatPath));

  const offenders = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (/AbortSignal\.timeout\s*\(/.test(content)) {
      offenders.push(`AbortSignal.timeout in ${path.relative(root, file)}`);
    }
    if (/\bstructuredClone\s*\(/.test(content)) {
      offenders.push(`structuredClone in ${path.relative(root, file)}`);
    }
    if (/navigator\.clipboard\.writeText\s*\(/.test(content)) {
      offenders.push(`navigator.clipboard.writeText in ${path.relative(root, file)}`);
    }
  }

  assert.deepEqual(offenders, []);
});

test("App router preserves /app/geo-risk-map redirect to /app/maps", () => {
  const appSrc = readSrc("apps/web/src/App.tsx");
  assert.match(appSrc, /path="geo-risk-map"[\s\S]*Navigate to="\/app\/maps" replace/);
});

test("browserCompat fallbacks work cleanly when AbortSignal.timeout and structuredClone are unavailable (Safari 14/15 simulation)", async () => {
  const originalTimeout = AbortSignal.timeout;
  const originalClone = globalThis.structuredClone;

  try {
    Object.defineProperty(AbortSignal, "timeout", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const handle = createTimeoutSignal(25);
    assert.equal(handle.signal.aborted, false);
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(handle.signal.aborted, true);
    handle.cleanup();

    const quickHandle = createTimeoutSignal(200);
    quickHandle.cleanup();
    assert.equal(quickHandle.signal.aborted, false);

    Object.defineProperty(globalThis, "structuredClone", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const sample = {
      name: "SMAN 1 Ngoro",
      when: new Date("2026-10-08T00:00:00Z"),
      nested: { scores: [58.8, 86.1], empty: undefined },
    };
    const cloned = safeStructuredClone(sample);
    assert.notEqual(cloned, sample);
    assert.notEqual(cloned.nested, sample.nested);
    assert.notEqual(cloned.nested.scores, sample.nested.scores);
    assert.ok(cloned.when instanceof Date);
    assert.equal(cloned.when.toISOString(), "2026-10-08T00:00:00.000Z");
    cloned.nested.scores.push(99);
    assert.equal(sample.nested.scores.length, 2);

    assert.equal(safeScrollY(), 0);
  } finally {
    Object.defineProperty(AbortSignal, "timeout", {
      value: originalTimeout,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "structuredClone", {
      value: originalClone,
      configurable: true,
      writable: true,
    });
  }
});
