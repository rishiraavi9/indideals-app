import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import te from './locales/te.json';

// Supported languages
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
] as const;

export type LanguageCode = typeof supportedLanguages[number]['code'];

// Local storage key for language preference
const LANGUAGE_KEY = 'indiadeals_language';

// Get saved language or default to English
export const getSavedLanguage = (): LanguageCode => {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved && supportedLanguages.some(lang => lang.code === saved)) {
    return saved as LanguageCode;
  }
  return 'en';
};

// Save language preference
export const saveLanguage = (lang: LanguageCode) => {
  localStorage.setItem(LANGUAGE_KEY, lang);
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_KEY,
      caches: ['localStorage'],
    },
  });

// Function to change language
export const changeLanguage = async (lang: LanguageCode) => {
  saveLanguage(lang);
  await i18n.changeLanguage(lang);
};

export default i18n;
