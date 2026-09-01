#!/usr/bin/env node
/**
 * Checks the built output actually satisfies the installable-app requirements
 * that can be verified without a browser: a complete manifest, and a precache
 * manifest that covers the entire app rather than just what early levels touch.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const problems = [];
const ok = [];

if (!existsSync(DIST)) {
  console.error('dist/ not found - run `npm run build` first');
  process.exit(1);
}

// --- manifest ---------------------------------------------------------------
const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'));
// The build may be rooted at a subpath; resolve declared URLs against it.
const base = typeof manifest.start_url === 'string' && manifest.start_url.endsWith('/')
  ? manifest.start_url
  : '/';
const local = (url) => join(DIST, url.startsWith(base) ? url.slice(base.length) : url.replace(/^\//, ''));
ok.push(`build base is ${base}`);
const required = {
  name: (v) => typeof v === 'string' && v.length > 0,
  short_name: (v) => typeof v === 'string' && v.length > 0,
  display: (v) => v === 'standalone',
  orientation: (v) => v === 'portrait',
  theme_color: (v) => /^#[0-9a-f]{6}$/i.test(v),
  background_color: (v) => /^#[0-9a-f]{6}$/i.test(v),
  start_url: (v) => typeof v === 'string',
};
for (const [key, check] of Object.entries(required)) {
  if (check(manifest[key])) ok.push(`manifest.${key} = ${JSON.stringify(manifest[key])}`);
  else problems.push(`manifest.${key} is missing or invalid: ${JSON.stringify(manifest[key])}`);
}

const sizes = new Set((manifest.icons ?? []).map((icon) => icon.sizes));
for (const size of ['192x192', '512x512']) {
  if (sizes.has(size)) ok.push(`icon ${size} declared`);
  else problems.push(`no icon declared at ${size}`);
}
if ((manifest.icons ?? []).some((icon) => (icon.purpose ?? '').includes('maskable'))) {
  ok.push('maskable icon declared');
} else {
  problems.push('no maskable icon declared');
}
for (const icon of manifest.icons ?? []) {
  const path = local(icon.src);
  if (existsSync(path)) ok.push(`icon file present: ${icon.src}`);
  else problems.push(`icon file missing from build: ${icon.src}`);
}

// --- precache ---------------------------------------------------------------
const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
const entries = [...sw.matchAll(/"?url"?:\s*"([^"]+)"/g)].map((match) => match[1]);
const has = (predicate) => entries.some(predicate);

const checks = [
  ['index.html', (url) => url.endsWith('index.html') || url === '/'],
  ['app JavaScript', (url) => url.endsWith('.js') && url.includes('assets/')],
  ['stylesheet', (url) => url.endsWith('.css')],
  ['app icons', (url) => url.includes('icons/') && url.endsWith('.png')],
];
for (const [label, predicate] of checks) {
  if (has(predicate)) ok.push(`precached: ${label}`);
  else problems.push(`not precached: ${label}`);
}

// Icon artwork and level data are compiled into the JS bundle rather than
// fetched, so precaching the bundle covers every theme, not only early ones.
const bundle = entries.find((url) => url.endsWith('.js') && url.includes('assets/'));
if (bundle !== undefined) {
  const code = readFileSync(local(bundle), 'utf8');
  for (const theme of ['garden', 'kitchen', 'ocean', 'space', 'cafe']) {
    if (code.includes(`"${theme}"`) || code.includes(`'${theme}'`) || code.includes(theme)) {
      ok.push(`theme "${theme}" artwork inside the precached bundle`);
    } else {
      problems.push(`theme "${theme}" not found in the precached bundle`);
    }
  }
}

if (!sw.includes('SKIP_WAITING')) {
  problems.push('service worker does not handle SKIP_WAITING, so deferred activation cannot work');
} else {
  ok.push('service worker handles SKIP_WAITING for deferred activation');
}
if (/skipWaiting\(\)/.test(sw) && !/type===?"SKIP_WAITING"|SKIP_WAITING/.test(sw)) {
  problems.push('service worker calls skipWaiting unconditionally, which would reload mid-run');
}

for (const line of ok) console.log(`  ok  ${line}`);
if (problems.length > 0) {
  console.error('\nPWA output problems:');
  for (const problem of problems) console.error(`  !!  ${problem}`);
  process.exit(1);
}
console.log(`\nPWA output verified: ${ok.length} checks passed.`);
