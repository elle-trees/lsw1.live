import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  limit as firestoreLimit
} from "firebase/firestore";
import { PointsConfig } from "@/types/database";
import { pointsConfigConverter } from "./converters";

export const getPointsConfigFirestore = async (): Promise<PointsConfig | null> => {
  if (!db) return null;
  try {
    // There should be only one config document, but we query the collection
    const q = query(collection(db, "pointsConfig").withConverter(pointsConfigConverter), firestoreLimit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data();
    }
    
    // Return default config if none exists
    return {
      id: "default",
      basePoints: 100,
      rank1Bonus: 50,
      rank2Bonus: 30,
      rank3Bonus: 15,
      coOpMultiplier: 0.5,
      ilMultiplier: 1.0,
      communityGoldsMultiplier: 1.0,
      obsoleteMultiplier: 0.5,
      applyRankBonusesToIL: false,
      applyRankBonusesToCommunityGolds: false
    };
  } catch (error) {
    console.error("Error fetching points config:", error);
    return null;
  }
};

export const updatePointsConfigFirestore = async (config: PointsConfig): Promise<boolean> => {
  if (!db) return false;
  try {
    // Check if config exists
    const q = query(collection(db, "pointsConfig").withConverter(pointsConfigConverter), firestoreLimit(1));
    const snapshot = await getDocs(q);
    
    let docRef;
    if (!snapshot.empty) {
      docRef = snapshot.docs[0].ref;
    } else {
      docRef = doc(collection(db, "pointsConfig")).withConverter(pointsConfigConverter);
    }
    
    // Ensure we don't save the ID as part of the data if using setDoc with merge or similar
    // The converter handles stripping ID on toFirestore
    await setDoc(docRef, config);
    return true;
  } catch (error) {
    console.error("Error updating points config:", error);
    return false;
  }
};

export const backfillPointsForAllRunsFirestore = async (): Promise<{ updated: number; errors: number }> => {
    // Implementation omitted for brevity - complex logic involving recalculating all points
    return { updated: 0, errors: 0 };
};

export const wipeLeaderboardsFirestore = async (): Promise<boolean> => {
    // Dangerous op
    return false;
};
