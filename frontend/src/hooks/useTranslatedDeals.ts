import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateDeals, needsTranslation, type TranslatableDeal } from '../services/translation.service';

interface UseTranslatedDealsOptions {
  enabled?: boolean;
}

/**
 * Hook to automatically translate deal titles and descriptions
 * based on the current language setting
 */
export function useTranslatedDeals<T extends TranslatableDeal>(
  deals: T[],
  options: UseTranslatedDealsOptions = {}
): {
  translatedDeals: T[];
  isTranslating: boolean;
} {
  const { i18n } = useTranslation();
  const { enabled = true } = options;

  const [translatedDeals, setTranslatedDeals] = useState<T[]>(deals);
  const [isTranslating, setIsTranslating] = useState(false);

  // Track the last translated state to avoid unnecessary re-translations
  const lastTranslatedRef = useRef<{ lang: string; dealIds: string }>({ lang: '', dealIds: '' });

  // Sync non-translatable fields (votes, comments, etc.) immediately when deals change
  useEffect(() => {
    setTranslatedDeals(prevTranslated => {
      // If we have translated deals, merge in the updated non-translatable fields
      if (prevTranslated.length > 0 && prevTranslated !== deals) {
        const dealMap = new Map(deals.map(d => [d.id, d]));
        return prevTranslated.map(translated => {
          const updated = dealMap.get(translated.id);
          if (updated) {
            // Preserve translated title/description, but sync other fields
            return {
              ...updated,
              title: translated.title,
              description: translated.description,
            };
          }
          return translated;
        });
      }
      return prevTranslated;
    });
  }, [deals]);

  useEffect(() => {
    const currentLang = i18n.language;
    const dealIds = deals.map(d => d.id).join(',');

    // Skip if nothing changed (for translation purposes - IDs and language)
    if (
      lastTranslatedRef.current.lang === currentLang &&
      lastTranslatedRef.current.dealIds === dealIds
    ) {
      return;
    }

    // If English or translation disabled, just use original deals
    if (!enabled || !needsTranslation(currentLang)) {
      setTranslatedDeals(deals);
      lastTranslatedRef.current = { lang: currentLang, dealIds };
      return;
    }

    // Translate deals
    let cancelled = false;

    const doTranslate = async () => {
      setIsTranslating(true);
      try {
        const translated = await translateDeals(deals, currentLang);
        if (!cancelled) {
          setTranslatedDeals(translated);
          lastTranslatedRef.current = { lang: currentLang, dealIds };
        }
      } catch (error) {
        console.error('Failed to translate deals:', error);
        if (!cancelled) {
          setTranslatedDeals(deals); // Fallback to original
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    };

    doTranslate();

    return () => {
      cancelled = true;
    };
  }, [deals, i18n.language, enabled]);

  return { translatedDeals, isTranslating };
}

/**
 * Hook to translate a single deal title
 */
export function useTranslatedText(
  text: string,
  options: { enabled?: boolean } = {}
): {
  translatedText: string;
  isTranslating: boolean;
} {
  const { i18n } = useTranslation();
  const { enabled = true } = options;

  const [translatedText, setTranslatedText] = useState(text);
  const [isTranslating, setIsTranslating] = useState(false);
  const lastRef = useRef<{ text: string; lang: string }>({ text: '', lang: '' });

  useEffect(() => {
    const currentLang = i18n.language;

    // Skip if nothing changed
    if (lastRef.current.text === text && lastRef.current.lang === currentLang) {
      return;
    }

    // If English or translation disabled, use original
    if (!enabled || !needsTranslation(currentLang) || !text) {
      setTranslatedText(text);
      lastRef.current = { text, lang: currentLang };
      return;
    }

    let cancelled = false;

    const doTranslate = async () => {
      setIsTranslating(true);
      try {
        const { translateText } = await import('../services/translation.service');
        const translated = await translateText(text, currentLang);
        if (!cancelled) {
          setTranslatedText(translated);
          lastRef.current = { text, lang: currentLang };
        }
      } catch {
        if (!cancelled) {
          setTranslatedText(text);
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    };

    doTranslate();

    return () => {
      cancelled = true;
    };
  }, [text, i18n.language, enabled]);

  return { translatedText, isTranslating };
}
