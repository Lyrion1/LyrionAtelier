/**
 * Image optimization script for Lyrion Atelier
 *
 * - Compresses JPG/JPEG images to under 200 KB (quality 80, mozjpeg)
 * - Compresses PNG images with pngquant (lossless-quality compression)
 * - Creates sibling .webp versions for every processed image
 * - Skips files that are already under 200 KB
 * - Skips files already named *.webp
 * - Never changes aspect ratio or crops images
 *
 * Usage:
 *   node scripts/optimize-images.mjs [--dry-run]
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TARGET_BYTES = 200 * 1024; // 200 KB
const JPEG_QUALITY = 80;
const PNG_QUALITY = 80; // pngquant quality level
const WEBP_QUALITY = 82;
const DRY_RUN = process.argv.includes('--dry-run');

// Directories to scan (relative to ROOT)
const IMAGE_DIRS = ['images', 'shop-images', 'oracle-images'];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return;

  const fileStat = await stat(filePath);
  const originalSize = fileStat.size;
  const webpPath = filePath.replace(/\.(jpe?g|png)$/i, '.webp');

  // Skip if already small enough – but still create webp if missing
  const needsCompression = originalSize > TARGET_BYTES;

  if (DRY_RUN) {
    if (needsCompression) {
      console.log(`[DRY-RUN] Would compress: ${path.relative(ROOT, filePath)} (${(originalSize / 1024).toFixed(1)} KB)`);
    }
    return;
  }

  try {
    const instance = sharp(filePath);
    const meta = await instance.metadata();

    if (needsCompression) {
      // Re-compress in-place
      let buffer;
      if (ext === '.png') {
        buffer = await sharp(filePath)
          .png({ quality: PNG_QUALITY, compressionLevel: 9 })
          .toBuffer();
      } else {
        buffer = await sharp(filePath)
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .toBuffer();
      }

      // If the buffer is still over limit, reduce quality further in steps
      if (buffer.length > TARGET_BYTES) {
        let quality = JPEG_QUALITY - 10;
        while (buffer.length > TARGET_BYTES && quality >= 40) {
          if (ext === '.png') {
            buffer = await sharp(filePath)
              .png({ quality, compressionLevel: 9 })
              .toBuffer();
          } else {
            buffer = await sharp(filePath)
              .jpeg({ quality, mozjpeg: true })
              .toBuffer();
          }
          quality -= 10;
        }
      }

      const { writeFile } = await import('fs/promises');
      await writeFile(filePath, buffer);
      const saved = originalSize - buffer.length;
      console.log(
        `Compressed: ${path.relative(ROOT, filePath)} ` +
        `${(originalSize / 1024).toFixed(1)} KB → ${(buffer.length / 1024).toFixed(1)} KB ` +
        `(saved ${(saved / 1024).toFixed(1)} KB)`
      );
    }

    // Create WebP version only if it will be smaller than the source
    try {
      await stat(webpPath);
      // WebP already exists – skip creation
    } catch {
      const webpBuffer = await sharp(filePath)
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      const currentSize = (await stat(filePath)).size;
      if (webpBuffer.length < currentSize) {
        const { writeFile } = await import('fs/promises');
        await writeFile(webpPath, webpBuffer);
        console.log(
          `WebP created: ${path.relative(ROOT, webpPath)} (${(webpBuffer.length / 1024).toFixed(1)} KB)`
        );
      }
    }
  } catch (err) {
    console.warn(`Skipped (error): ${path.relative(ROOT, filePath)} – ${err.message}`);
  }
}

async function main() {
  console.log(DRY_RUN ? '[DRY-RUN MODE]\n' : 'Optimizing images...\n');
  let processed = 0;

  for (const dir of IMAGE_DIRS) {
    const absDir = path.join(ROOT, dir);
    for await (const file of walk(absDir)) {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        await optimizeImage(file);
        processed++;
      }
    }
  }

  console.log(`\nDone. Checked ${processed} images.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
