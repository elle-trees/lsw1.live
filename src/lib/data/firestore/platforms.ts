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
import { Platform } from "@/types/database";
import { platformConverter } from "./converters";

export const getPlatformsFirestore = async (): Promise<Platform[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "platforms").withConverter(platformConverter), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching platforms:", error);
    return [];
  }
};

export const addPlatformFirestore = async (name: string): Promise<string | null> => {
  if (!db) return null;
  try {
    const newDocRef = doc(collection(db, "platforms")).withConverter(platformConverter);
    const platforms = await getPlatformsFirestore();
    const order = platforms.length;
    
    const newPlatform: Platform = {
      id: newDocRef.id,
      name,
      order
    };
    
    await setDoc(newDocRef, newPlatform);
    return newDocRef.id;
  } catch (error) {
    console.error("Error adding platform:", error);
    return null;
  }
};

export const updatePlatformFirestore = async (id: string, name: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, "platforms", id).withConverter(platformConverter);
    await updateDoc(docRef, { name });
    return true;
  } catch (error) {
    console.error("Error updating platform:", error);
    return false;
  }
};

export const deletePlatformFirestore = async (id: string): Promise<boolean> => {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "platforms", id));
    return true;
  } catch (error) {
    console.error("Error deleting platform:", error);
    return false;
  }
};

export const movePlatformUpFirestore = async (id: string): Promise<boolean> => {
    return false;
};

export const movePlatformDownFirestore = async (id: string): Promise<boolean> => {
    return false;
};
