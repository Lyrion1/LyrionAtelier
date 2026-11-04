import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const source = 'images/favicon/favicon.png';

async function png(size) {
  return sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const parts = [header];
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    parts.push(entry);
  }
  for (const image of images) parts.push(image.png);
  return Buffer.concat(parts);
}

const sizes = [16, 32, 48, 180];
const buffers = {};
for (const size of sizes) buffers[size] = await png(size);

await writeFile('images/favicon/favicon-16.png', buffers[16]);
await writeFile('images/favicon/favicon-32.png', buffers[32]);
await writeFile('images/favicon/favicon-48.png', buffers[48]);
await writeFile('images/favicon/apple-touch-icon.png', buffers[180]);
await writeFile('images/favicon/favicon.png', buffers[48]);
await sharp(buffers[48]).webp({ quality: 80 }).toFile('images/favicon/favicon.webp');
const icon = ico([
  { size: 16, png: buffers[16] },
  { size: 32, png: buffers[32] },
  { size: 48, png: buffers[48] }
]);
await writeFile('favicon.ico', icon);
await writeFile('images/favicon/favicon.ico', icon);

const { statSync } = await import('node:fs');
for (const file of [
  'favicon.ico',
  'images/favicon/favicon.png',
  'images/favicon/favicon.webp',
  'images/favicon/favicon-32.png',
  'images/favicon/apple-touch-icon.png'
]) {
  console.log(file, statSync(file).size);
}
