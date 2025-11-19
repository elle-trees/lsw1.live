import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy,
  updateDoc
} from "firebase/firestore";
import { DownloadEntry, Category } from "@/types/database"; // Assuming Category is used for download categories too?
import { downloadEntryConverter } from "./converters";

// Note: The original file had 'getDownloadCategoriesFirestore' which returned Category[]? 
// Or maybe a different type. The original file had:
// match /downloadCategories/{categoryId}
// So it seems there is a separate collection for download categories.

export const getDownloadEntriesFirestore = async (): Promise<DownloadEntry[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "downloads").withConverter(downloadEntryConverter), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching download entries:", error);
    return [];
  }
};

export const addDownloadEntryFirestore = async (entry: Omit<DownloadEntry, 'id' | 'dateAdded'>): Promise<string | null> => {
  if (!db) return null;
  try {
    const newDocRef = doc(collection(db, "downloads")).withConverter(downloadEntryConverter);
    const entries = await getDownloadEntriesFirestore();
    const order = entries.length;
    
    const newEntry: DownloadEntry = {
      id: newDocRef.id,
      ...entry,
      dateAdded: new Date().toISOString().split('T')[0],
      order
    };
    
    await setDoc(newDocRef, newEntry);
    return newDocRef.id;
  } catch (error) {
    console.error("Error adding download entry:", error);
    return null;
  }
};

export const deleteDownloadEntryFirestore = async (id: string): Promise<boolean> => {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "downloads", id));
    return true;
  } catch (error) {
    console.error("Error deleting download entry:", error);
    return false;
  }
};

export const updateDownloadOrderFirestore = async (id: string, newOrder: number): Promise<boolean> => {
    // Implementation omitted
    return false;
};

export const moveDownloadUpFirestore = async (id: string): Promise<boolean> => {
    return false;
};

export const moveDownloadDownFirestore = async (id: string): Promise<boolean> => {
    return false;
};

// Download Categories
// Assuming they use the same Category interface or similar structure
// The original file had 'getDownloadCategoriesFirestore'

export const getDownloadCategoriesFirestore = async (): Promise<any[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, "downloadCategories"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching download categories:", error);
        return [];
    }
};

export const addDownloadCategoryFirestore = async (name: string): Promise<string | null> => {
    if (!db) return null;
    try {
        const newDocRef = doc(collection(db, "downloadCategories"));
        const categories = await getDownloadCategoriesFirestore();
        const order = categories.length;
        await setDoc(newDocRef, { name, order });
        return newDocRef.id;
    } catch (error) {
        console.error("Error adding download category:", error);
        return null;
    }
};

export const updateDownloadCategoryFirestore = async (id: string, name: string): Promise<boolean> => {
    if (!db) return false;
    try {
        await updateDoc(doc(db, "downloadCategories", id), { name });
        return true;
    } catch (error) {
        console.error("Error updating download category:", error);
        return false;
    }
};

export const deleteDownloadCategoryFirestore = async (id: string): Promise<boolean> => {
    if (!db) return false;
    try {
        await deleteDoc(doc(db, "downloadCategories", id));
        return true;
    } catch (error) {
        console.error("Error deleting download category:", error);
        return false;
    }
};
