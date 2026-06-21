#!/usr/bin/env bun
/**
 * compress-images.ts — losslessly optimize images in place using Bun.Image.
 *
 * Re-encodes raster images with maximum compression and **no quality loss**
 * (PNG and WebP use lossless settings; JPEG re-encodes at a high quality you
 * can tune). Uses Bun's built-in `Bun.Image` pipeline — zero npm dependencies
 * and no native build step. Ideal for shrinking book figures before committing
 * them, so the git repository stays small without needing Git LFS.
 *
 * Each source is re-encoded to a sibling temp file; the original is replaced
 * **only when the result is actually smaller**, so a file is never made worse.
 *
 * Usage:
 *   bun run scripts/compress-images.ts [path] [options]
 *
 *   path                A file, a directory (scanned recursively), or a glob.
 *                       Defaults to "content" (all book images).
 *
 * Options:
 *   --quality <1-100>   JPEG re-encode quality (default 90). PNG/WebP ignore
 *                       this — they are always lossless.
 *   --dry-run           Report projected savings without writing any files.
 *   --help              Show this help.
 *
 * Examples:
 *   bun run scripts/compress-images.ts
 *   bun run scripts/compress-images.ts content/ddia-2nd/images
 *   bun run scripts/compress-images.ts "content/**\/*.png" --dry-run
 */

import {
  existsSync,
  readdirSync,
  statSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { join, extname, resolve, relative } from 'node:path';

const SUPPORTED = new Set(['.png', '.jpg', '.jpeg', '.webp']);

interface Options {
  quality: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): { input: string; opts: Options } {
  let input = 'content';
  let inputSet = false;
  const opts: Options = { quality: 90, dryRun: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--quality') {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n < 1 || n > 100) {
        fail('--quality must be a number between 1 and 100.');
      }
      opts.quality = n;
    } else if (a.startsWith('--')) {
      fail(`Unknown option: ${a}`);
    } else if (!inputSet) {
      input = a;
      inputSet = true;
    } else {
      fail(`Unexpected extra argument: ${a}`);
    }
  }

  return { input, opts };
}

function printHelp(): void {
  console.log(
    `\ncompress-images — losslessly optimize images in place (Bun.Image)\n\n` +
    `Usage:\n  bun run scripts/compress-images.ts [path] [--quality <1-100>] [--dry-run]\n\n` +
    `  path   file | directory (recursive) | glob.  Default: "content"\n\n` +
    `PNG and WebP are always lossless; --quality (default 90) applies to JPEG only.\n` +
    `Originals are replaced only when the re-encoded file is smaller.\n`
  );
}

function fail(msg: string): never {
  console.error(`\n\u2716 ${msg}\n`);
  process.exit(1);
}

function isImage(p: string): boolean {
  return SUPPORTED.has(extname(p).toLowerCase());
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && isImage(full)) out.push(full);
  }
  return out;
}

function resolveInputs(input: string): string[] {
  if (input.includes('*')) {
    const glob = new Bun.Glob(input);
    const matches = [...glob.scanSync({ cwd: process.cwd(), onlyFiles: true })]
      .map((p) => resolve(process.cwd(), p))
      .filter(isImage);
    if (!matches.length) fail(`No images matched glob: ${input}`);
    return matches;
  }
  const abs = resolve(process.cwd(), input);
  if (!existsSync(abs)) fail(`Input not found: ${input}`);
  if (statSync(abs).isDirectory()) {
    const files = walk(abs);
    if (!files.length) fail(`No images found in directory: ${input}`);
    return files;
  }
  if (!isImage(abs)) fail(`Not a supported image (.png/.jpg/.jpeg/.webp): ${input}`);
  return [abs];
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** Re-encode one image with lossless/high-quality settings. */
function encode(src: string, quality: number) {
  const img = Bun.file(src).image();
  switch (extname(src).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return img.jpeg({ quality, progressive: true });
    case '.webp':
      return img.webp({ lossless: true });
    default: // .png
      return img.png({ compressionLevel: 9 });
  }
}

async function main(): Promise<void> {
  if (typeof Bun === 'undefined' || !Bun.Image) {
    fail('This script must be run with Bun (Bun.Image is required).');
  }

  const { input, opts } = parseArgs(Bun.argv.slice(2));
  const files = resolveInputs(input);

  console.log(
    `compress-images: ${files.length} file(s)${opts.dryRun ? ' (dry-run)' : ''}\n`
  );

  let totalBefore = 0;
  let totalAfter = 0;
  let optimized = 0;

  for (const src of files) {
    const before = statSync(src).size;
    totalBefore += before;

    const tmp = `${src}.tmp`;
    try {
      await encode(src, opts.quality).write(tmp);
    } catch (err) {
      if (existsSync(tmp)) rmSync(tmp);
      console.error(`  \u2716 ${relative(process.cwd(), src)} — ${(err as Error).message}`);
      totalAfter += before;
      continue;
    }

    const after = statSync(tmp).size;

    if (after < before) {
      const pct = (((after - before) / before) * 100).toFixed(0);
      if (opts.dryRun) {
        rmSync(tmp);
      } else {
        renameSync(tmp, src);
      }
      console.log(
        `  \u2713 ${relative(process.cwd(), src)}  ${fmtBytes(before)} \u2192 ${fmtBytes(after)} (${pct}%)`
      );
      totalAfter += after;
      optimized++;
    } else {
      // No gain — keep the original untouched.
      rmSync(tmp);
      totalAfter += before;
      console.log(`  \u00b7 ${relative(process.cwd(), src)}  already optimal`);
    }
  }

  const saved = totalBefore - totalAfter;
  const pct = totalBefore ? ((saved / totalBefore) * 100).toFixed(1) : '0';
  console.log(
    `\n${opts.dryRun ? 'Would optimize' : 'Optimized'} ${optimized}/${files.length} file(s).` +
    `\nTotal: ${fmtBytes(totalBefore)} \u2192 ${fmtBytes(totalAfter)} ` +
    `(saved ${fmtBytes(saved)}, ${pct}%).`
  );
}

main();
