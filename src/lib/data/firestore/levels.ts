import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy 
} from "firebase/firestore";
import { Level } from "@/types/database";
import { levelConverter } from "./converters";

export const getLevelsFirestore = async (): Promise<Level[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "levels").withConverter(levelConverter), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching levels:", error);
    return [];
  }
};

export const addLevelFirestore = async (name: string): Promise<string | null> => {
  if (!db) return null;
  try {
    const newDocRef = doc(collection(db, "levels")).withConverter(levelConverter);
    const levels = await getLevelsFirestore();
    const order = levels.length;
    
    const newLevel: Level = {
      id: newDocRef.id,
      name,
      order,
      disabledCategories: {}
    };
    
    await setDoc(newDocRef, newLevel);
    return newDocRef.id;
  } catch (error) {
    console.error("Error adding level:", error);
    return null;
  }
};

export const updateLevelFirestore = async (id: string, name: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, "levels", id).withConverter(levelConverter);
    await updateDoc(docRef, { name });
    return true;
  } catch (error) {
    console.error("Error updating level:", error);
    return false;
  }
};

export const deleteLevelFirestore = async (id: string): Promise<boolean> => {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "levels", id));
    return true;
  } catch (error) {
    console.error("Error deleting level:", error);
    return false;
  }
};

export const updateLevelCategoryDisabledFirestore = async (levelId: string, categoryId: string, disabled: boolean): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, "levels", levelId).withConverter(levelConverter);
    // We need to use dot notation for nested fields update
    await updateDoc(docRef, {
        [`disabledCategories.${categoryId}`]: disabled
    });
    return true;
  } catch (error) {
    console.error("Error updating level category disabled status:", error);
    return false;
  }
};

export const moveLevelUpFirestore = async (_id: string): Promise<boolean> => {
    return false;
};

export const moveLevelDownFirestore = async (_id: string): Promise<boolean> => {
    return false;
};
