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
import { URL } from 'url';

/**
 * SSRF Protection: Validate URL to prevent internal network access
 */
function isAllowedUrl(urlString: string): { allowed: boolean; reason?: string } {
  try {
    const url = new URL(urlString);

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { allowed: false, reason: 'Invalid protocol' };
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost and loopback addresses
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.localhost')
    ) {
      return { allowed: false, reason: 'Localhost access not allowed' };
    }

    // Block private IP ranges (RFC 1918)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);

      // 10.0.0.0/8
      if (a === 10) {
        return { allowed: false, reason: 'Private IP not allowed' };
      }
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) {
        return { allowed: false, reason: 'Private IP not allowed' };
      }
      // 192.168.0.0/16
      if (a === 192 && b === 168) {
        return { allowed: false, reason: 'Private IP not allowed' };
      }
      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) {
        return { allowed: false, reason: 'Link-local IP not allowed' };
      }
      // 127.0.0.0/8 (loopback)
      if (a === 127) {
        return { allowed: false, reason: 'Loopback IP not allowed' };
      }
      // 0.0.0.0/8
      if (a === 0) {
        return { allowed: false, reason: 'Invalid IP' };
      }
    }

    // Block cloud metadata endpoints
    const blockedHostnames = [
      '169.254.169.254', // AWS/GCP/Azure metadata
      'metadata.google.internal',
      'metadata.google.com',
      'metadata',
      'instance-data',
    ];
    if (blockedHostnames.includes(hostname)) {
      return { allowed: false, reason: 'Cloud metadata access not allowed' };
    }

    // Block internal service names
    const blockedPatterns = [
      /^redis/i,
      /^postgres/i,
      /^mysql/i,
      /^mongo/i,
      /^elasticsearch/i,
      /^rabbitmq/i,
      /^internal\./i,
      /^private\./i,
    ];
    if (blockedPatterns.some(pattern => pattern.test(hostname))) {
      return { allowed: false, reason: 'Internal service access not allowed' };
    }

    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'Invalid URL' };
  }
}

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
): Promise<{ buffer: Buffer; contentType: string; error?: string } | null> {
  // SSRF Protection: Validate URL before fetching
  const urlCheck = isAllowedUrl(url);
  if (!urlCheck.allowed) {
    console.warn(`[ImageProxy] Blocked SSRF attempt: ${url} - ${urlCheck.reason}`);
    return null;
  }

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
