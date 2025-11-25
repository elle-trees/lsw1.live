import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  limit as firestoreLimit,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot
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

export const backfillPointsForAllRunsFirestore = async (): Promise<{ runsUpdated: number; playersUpdated: number; errors: string[] }> => {
    try {
        // Get current points config
        const config = await getPointsConfigFirestore();
        if (!config) {
            return { runsUpdated: 0, playersUpdated: 0, errors: ["Points configuration not found"] };
        }
        
        // Use the recalculation service
        const { recalculateAllPlayerPointsFirestore } = await import("./points-realtime");
        const result = await recalculateAllPlayerPointsFirestore(config);
        
        return {
            runsUpdated: result.runsUpdated,
            playersUpdated: result.playersUpdated,
            errors: result.errors
        };
    } catch (error: any) {
        console.error("Error in backfill points:", error);
        return {
            runsUpdated: 0,
            playersUpdated: 0,
            errors: [error.message || "Unknown error during backfill"]
        };
    }
};

export const wipeLeaderboardsFirestore = async (): Promise<boolean> => {
    // Stub implementation - dangerous operation disabled by default
    // TODO: Implement if needed with proper safeguards
    return false;
};

/**
 * Subscribe to real-time updates for points configuration
 * @param callback - Callback function that receives the points config or null if not found
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToPointsConfigFirestore = (
  callback: (config: PointsConfig | null) => void
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, "pointsConfig").withConverter(pointsConfigConverter),
      firestoreLimit(1)
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot<PointsConfig>) => {
      if (!snapshot.empty) {
        callback(snapshot.docs[0].data());
      } else {
        // Return default config if none exists
        callback({
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
        });
      }
    }, (error) => {
      console.error("Error in points config subscription:", error);
      callback(null);
    });
  } catch (error) {
    console.error("Error setting up points config subscription:", error);
    return null;
  }
};
