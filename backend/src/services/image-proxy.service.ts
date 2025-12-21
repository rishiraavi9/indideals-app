/**
 * Image Proxy Service (Option 3)
 *
 * Routes images through a proxy that caches them locally or on a CDN.
 * This prevents broken images when external URLs expire.
 *
 * For production, consider using:
 * - Cloudflare Images
 * - AWS CloudFront + S3
 * - Cloudinary
 * - imgix
 *
 * This is a simple in-memory cache for development/demo purposes.
 */

import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Simple file-based cache for demo (use Redis/S3 in production)
const CACHE_DIR = path.join(process.cwd(), '.image-cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface CachedImage {
  buffer: Buffer;
  contentType: string;
  cachedAt: Date;
}

// In-memory cache (limited, use Redis in production)
const memoryCache = new Map<string, CachedImage>();
const MAX_MEMORY_CACHE_SIZE = 100;

/**
 * Generate a cache key from URL
 */
function getCacheKey(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

/**
 * Get cached image from memory or file system
 */
async function getCachedImage(url: string): Promise<CachedImage | null> {
  const key = getCacheKey(url);

  // Check memory cache first
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  // Check file cache
  const filePath = path.join(CACHE_DIR, key);
  const metaPath = `${filePath}.meta`;

  if (fs.existsSync(filePath) && fs.existsSync(metaPath)) {
    try {
      const buffer = fs.readFileSync(filePath);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

      const cachedImage: CachedImage = {
        buffer,
        contentType: meta.contentType,
        cachedAt: new Date(meta.cachedAt),
      };

      // Add to memory cache
      if (memoryCache.size < MAX_MEMORY_CACHE_SIZE) {
        memoryCache.set(key, cachedImage);
      }

      return cachedImage;
    } catch {
      // Cache corrupted, will re-fetch
      return null;
    }
  }

  return null;
}

/**
 * Save image to cache
 */
async function cacheImage(url: string, buffer: Buffer, contentType: string): Promise<void> {
  const key = getCacheKey(url);

  // Save to memory cache
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) {
      memoryCache.delete(firstKey);
    }
  }

  const cachedImage: CachedImage = {
    buffer,
    contentType,
    cachedAt: new Date(),
  };

  memoryCache.set(key, cachedImage);

  // Save to file cache
  const filePath = path.join(CACHE_DIR, key);
  const metaPath = `${filePath}.meta`;

  try {
    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        url,
        contentType,
        cachedAt: cachedImage.cachedAt.toISOString(),
      })
    );
  } catch (error) {
    console.error('Failed to write image to file cache:', error);
  }
}

/**
 * Fetch and cache an image
 */
export async function proxyImage(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  // Try cache first
  const cached = await getCachedImage(url);
  if (cached) {
    return { buffer: cached.buffer, contentType: cached.contentType };
  }

  // Fetch from origin
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8',
      },
    });

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';

    // Cache the image
    await cacheImage(url, buffer, contentType);

    return { buffer, contentType };
  } catch (error) {
    console.error('Failed to fetch image:', error);
    return null;
  }
}

/**
 * Clear the image cache
 */
export function clearCache(): void {
  memoryCache.clear();

  if (fs.existsSync(CACHE_DIR)) {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }
  }
}

export default { proxyImage, clearCache };
