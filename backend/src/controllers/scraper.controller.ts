import { Request, Response } from 'express';
import { z } from 'zod';

const fetchImageSchema = z.object({
  url: z.string().url(),
});

export const fetchImageFromUrl = async (req: Request, res: Response) => {
  try {
    const { url } = fetchImageSchema.parse(req.body);

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      res.status(400).json({ error: 'Failed to fetch URL' });
      return;
    }

    const html = await response.text();

    // Extract og:image meta tag
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    let imageUrl = ogImageMatch ? ogImageMatch[1] : null;

    // Fallback: try content first, then property
    if (!imageUrl) {
      const ogImageMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
      imageUrl = ogImageMatch2 ? ogImageMatch2[1] : null;
    }

    // Fallback: try twitter:image
    if (!imageUrl) {
      const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      imageUrl = twitterImageMatch ? twitterImageMatch[1] : null;
    }

    // Fallback: try content first for twitter:image
    if (!imageUrl) {
      const twitterImageMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["'][^>]*>/i);
      imageUrl = twitterImageMatch2 ? twitterImageMatch2[1] : null;
    }

    // Fallback: look for any large image in img tags
    if (!imageUrl) {
      const imgMatches = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
      if (imgMatches && imgMatches.length > 0) {
        // Try to find the first image with a reasonable size indicator
        for (const imgTag of imgMatches) {
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          if (srcMatch && srcMatch[1]) {
            const src = srcMatch[1];
            // Skip small images, icons, logos
            if (!src.includes('logo') && !src.includes('icon') && !src.includes('sprite')) {
              imageUrl = src;
              break;
            }
          }
        }
      }
    }

    if (!imageUrl) {
      res.status(404).json({ error: 'No image found on the page' });
      return;
    }

    // Make relative URLs absolute
    if (imageUrl.startsWith('/')) {
      const urlObj = new URL(url);
      imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
    } else if (imageUrl.startsWith('//')) {
      imageUrl = `https:${imageUrl}`;
    } else if (!imageUrl.startsWith('http')) {
      const urlObj = new URL(url);
      imageUrl = `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
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
