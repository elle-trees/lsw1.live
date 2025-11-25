import i18n from '@/lib/i18n';

/**
 * Get translated name for a category, subcategory, level, or platform
 * Falls back to the original name if no translation exists
 * Supports both static translations and admin-configured translations
 * 
 * @param type - The type of entity: 'category', 'subcategory', 'level', or 'platform'
 * @param id - The ID of the entity
 * @param originalName - The original name to use as fallback
 * @returns The translated name or the original name if no translation exists
 */
export function getEntityTranslation(
  type: 'category' | 'subcategory' | 'level' | 'platform',
  id: string,
  originalName: string
): string {
  if (!id || !originalName) {
    return originalName || '';
  }

  // Try to get translation from i18n
  // Format: entities.{type}.{id}
  const translationKey = `entities.${type}.${id}`;
  
  // Use the same pattern as header link translation
  // If translation doesn't exist, i18n.t will return the key itself
  let translated: string;
  try {
    translated = i18n.t(translationKey);
    
    // If translation exists and is different from the key, use it
    if (translated && translated !== translationKey && translated.trim() !== '') {
      return translated;
    }
  } catch (error) {
    // If there's an error, fall back to original name
    return originalName;
  }

  // Fall back to original name
  return originalName;
}

/**
 * Get translated label for a header link
 * Falls back to the original label if no translation exists
 * Supports both static translations (nav.{linkId}) and admin-configured translations (headerLinks.{linkId})
 * 
 * @param linkId - The ID of the header link
 * @param originalLabel - The original label to use as fallback
 * @returns The translated label or the original label if no translation exists
 */
export function getHeaderLinkTranslation(linkId: string, originalLabel: string): string {
  if (!linkId || !originalLabel) {
    return originalLabel || '';
  }

  // First try headerLinks.{linkId} (for admin-configured translations)
  const headerLinkKey = `headerLinks.${linkId}`;
  let headerLinkTranslation: string;
  try {
    headerLinkTranslation = i18n.t(headerLinkKey);
    // If translation exists and is different from the key, use it
    if (headerLinkTranslation && headerLinkTranslation !== headerLinkKey && headerLinkTranslation.trim() !== '') {
      return headerLinkTranslation;
    }
  } catch (error) {
    // Continue to next check
  }

  // Then try nav.{linkId} (for static translations that match common nav items)
  const navKey = `nav.${linkId}`;
  let navTranslation: string;
  try {
    navTranslation = i18n.t(navKey);
    // If translation exists and is different from the key, use it
    if (navTranslation && navTranslation !== navKey && navTranslation.trim() !== '') {
      return navTranslation;
    }
  } catch (error) {
    // Continue to fallback
  }

  // Fall back to original label
  return originalLabel;
}

/**
 * Get translated name for a category
 */
export function getCategoryTranslation(id: string, originalName: string): string {
  return getEntityTranslation('category', id, originalName);
}

/**
 * Get translated name for a subcategory
 */
export function getSubcategoryTranslation(id: string, originalName: string): string {
  return getEntityTranslation('subcategory', id, originalName);
}

/**
 * Get translated name for a level
 */
export function getLevelTranslation(id: string, originalName: string): string {
  return getEntityTranslation('level', id, originalName);
}

/**
 * Get translated name for a platform
 */
export function getPlatformTranslation(id: string, originalName: string): string {
  return getEntityTranslation('platform', id, originalName);
}

