import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy, 
  where
} from "firebase/firestore";
import { Category } from "@/types/database";
import { categoryConverter } from "./converters";

export const getCategoriesFirestore = async (leaderboardType?: 'regular' | 'individual-level' | 'community-golds'): Promise<Category[]> => {
  if (!db) return [];
  try {
    // Fetch all categories first, then filter in-memory
    // This handles categories without leaderboardType field (legacy categories)
    const q = query(collection(db, "categories").withConverter(categoryConverter), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    const allCategories = snapshot.docs.map(doc => doc.data());
    
    // If no leaderboardType filter specified, return all categories
    if (!leaderboardType) {
      return allCategories;
    }
    
    // Filter by leaderboardType
    // For 'regular', include categories without leaderboardType field (backward compatibility)
    return allCategories.filter(cat => {
      if (leaderboardType === 'regular') {
        return !cat.leaderboardType || cat.leaderboardType === 'regular';
      }
      return cat.leaderboardType === leaderboardType;
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const addCategoryFirestore = async (
  name: string, 
  leaderboardType: 'regular' | 'individual-level' | 'community-golds' = 'regular',
  srcCategoryId?: string
): Promise<string | null> => {
  if (!db) return null;
  try {
    const newDocRef = doc(collection(db, "categories")).withConverter(categoryConverter);
    const categories = await getCategoriesFirestore(leaderboardType);
    const order = categories.length;
    
    const newCategory: Category = {
      id: newDocRef.id,
      name,
      order,
      leaderboardType,
      srcCategoryId
    };
    
    await setDoc(newDocRef, newCategory);
    return newDocRef.id;
  } catch (error) {
    console.error("Error adding category:", error);
    return null;
  }
};

export const updateCategoryFirestore = async (
    id: string, 
    name: string, 
    subcategories?: Array<{ id: string; name: string; order?: number; srcVariableId?: string; srcValueId?: string }>,
    srcCategoryId?: string | null,
    srcSubcategoryVariableName?: string | null
): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, "categories", id).withConverter(categoryConverter);
    const updateData: Partial<Category> = { name };
    
    if (subcategories !== undefined) updateData.subcategories = subcategories;
    if (srcCategoryId !== undefined) updateData.srcCategoryId = srcCategoryId;
    if (srcSubcategoryVariableName !== undefined) updateData.srcSubcategoryVariableName = srcSubcategoryVariableName;
    
    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating category:", error);
    return false;
  }
};

export const deleteCategoryFirestore = async (id: string): Promise<boolean> => {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "categories", id));
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    return false;
  }
};

export const moveCategoryUpFirestore = async (id: string): Promise<boolean> => {
    // Implementation omitted for brevity, but would involve swapping orders
    return false; 
};

export const moveCategoryDownFirestore = async (id: string): Promise<boolean> => {
    return false;
};
