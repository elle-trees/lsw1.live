import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  updateDoc,
  limit as firestoreLimit,
} from "firebase/firestore";
import { Player, LeaderboardEntry } from "@/types/database";
import { playerConverter, leaderboardEntryConverter } from "./converters";

/**
 * Recalculate totalRuns for a single player based on their verified runs
 * @param playerId - The player UID
 * @returns The new totalRuns count for the player
 */
export const recalculatePlayerTotalRunsFirestore = async (
  playerId: string
): Promise<number> => {
  if (!db) return 0;
  
  try {
    // Get all verified runs for this player
    const runsQuery = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("playerId", "==", playerId),
      where("verified", "==", true)
    );
    
    const runsSnapshot = await getDocs(runsQuery);
    const totalRuns = runsSnapshot.docs.length;
    
    // Update player's totalRuns
    const playerRef = doc(db, "players", playerId).withConverter(playerConverter);
    const playerDocSnap = await getDocs(query(
      collection(db, "players").withConverter(playerConverter),
      where("uid", "==", playerId),
      firestoreLimit(1)
    ));
    
    if (!playerDocSnap.empty) {
      await updateDoc(playerRef, { totalRuns } as any);
    }
    
    return totalRuns;
  } catch (error) {
    console.error(`Error recalculating totalRuns for player ${playerId}:`, error);
    return 0;
  }
};

/**
 * Recalculate totalRuns for all players
 * This fixes players who have incorrect totalRuns counts
 * @param onProgress - Optional callback for progress updates
 * @returns Summary of the recalculation
 */
export const recalculateAllPlayerTotalRunsFirestore = async (
  onProgress?: (processed: number, total: number) => void
): Promise<{ playersUpdated: number; errors: string[] }> => {
  if (!db) {
    return { playersUpdated: 0, errors: ["Database not initialized"] };
  }
  
  const errors: string[] = [];
  let playersUpdated = 0;
  
  try {
    // Get all players (we need to check all players, not just those with runs)
    const playersQuery = query(
      collection(db, "players").withConverter(playerConverter)
    );
    
    const playersSnapshot = await getDocs(playersQuery);
    const players = playersSnapshot.docs.map(doc => doc.data());
    
    const totalPlayers = players.length;
    let processed = 0;
    
    // Process players in batches to avoid overwhelming Firestore
    const BATCH_SIZE = 20;
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (player) => {
          try {
            const newTotalRuns = await recalculatePlayerTotalRunsFirestore(player.uid);
            const oldTotalRuns = player.totalRuns || 0;
            
            // Only count as updated if the value changed
            if (newTotalRuns !== oldTotalRuns) {
              playersUpdated++;
            }
            
            processed++;
            if (onProgress) {
              onProgress(processed, totalPlayers);
            }
          } catch (error: any) {
            errors.push(`Error recalculating totalRuns for player ${player.uid}: ${error.message}`);
            processed++;
            if (onProgress) {
              onProgress(processed, totalPlayers);
            }
          }
        })
      );
    }
    
  } catch (error: any) {
    errors.push(`Fatal error in totalRuns recalculation: ${error.message}`);
  }
  
  return { playersUpdated, errors };
};

