import i18n from 'i18next';
import { getAdminTranslations, subscribeToAdminTranslations } from '@/lib/data/firestore/translations';
import type { Resource } from 'i18next';

/**
 * Merges static translations with admin-configurable translations
 * Admin translations override static translations for the same key
 */
export const mergeTranslations = (
  staticTranslations: Record<string, any>,
  adminTranslations: Record<string, string>
): Record<string, any> => {
  const merged = { ...staticTranslations };
  
  // Deep merge admin translations into static translations
  for (const [key, value] of Object.entries(adminTranslations)) {
    const keys = key.split('.');
    let current: any = merged;
    
    // Navigate to the nested key location
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    // Set the final value
    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
  }
  
  return merged;
};

/**
 * Load and merge translations for a specific language
 */
export const loadLanguageTranslations = async (language: string): Promise<Resource> => {
  // Import static translations
  let staticTranslations: Record<string, any> = {};
  
  try {
    switch (language) {
      case 'en':
        staticTranslations = (await import('@/locales/en')).default;
        break;
      case 'es':
        staticTranslations = (await import('@/locales/es')).default;
        break;
      case 'pt-BR':
        staticTranslations = (await import('@/locales/pt-BR')).default;
        break;
      default:
        staticTranslations = (await import('@/locales/en')).default;
    }
  } catch (error) {
    console.error(`Error loading static translations for ${language}:`, error);
    staticTranslations = (await import('@/locales/en')).default;
  }
  
  // Get admin translations
  const adminTranslations = await getAdminTranslations(language);
  
  // Merge them
  const merged = mergeTranslations(staticTranslations, adminTranslations);
  
  return {
    translation: merged,
  };
};

/**
 * Update i18n resources with merged translations
 */
export const updateI18nResources = (language: string, translations: Record<string, any>) => {
  i18n.addResourceBundle(language, 'translation', translations, true, true);
};

/**
 * Initialize real-time subscription for admin translations
 */
export const initAdminTranslationSubscription = (language: string) => {
  return subscribeToAdminTranslations(language, (adminTranslations) => {
    // Get current static translations
    const staticResources = i18n.getResourceBundle(language, 'translation') || {};
    
    // Merge with admin translations
    const merged = mergeTranslations(staticResources, adminTranslations);
    
    // Update i18n resources
    updateI18nResources(language, merged);
    
    // Trigger a language change event to update all components
    i18n.emit('languageChanged', language);
  });
};

