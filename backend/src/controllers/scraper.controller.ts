import { Request, Response } from 'express';
import { z } from 'zod';

const fetchImageSchema = z.object({
  url: z.string().url(),
});

/**
 * Check if a URL is a valid product image URL (not a tracking pixel or invalid URL)
 */
function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  // List of patterns that indicate tracking pixels or invalid URLs
  const invalidPatterns = [
    'fls-eu.amazon',     // Amazon tracking pixel
    'fls.amazon',        // Amazon tracking pixel
    'uedata',            // Amazon user event data
    '/batch/',           // Batch tracking URLs
    '/OP/',              // Amazon operation tracking
    'pixel',             // Tracking pixels
    'beacon',            // Beacon tracking
    'tracking',          // General tracking
    '1x1',               // 1x1 pixel images
    'spacer',            // Spacer images
    'blank.gif',         // Blank images
    'transparent',       // Transparent images
    'data:image',        // Data URIs (usually tiny)
    '.svg',              // Skip SVGs (usually icons)
  ];

  const urlLower = url.toLowerCase();
  for (const pattern of invalidPatterns) {
    if (urlLower.includes(pattern)) {
      return false;
    }
  }

  // Must have common image extension or be from known CDN
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const validCDNs = [
    'images-amazon.com',
    'm.media-amazon.com',
    'images-na.ssl-images-amazon.com',
    'rukminim1.flixcart.com',
    'rukminim2.flixcart.com',
    'assets.myntassets.com',
    'static.nike.com',
    'images.samsung.com',
    'store.storeimages.cdn-apple.com',
  ];

  // Check if it has a valid extension
  const hasValidExtension = validExtensions.some(ext => urlLower.includes(ext));

  // Check if it's from a known CDN
  const isFromValidCDN = validCDNs.some(cdn => urlLower.includes(cdn));

  // Accept if it has valid extension or is from known CDN
  return hasValidExtension || isFromValidCDN;
}

/**
 * Make relative URLs absolute
 */
function makeAbsoluteUrl(imageUrl: string, baseUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  try {
    const urlObj = new URL(baseUrl);
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    } else if (imageUrl.startsWith('/')) {
      return `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
    } else {
      return `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
    }
  } catch {
    return imageUrl;
  }
}

/**
 * Check if URL is a shortened link that needs expansion
 */
function isShortUrl(url: string): boolean {
  const shortDomains = [
    'amzn.to', 'amzn.in', 'fkrt.co', 'fkrt.it', 'myntr.in',
    'bit.ly', 'goo.gl', 'tinyurl.com', 't.co', 'ajiio.co'
  ];
  const lowerUrl = url.toLowerCase();
  return shortDomains.some(domain => lowerUrl.includes(domain));
}

/**
 * Expand a shortened URL by following redirects
 */
async function expandShortUrl(shortUrl: string): Promise<string> {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    return response.url || shortUrl;
  } catch {
    // Try GET if HEAD fails
    try {
      const response = await fetch(shortUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      return response.url || shortUrl;
    } catch {
      return shortUrl;
    }
  }
}

