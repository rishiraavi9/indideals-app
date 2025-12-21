/**
 * Image Fallback Service
 *
 * Attempts to extract product images from merchant URLs when the original image fails.
 * This is used as a fallback when Telegram CDN images expire.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

interface ImageFallbackResult {
  success: boolean;
  imageUrl: string | null;
  source: 'amazon' | 'flipkart' | 'other' | null;
}

/**
 * Extract product image from Amazon product page
 */
async function extractAmazonImage(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Try multiple Amazon image selectors
    const selectors = [
      '#landingImage',
      '#imgBlkFront',
      '#main-image',
      '.a-dynamic-image',
      '[data-old-hires]',
      '#imageBlock img',
    ];

    for (const selector of selectors) {
      const img = $(selector).first();
      if (img.length) {
        // Try data-old-hires first (higher res), then src
        const imageUrl = img.attr('data-old-hires') || img.attr('src');
        if (imageUrl && imageUrl.startsWith('http')) {
          return imageUrl;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to extract Amazon image:', error);
    return null;
  }
}

/**
 * Extract product image from Flipkart product page
 */
async function extractFlipkartImage(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Try multiple Flipkart image selectors
    const selectors = ['._396cs4', '._2r_T1I', '.CXW8mj img', '._1YokD2 img', '._3kidJX img'];

    for (const selector of selectors) {
      const img = $(selector).first();
      if (img.length) {
        let imageUrl = img.attr('src');
        if (imageUrl) {
          // Flipkart uses low-res thumbnails, try to get higher res
          imageUrl = imageUrl.replace(/128\/128|312\/312|416\/416/, '832/832');
          if (imageUrl.startsWith('http')) {
            return imageUrl;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to extract Flipkart image:', error);
    return null;
  }
}

/**
 * Get image fallback from merchant URL
 */
export async function getImageFallback(merchantUrl: string): Promise<ImageFallbackResult> {
  if (!merchantUrl) {
    return { success: false, imageUrl: null, source: null };
  }

  try {
    const url = new URL(merchantUrl);
    const hostname = url.hostname.toLowerCase();

    // Detect merchant and extract image
    if (hostname.includes('amazon')) {
      const imageUrl = await extractAmazonImage(merchantUrl);
      return {
        success: !!imageUrl,
        imageUrl,
        source: 'amazon',
      };
    }

    if (hostname.includes('flipkart')) {
      const imageUrl = await extractFlipkartImage(merchantUrl);
      return {
        success: !!imageUrl,
        imageUrl,
        source: 'flipkart',
      };
    }

    // Unknown merchant
    return { success: false, imageUrl: null, source: 'other' };
  } catch (error) {
    console.error('Image fallback error:', error);
    return { success: false, imageUrl: null, source: null };
  }
}

export default { getImageFallback };
