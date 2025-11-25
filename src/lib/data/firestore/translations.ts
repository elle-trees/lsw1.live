import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  type Unsubscribe
} from "firebase/firestore";

export interface AdminTranslation {
  id: string; // Translation key (e.g., "home.title")
  language: string; // Language code (e.g., "en", "es", "pt-BR")
  value: string; // The translated text
  updatedAt: number; // Timestamp
  updatedBy?: string; // Admin UID who made the change
}

const TRANSLATIONS_COLLECTION = "adminTranslations";

/**
 * Get all admin translations for a specific language
 */
export const getAdminTranslations = async (language: string): Promise<Record<string, string>> => {
  if (!db) return {};
  try {
    const q = query(
      collection(db, TRANSLATIONS_COLLECTION),
      where("language", "==", language)
    );
    const snapshot = await getDocs(q);
    const translations: Record<string, string> = {};
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as AdminTranslation;
      translations[data.id] = data.value;
    });
    
    return translations;
  } catch (error: any) {
    // Silently handle permission errors - translations are optional
    // Only log if it's not a permission error
    if (error?.code !== 'permission-denied') {
    console.error("Error fetching admin translations:", error);
    }
    return {};
  }
};

/**
 * Get all admin translations for all languages
 */
export const getAllAdminTranslations = async (): Promise<Record<string, Record<string, string>>> => {
  if (!db) return {};
  try {
    const snapshot = await getDocs(collection(db, TRANSLATIONS_COLLECTION));
    const translations: Record<string, Record<string, string>> = {};
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as AdminTranslation;
      if (!translations[data.language]) {
        translations[data.language] = {};
      }
      translations[data.language][data.id] = data.value;
    });
    
    return translations;
  } catch (error: any) {
    // Silently handle permission errors - translations are optional
    // Only log if it's not a permission error
    if (error?.code !== 'permission-denied') {
    console.error("Error fetching all admin translations:", error);
    }
    return {};
  }
};

/**
 * Set an admin translation for a specific language
 * Only affects the specified language
 */
export const setAdminTranslation = async (
  key: string,
  language: string,
  value: string,
  updatedBy?: string
): Promise<void> => {
  if (!db) throw new Error("Firestore not initialized");
  
  const translationId = `${language}_${key}`;
  const translationDoc = doc(db, TRANSLATIONS_COLLECTION, translationId);
  
  await setDoc(translationDoc, {
    id: key,
    language,
    value,
    updatedAt: Date.now(),
    updatedBy,
  } as AdminTranslation);
};

/**
 * Delete an admin translation
 */
export const deleteAdminTranslation = async (
  key: string,
  language: string
): Promise<void> => {
  if (!db) throw new Error("Firestore not initialized");
  
  const translationId = `${language}_${key}`;
  const translationDoc = doc(db, TRANSLATIONS_COLLECTION, translationId);
  await deleteDoc(translationDoc);
};

/**
 * Subscribe to admin translations for a specific language
 * Returns an unsubscribe function
 */
export const subscribeToAdminTranslations = (
  language: string,
  callback: (translations: Record<string, string>) => void
): Unsubscribe => {
  if (!db) {
    callback({});
    return () => {};
  }
  
  const q = query(
    collection(db, TRANSLATIONS_COLLECTION),
    where("language", "==", language)
  );
  
  let hasErrored = false;
  
  return onSnapshot(q, (snapshot) => {
    // Reset error flag on successful snapshot
    hasErrored = false;
    const translations: Record<string, string> = {};
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as AdminTranslation;
      translations[data.id] = data.value;
    });
    callback(translations);
  }, (error: any) => {
    // Only log the error once to avoid spam, and skip permission errors
    if (!hasErrored && error?.code !== 'permission-denied') {
      console.error("Error subscribing to admin translations:", error);
      hasErrored = true;
    }
    // Return empty translations on error instead of retrying
    callback({});
  });
};

