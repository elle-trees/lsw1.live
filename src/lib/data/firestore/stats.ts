/**
 * Optimized stats calculation using Firestore aggregation queries where possible
 * Falls back to regular queries if aggregation is not available
 */

import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where,
  getCountFromServer,
  getDocs,
  limit as firestoreLimit
} from "firebase/firestore";
import { leaderboardEntryConverter } from "./converters";
import { parseTimeToSeconds } from "@/lib/utils";

/**
 * Get count of verified runs using Firestore count query (more efficient)
 * Falls back to fetching all runs if count query fails
 */
export const getVerifiedRunsCountFirestore = async (): Promise<number> => {
  if (!db) return 0;
  
  try {
    // Try using count query first (requires Blaze plan)
    const q = query(
      collection(db, "leaderboardEntries"),
      where("verified", "==", true)
    );
    
    try {
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (countError) {
      // Fallback to fetching all runs if count query is not available
      // (e.g., on Spark plan or if count query fails)
      console.warn("Count query not available, falling back to fetching all runs:", countError);
      const snapshot = await getDocs(q.withConverter(leaderboardEntryConverter));
      return snapshot.docs.length;
    }
  } catch (error) {
    console.error("Error getting verified runs count:", error);
    return 0;
  }
};

/**
 * Get total time of all verified runs
 * Note: This still requires fetching runs to sum times, but we can optimize
 * by only fetching the time field if possible
 */
export const getTotalVerifiedRunsTimeFirestore = async (): Promise<number> => {
  if (!db) return 0;
  
  try {
    const q = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("verified", "==", true),
      firestoreLimit(10000) // Limit to prevent excessive reads
    );
    
    const snapshot = await getDocs(q);
    let totalSeconds = 0;
    
    snapshot.docs.forEach(doc => {
      const run = doc.data();
      if (run.time) {
        const seconds = parseTimeToSeconds(run.time);
        if (seconds !== null) {
          totalSeconds += seconds;
        }
      }
    });
    
    return totalSeconds;
  } catch (error) {
    console.error("Error calculating total time:", error);
    return 0;
  }
};

/**
 * Get stats (count and total time) in a single optimized call
 */
export const getVerifiedRunsStatsFirestore = async (): Promise<{
  count: number;
  totalTime: number;
}> => {
  const [count, totalTime] = await Promise.all([
    getVerifiedRunsCountFirestore(),
    getTotalVerifiedRunsTimeFirestore()
  ]);
  
  return { count, totalTime };
};

