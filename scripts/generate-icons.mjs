// Generates the PWA icons (192, 512, and a 180 apple-touch-icon) with no
// external dependencies — raw RGBA → zlib → PNG. A navy→blue vertical gradient
// with a centered white up-triangle (markets motif). Run: `node scripts/generate-icons.mjs`
import zlib from 'node:zlib';
import fs from 'node:fs';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function png(w, h, pix) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) { raw[o++] = 0; for (let x = 0; x < w; x++) { const p = pix(x, y, w, h); raw[o++] = p[0]; raw[o++] = p[1]; raw[o++] = p[2]; raw[o++] = p[3]; } }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
function pixel(x, y, w, h) {
  const [r, g, b] = mix([11, 18, 32], [59, 130, 246], y / h); // navy -> blue
  const cx = w / 2, ty = h * 0.30, by = h * 0.72, half = w * 0.23;
  if (y >= ty && y <= by) {
    const hw = half * ((y - ty) / (by - ty));
    if (x >= cx - hw && x <= cx + hw) return [255, 255, 255, 255]; // white triangle
  }
  return [r, g, b, 255];
}
for (const sz of [192, 512, 180]) {
  const name = sz === 180 ? 'apple-touch-icon-180.png' : `icon-${sz}.png`;
  fs.writeFileSync(name, png(sz, sz, pixel));
  console.log('wrote', name, '(' + sz + 'x' + sz + ')');
}
