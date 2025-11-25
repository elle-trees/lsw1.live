import i18n from 'i18next';
import { env } from '../env';

// Translation cache to avoid repeated API calls
const translationCache = new Map<string, string>();

// Language code mapping for Google Translate API
const languageCodeMap: Record<string, string> = {
  'en': 'en',
  'es': 'es',
  'pt-BR': 'pt',
};

// Track pending translations to avoid duplicate requests
const pendingTranslations = new Set<string>();

/**
 * Translate text using Google Translate API (react-auto-translate style)
 * Uses GET request with query parameters like react-auto-translate
 */
export const translateText = async (text: string, targetLang: string): Promise<string | null> => {
  const apiKey = env.VITE_GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  // Check cache first
  const cacheKey = `${text}:${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }
  
  // Check if translation is already pending
  if (pendingTranslations.has(cacheKey)) {
    return null;
  }
  
  pendingTranslations.add(cacheKey);
  
  try {
    const targetCode = languageCodeMap[targetLang] || targetLang;
    const sourceCode = 'en'; // Always translate from English
    
    // Skip if same language
    if (targetCode === sourceCode) {
      pendingTranslations.delete(cacheKey);
      return text;
    }
    
    // Use react-auto-translate style: GET request with query parameters
    const encodedText = encodeURIComponent(text);
    const url = `https://translation.googleapis.com/language/translate/v2?source=${sourceCode}&target=${targetCode}&key=${apiKey}&q=${encodedText}&format=text`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Translation API error: ${response.statusText} - ${errorText}`);
    }
    
    const jsonResponse = await response.json();
    const translatedText = jsonResponse.data?.translations?.[0]?.translatedText;
    
    if (translatedText) {
      // Cache the translation
      translationCache.set(cacheKey, translatedText);
      pendingTranslations.delete(cacheKey);
      return translatedText;
    }
    
    pendingTranslations.delete(cacheKey);
    return null;
  } catch (error) {
    console.error('Error translating text:', error);
    pendingTranslations.delete(cacheKey);
    return null;
  }
};

/**
 * Auto-translate missing translation keys
 */
const autoTranslateMissingKey = async (key: string, targetLang: string): Promise<void> => {
  // Skip if already has translation or is English
  if (targetLang === 'en') {
    return;
  }
  
  // Get the English (fallback) translation
  const fallbackText = i18n.t(key, { lng: 'en', defaultValue: key });
  
  // If the key itself is returned, it means the translation doesn't exist even in English
  if (fallbackText === key) {
    return;
  }
  
  // Check if we already have this translation
  const existingTranslation = i18n.t(key, { lng: targetLang, defaultValue: null });
  if (existingTranslation && existingTranslation !== key) {
    return; // Already translated
  }
  
  // Translate the English text to the target language
  const translated = await translateText(fallbackText, targetLang);
  
  if (translated) {
    // Add the translated key to i18n resources
    const currentResources = i18n.getResourceBundle(targetLang, 'translation') || {};
    i18n.addResourceBundle(
      targetLang,
      'translation',
      { ...currentResources, [key]: translated },
      true,
      true
    );
    
    // Trigger a language change event to update components
    i18n.emit('languageChanged', targetLang);
  }
};

/**
 * Initialize auto-translate functionality
 * Intercepts missing translations and auto-translates them
 */
export const initAutoTranslate = (i18nInstance: typeof i18n) => {
  const apiKey = env.VITE_GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    console.warn('Google Translate API key not configured. Auto-translation disabled.');
    return;
  }
  
  // Store original t function
  const originalT = i18nInstance.t.bind(i18nInstance);
  
  // Track keys we're currently translating to avoid duplicate requests
  const translatingKeys = new Set<string>();
  
  // Override t function to intercept missing keys
  i18nInstance.t = function(key: string | string[], options?: any): string {
    const keys = Array.isArray(key) ? key : [key];
    const firstKey = keys[0];
    const targetLang = options?.lng || i18nInstance.language || 'en';
    
    // Get translation using original function
    let translation = originalT(key, options);
    
    // Check if translation is missing (returns the key or defaultValue)
    const isMissing = translation === firstKey || 
                     (options?.defaultValue && translation === options.defaultValue);
    
    // Auto-translate missing keys (only for non-English languages)
    if (isMissing && targetLang !== 'en') {
      const cacheKey = `${firstKey}:${targetLang}`;
      
      // Only translate if not already translating this key
      if (!translatingKeys.has(cacheKey)) {
        translatingKeys.add(cacheKey);
        
        // Auto-translate asynchronously (don't block the UI)
        autoTranslateMissingKey(firstKey, targetLang)
          .then(() => {
            translatingKeys.delete(cacheKey);
          })
          .catch((error) => {
            console.error('Error auto-translating key:', error);
            translatingKeys.delete(cacheKey);
          });
      }
    }
    
    return translation;
  };
  
  console.log('Auto-translate initialized with react-auto-translate style Google Translate API');
};

/**
 * Clear translation cache
 */
export const clearTranslationCache = () => {
  translationCache.clear();
  pendingTranslations.clear();
};

