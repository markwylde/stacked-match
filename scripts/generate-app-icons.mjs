#!/usr/bin/env node
/**
 * Generates the app icon set from the game's own mark: three stacked bricks
 * with the top one lifted clear, which is the game in one glyph.
 *
 * Rendered here rather than pulled from a design tool so the set can be
 * regenerated reproducibly, and encoded with a small PNG writer so the build
 * needs no image dependency. Supersampled 4x and box-filtered for clean edges.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const SS = 4;

const BACKGROUND = [0x1b, 0x16, 0x30];
const BRICKS = [
  [0xff, 0x5f, 0xa2],
  [0xf2, 0xc1, 0x4e],
  [0x4f, 0xd0, 0xc2],
];

// ---------------------------------------------------------------- png writer
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const encodePng = (width, height, rgba) => {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// ------------------------------------------------------------------ drawing
const insideRoundRect = (px, py, x, y, w, h, r) => {
  if (px < x || py < y || px >= x + w || py >= y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
};

const render = (size, { bleed }) => {
  const big = size * SS;
  const buffer = Buffer.alloc(big * big * 4);

  // The mark occupies the maskable safe zone when bleed is requested, so no
  // part of it is lost to a platform's shape mask.
  const markScale = bleed ? 0.56 : 0.7;
  const markSize = big * markScale;
  const originX = (big - markSize) / 2;
  const barHeight = markSize * 0.2;
  const radius = barHeight * 0.34;
  const gap = markSize * 0.09;

  const bars = [
    { x: originX + markSize * 0.16, y: (big - markSize) / 2, w: markSize * 0.68, lift: true },
    { x: originX, y: (big - markSize) / 2 + barHeight + gap * 1.9, w: markSize },
    { x: originX + markSize * 0.08, y: (big - markSize) / 2 + (barHeight + gap) * 2 + gap * 0.9, w: markSize * 0.84 },
  ];

  for (let y = 0; y < big; y += 1) {
    for (let x = 0; x < big; x += 1) {
      const index = (y * big + x) * 4;
      let colour = null;

      const cornerRadius = bleed ? 0 : big * 0.22;
      const inBackground = bleed || insideRoundRect(x, y, 0, 0, big, big, cornerRadius);
      if (inBackground) colour = BACKGROUND;

      bars.forEach((bar, order) => {
        if (insideRoundRect(x, y, bar.x, bar.y, bar.w, barHeight, radius)) {
          colour = BRICKS[order];
        }
      });

      if (colour === null) continue;
      buffer[index] = colour[0];
      buffer[index + 1] = colour[1];
      buffer[index + 2] = colour[2];
      buffer[index + 3] = 255;
    }
  }

  // Box-filter the supersampled buffer down to the requested size.
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const totals = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const source = ((y * SS + sy) * big + (x * SS + sx)) * 4;
          for (let c = 0; c < 4; c += 1) totals[c] += buffer[source + c];
        }
      }
      const target = (y * size + x) * 4;
      for (let c = 0; c < 4; c += 1) out[target + c] = Math.round(totals[c] / (SS * SS));
    }
  }
  return encodePng(size, size, out);
};

mkdirSync(OUT, { recursive: true });

const outputs = [
  ['icon-192.png', 192, { bleed: true }],
  ['icon-512.png', 512, { bleed: true }],
  ['icon-maskable-512.png', 512, { bleed: true }],
  ['apple-touch-icon.png', 180, { bleed: true }],
];

for (const [name, size, options] of outputs) {
  writeFileSync(join(OUT, name), render(size, options));
  console.log(`wrote ${name} (${size}x${size})`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1b1630"/>
  <rect x="20" y="14" width="24" height="8" rx="3" fill="#ff5fa2"/>
  <rect x="14" y="28" width="36" height="8" rx="3" fill="#f2c14e"/>
  <rect x="17" y="42" width="30" height="8" rx="3" fill="#4fd0c2"/>
</svg>
`;
writeFileSync(join(OUT, 'favicon.svg'), svg);
console.log('wrote favicon.svg');
