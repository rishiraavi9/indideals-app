// Translation service for deal content using Google Translate API
// Uses free Google Translate endpoint (limited, for production use official API)

const TRANSLATION_CACHE_KEY = 'indiadeals_translations';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  text: string;
  timestamp: number;
}

interface TranslationCache {
  [key: string]: CacheEntry;
}

// Load cache from localStorage
function loadCache(): TranslationCache {
  try {
    const cached = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

// Save cache to localStorage
function saveCache(cache: TranslationCache): void {
  try {
    // Clean expired entries before saving
    const now = Date.now();
    const cleanedCache: TranslationCache = {};
    for (const key in cache) {
      if (now - cache[key].timestamp < CACHE_EXPIRY_MS) {
        cleanedCache[key] = cache[key];
      }
    }
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cleanedCache));
  } catch {
    // Ignore storage errors
  }
}

// Generate cache key
function getCacheKey(text: string, targetLang: string): string {
  return `${targetLang}:${text.substring(0, 100)}`;
}

// Check if language needs translation (English doesn't need translation)
export function needsTranslation(langCode: string): boolean {
  return langCode !== 'en';
}

// Translate text using Google Translate API
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'en'
): Promise<string> {
  // Don't translate if target is English or text is empty
  if (targetLang === 'en' || !text || text.trim() === '') {
    return text;
  }

  // Check cache first
  const cache = loadCache();
  const cacheKey = getCacheKey(text, targetLang);
  const cached = cache[cacheKey];

  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    return cached.text;
  }

  try {
    // Use Google Translate API (free endpoint - for production, use official API with key)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();

    // Extract translated text from response
    // Response format: [[["translated text","original text",null,null,10]],null,"en",...]
    let translatedText = '';
    if (data && data[0]) {
      for (const part of data[0]) {
        if (part[0]) {
          translatedText += part[0];
        }
      }
    }

    if (translatedText) {
      // Cache the result
      cache[cacheKey] = {
        text: translatedText,
        timestamp: Date.now(),
      };
      saveCache(cache);
      return translatedText;
    }

    return text; // Return original if translation failed
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original on error
  }
}

// Batch translate multiple texts
export async function translateBatch(
  texts: string[],
  targetLang: string,
  sourceLang: string = 'en'
): Promise<string[]> {
  if (targetLang === 'en') {
    return texts;
  }

  // Translate in parallel with rate limiting
  const results: string[] = [];
  const batchSize = 5; // Translate 5 at a time to avoid rate limiting

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const translations = await Promise.all(
      batch.map(text => translateText(text, targetLang, sourceLang))
    );
    results.push(...translations);
  }

  return results;
}

// Translate deal object
export interface TranslatableDeal {
  id: string;
  title: string;
  description?: string | null;
  merchant?: string | null;
}

export async function translateDeal<T extends TranslatableDeal>(
  deal: T,
  targetLang: string
): Promise<T> {
  if (targetLang === 'en') {
    return deal;
  }

  const [translatedTitle, translatedDescription] = await Promise.all([
    translateText(deal.title, targetLang),
    deal.description ? translateText(deal.description, targetLang) : Promise.resolve(deal.description),
  ]);

  return {
    ...deal,
    title: translatedTitle,
    description: translatedDescription,
  };
}

// Translate multiple deals
export async function translateDeals<T extends TranslatableDeal>(
  deals: T[],
  targetLang: string
): Promise<T[]> {
  if (targetLang === 'en' || deals.length === 0) {
    return deals;
  }

  // Translate all deals in parallel (with some batching)
  const batchSize = 10;
  const results: T[] = [];

  for (let i = 0; i < deals.length; i += batchSize) {
    const batch = deals.slice(i, i + batchSize);
    const translations = await Promise.all(
      batch.map(deal => translateDeal(deal, targetLang))
    );
    results.push(...translations);
  }

  return results;
}

// Clear translation cache
export function clearTranslationCache(): void {
  localStorage.removeItem(TRANSLATION_CACHE_KEY);
}
