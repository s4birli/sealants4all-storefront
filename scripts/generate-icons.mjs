#!/usr/bin/env node
// Generate placeholder PWA icons (solid brand-navy with white "S4" text + cta-orange "4").
// Produces icon-192.png, icon-384.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png.
// Uses pure Node: zlib + Buffer + raw PNG encoding.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

const BRAND_BG = [0x0b, 0x29, 0x54]; // brand-900
const CTA = [0xff, 0x6b, 0x1a]; // cta-500
const WHITE = [0xff, 0xff, 0xff];

// 5x7 monospace pixel font for digits and letters we need: S, 4, A, L
// Each glyph: 5 columns × 7 rows, top-down, left-to-right
const FONT = {
  S: [
    0, 1, 1, 1, 0,
    1, 0, 0, 0, 0,
    1, 0, 0, 0, 0,
    0, 1, 1, 1, 0,
    0, 0, 0, 0, 1,
    0, 0, 0, 0, 1,
    1, 1, 1, 1, 0,
  ],
  4: [
    0, 0, 0, 1, 0,
    0, 0, 1, 1, 0,
    0, 1, 0, 1, 0,
    1, 0, 0, 1, 0,
    1, 1, 1, 1, 1,
    0, 0, 0, 1, 0,
    0, 0, 0, 1, 0,
  ],
  A: [
    0, 1, 1, 1, 0,
    1, 0, 0, 0, 1,
    1, 0, 0, 0, 1,
    1, 1, 1, 1, 1,
    1, 0, 0, 0, 1,
    1, 0, 0, 0, 1,
    1, 0, 0, 0, 1,
  ],
  L: [
    1, 0, 0, 0, 0,
    1, 0, 0, 0, 0,
    1, 0, 0, 0, 0,
    1, 0, 0, 0, 0,
    1, 0, 0, 0, 0,
    1, 0, 0, 0, 0,
    1, 1, 1, 1, 1,
  ],
};

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePNG(width, height, getPixel) {
  // RGB, 8-bit, no alpha for simplicity
  const rowSize = width * 3;
  const raw = Buffer.alloc((rowSize + 1) * height);
  let off = 0;
  for (let y = 0; y < height; y++) {
    raw[off++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, y);
      raw[off++] = r;
      raw[off++] = g;
      raw[off++] = b;
    }
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  const iend = Buffer.alloc(0);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", iend),
  ]);
}

function drawText(grid, text, startX, startY, scale, color) {
  let cx = startX;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (!glyph) continue;
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (!glyph[gy * 5 + gx]) continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = cx + gx * scale + dx;
            const py = startY + gy * scale + dy;
            grid[py * grid.w + px] = color;
          }
        }
      }
    }
    cx += 6 * scale; // 5 cols + 1 space
  }
}

function generateIcon(size, { maskable = false } = {}) {
  // For maskable, keep content within safe zone (centered ~80%).
  const grid = new Array(size * size).fill(BRAND_BG);
  grid.w = size;

  // Text: "S4ALL"
  const text = "S4ALL";
  const glyphW = 5;
  const glyphH = 7;
  const gap = 1;
  const totalCols = text.length * glyphW + (text.length - 1) * gap;
  const padding = maskable ? 0.18 : 0.12;
  const safe = Math.floor(size * (1 - 2 * padding));
  const scale = Math.max(
    1,
    Math.min(
      Math.floor(safe / totalCols),
      Math.floor(safe / glyphH),
    ),
  );
  const textW = totalCols * scale;
  const textH = glyphH * scale;
  const startX = Math.floor((size - textW) / 2);
  const startY = Math.floor((size - textH) / 2);

  let cx = startX;
  for (const ch of text) {
    const color = ch === "4" ? CTA : WHITE;
    drawText(grid, ch, cx, startY, scale, color);
    cx += (glyphW + gap) * scale;
  }

  return makePNG(size, size, (x, y) => grid[y * size + x]);
}

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-384.png", size: 384 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const t of targets) {
  const buf = generateIcon(t.size, { maskable: !!t.maskable });
  writeFileSync(resolve(OUT_DIR, t.name), buf);
  console.log(`wrote ${t.name} (${t.size}×${t.size}, ${buf.length} bytes)`);
}
