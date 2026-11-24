#!/usr/bin/env node
/**
 * Convert product photos and sample-gallery shots to AVIF + WebP masters.
 *
 *   npm run images:optimize -- <input-dir> [output-dir] [--max=2400] [--force]
 *
 * - Walks <input-dir> for JPEG / PNG / TIFF / HEIC / WebP / AVIF files.
 * - Applies EXIF orientation, converts to sRGB, caps the long edge at --max px
 *   (never upscales) and strips all metadata (GPS, serial numbers).
 * - Writes <name>.avif and <name>.webp to [output-dir] (default public/images),
 *   keeping the sub-folder layout, and skips files that are already up to date.
 *
 * Upload the output to Supabase Storage (public bucket) or keep it under
 * public/images. next/image then serves AVIF or WebP at the requested width.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";

const INPUT_EXT = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff", ".heic", ".heif", ".webp", ".avif"]);

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? true];
  }),
);
const [inputDir, outputDir = "public/images"] = args.filter((a) => !a.startsWith("--"));
const maxEdge = Number(flags.max ?? 2400);

if (!inputDir || !Number.isFinite(maxEdge) || maxEdge < 64) {
  console.error("Usage: npm run images:optimize -- <input-dir> [output-dir] [--max=2400] [--force]");
  process.exit(1);
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (INPUT_EXT.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

async function isFresh(source, target) {
  try {
    return (await stat(target)).mtimeMs >= (await stat(source)).mtimeMs;
  } catch {
    return false;
  }
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
let converted = 0;
let skipped = 0;
let before = 0;
let after = 0;

for await (const file of walk(inputDir)) {
  const rel = path.relative(inputDir, file);
  const base = path.join(outputDir, rel.slice(0, -path.extname(rel).length));
  const targets = { avif: `${base}.avif`, webp: `${base}.webp` };

  if (!flags.force && (await isFresh(file, targets.avif)) && (await isFresh(file, targets.webp))) {
    skipped++;
    continue;
  }
  await mkdir(path.dirname(base), { recursive: true });

  const pipeline = sharp(file, { failOn: "error" })
    .rotate() // apply EXIF orientation before metadata is dropped
    .toColorspace("srgb")
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true });

  const [avif, webp] = await Promise.all([
    pipeline.clone().avif({ quality: 60, effort: 6, chromaSubsampling: "4:2:0" }).toFile(targets.avif),
    pipeline.clone().webp({ quality: 80, effort: 5, smartSubsample: true }).toFile(targets.webp),
  ]);

  const original = (await stat(file)).size;
  before += original;
  after += avif.size;
  converted++;
  console.log(`${rel}  ${avif.width}x${avif.height}  ${kb(original)} -> avif ${kb(avif.size)}, webp ${kb(webp.size)}`);
}

console.log(
  `\n${converted} converted, ${skipped} up to date` +
    (converted ? `; originals ${kb(before)} -> AVIF ${kb(after)} (${Math.round((1 - after / before) * 100)}% smaller)` : ""),
);