export const fetchImageFromUrl = async (req: Request, res: Response) => {
  try {
    let { url } = fetchImageSchema.parse(req.body);

    // Expand shortened URLs first
    if (isShortUrl(url)) {
      console.log(`[Scraper] Expanding shortened URL: ${url}`);
      url = await expandShortUrl(url);
      console.log(`[Scraper] Expanded to: ${url}`);
    }

    // Fetch the HTML content
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    // Use final URL after redirects
    const finalUrl = response.url || url;

    if (!response.ok) {
      res.status(400).json({ error: 'Failed to fetch URL' });
      return;
    }

    const html = await response.text();
    let imageUrl: string | null = null;

    // For Amazon URLs, use specific selectors (check against final URL)
    const isAmazon = finalUrl.includes('amazon.in') || finalUrl.includes('amazon.com');
    const isFlipkart = finalUrl.includes('flipkart.com');

    if (isAmazon) {
      // Amazon-specific: Look for the main product image
      // Pattern 1: landingImage id
      const landingImageMatch = html.match(/id=["']landingImage["'][^>]*src=["']([^"']+)["']/i);
      if (landingImageMatch && isValidImageUrl(landingImageMatch[1])) {
        imageUrl = landingImageMatch[1];
      }

      // Pattern 2: data-old-hires attribute (high-res image)
      if (!imageUrl) {
        const hiResMatch = html.match(/data-old-hires=["']([^"']+)["']/i);
        if (hiResMatch && isValidImageUrl(hiResMatch[1])) {
          imageUrl = hiResMatch[1];
        }
      }

      // Pattern 3: imgTagWrapperId container
      if (!imageUrl) {
        const imgTagMatch = html.match(/id=["']imgTagWrapperId["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i);
        if (imgTagMatch && isValidImageUrl(imgTagMatch[1])) {
          imageUrl = imgTagMatch[1];
        }
      }

      // Pattern 4: images-amazon.com URLs
      if (!imageUrl) {
        const amazonImageMatch = html.match(/["'](https?:\/\/[^"']*images-amazon\.com[^"']*\.(jpg|jpeg|png|webp)[^"']*)["']/i);
        if (amazonImageMatch && isValidImageUrl(amazonImageMatch[1])) {
          imageUrl = amazonImageMatch[1];
        }
      }

      // Pattern 5: m.media-amazon.com URLs
      if (!imageUrl) {
        const mediaAmazonMatch = html.match(/["'](https?:\/\/m\.media-amazon\.com[^"']*\.(jpg|jpeg|png|webp)[^"']*)["']/i);
        if (mediaAmazonMatch && isValidImageUrl(mediaAmazonMatch[1])) {
          imageUrl = mediaAmazonMatch[1];
        }
      }
    }

    if (isFlipkart) {
      // Flipkart-specific: Look for product images
      const flipkartImageMatch = html.match(/["'](https?:\/\/rukminim[12]\.flixcart\.com[^"']+)["']/i);
      if (flipkartImageMatch && isValidImageUrl(flipkartImageMatch[1])) {
        imageUrl = flipkartImageMatch[1];
      }
    }

    // Generic fallback: Extract og:image meta tag
    if (!imageUrl) {
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      if (ogImageMatch && isValidImageUrl(ogImageMatch[1])) {
        imageUrl = ogImageMatch[1];
      }
    }

    // Fallback: try content first, then property
    if (!imageUrl) {
      const ogImageMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
      if (ogImageMatch2 && isValidImageUrl(ogImageMatch2[1])) {
        imageUrl = ogImageMatch2[1];
      }
    }

    // Fallback: try twitter:image
    if (!imageUrl) {
      const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      if (twitterImageMatch && isValidImageUrl(twitterImageMatch[1])) {
        imageUrl = twitterImageMatch[1];
      }
    }

    // Fallback: try content first for twitter:image
    if (!imageUrl) {
      const twitterImageMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["'][^>]*>/i);
      if (twitterImageMatch2 && isValidImageUrl(twitterImageMatch2[1])) {
        imageUrl = twitterImageMatch2[1];
      }
    }

    // Fallback: look for any large image in img tags
    if (!imageUrl) {
      const imgMatches = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
      if (imgMatches && imgMatches.length > 0) {
        for (const imgTag of imgMatches) {
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          if (srcMatch && srcMatch[1]) {
            const src = srcMatch[1];
            // Skip small images, icons, logos and validate
            if (!src.includes('logo') && !src.includes('icon') && !src.includes('sprite') && isValidImageUrl(src)) {
              imageUrl = src;
              break;
            }
          }
        }
      }
    }

    if (!imageUrl) {
      res.status(404).json({ error: 'No valid product image found on the page' });
      return;
    }

    // Make relative URLs absolute
    imageUrl = makeAbsoluteUrl(imageUrl, finalUrl);

    // Final validation
    if (!isValidImageUrl(imageUrl)) {
      res.status(404).json({ error: 'No valid product image found on the page' });
      return;
    }

    res.json({ imageUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid URL', details: error.errors });
      return;
    }
    console.error('Fetch image error:', error);
    res.status(500).json({ error: 'Failed to extract image from URL' });
  }
};
