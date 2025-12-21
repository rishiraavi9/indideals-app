#!/usr/bin/env node

/**
 * Generate PWA icons from SVG using sharp
 *
 * Usage: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const SOURCE_SVG = join(__dirname, '../frontend/public/desidealsai-app-icon.svg');
const OUTPUT_DIR = join(__dirname, '../frontend/public/icons');

async function generateIcons() {
  console.log('🎨 Generating PWA icons from DesiDealsAI logo...\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read SVG source
  const svgBuffer = readFileSync(SOURCE_SVG);

  for (const size of SIZES) {
    const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  ✅ Generated icon-${size}x${size}.png`);
  }

  console.log('\n✨ All icons generated successfully!');
  console.log(`📁 Output: ${OUTPUT_DIR}`);
}

generateIcons().catch(console.error);
