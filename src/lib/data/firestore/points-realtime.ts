import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  limit as firestoreLimit,
  DocumentChange
} from "firebase/firestore";
import { LeaderboardEntry, Player, PointsConfig } from "@/types/database";
import { leaderboardEntryConverter, playerConverter } from "./converters";
import { calculatePoints } from "@/lib/utils";
import { getCategoriesFirestore } from "./categories";
import { getPlatformsFirestore } from "./platforms";
import { subscribeToPointsConfigFirestore } from "./points";

/**
 * Recalculate points for a single player based on all their verified runs
 * @param playerId - The player UID
 * @param pointsConfig - Current points configuration
 * @returns The new total points for the player
 */
export const recalculatePlayerPointsFirestore = async (
  playerId: string,
  pointsConfig: PointsConfig
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
    const runs = runsSnapshot.docs.map(doc => doc.data());
    
    // Get categories and platforms for calculation
    const [categories, platforms] = await Promise.all([
      getCategoriesFirestore(),
      getPlatformsFirestore()
    ]);
    
    // Calculate total points
    let totalPoints = 0;
    const batch = writeBatch(db);
    
    for (const run of runs) {
      const category = categories.find(c => c.id === run.category);
      const platform = platforms.find(p => p.id === run.platform);
      
      const calculatedPoints = await calculatePoints(
        run.time,
        category?.name || "Unknown",
        platform?.name || "Unknown",
        run.category,
        run.platform,
        run.rank,
        run.runType as 'solo' | 'co-op' | undefined,
        run.leaderboardType,
        run.isObsolete,
        pointsConfig
      );
      
      totalPoints += calculatedPoints;
      
      // Update the run's points if different
      if (run.points !== calculatedPoints) {
        const runRef = doc(db, "leaderboardEntries", run.id);
        batch.update(runRef, { points: calculatedPoints });
      }
    }
    
    // Update player's total points (only if player exists and has runs)
    if (runs.length > 0) {
      const playerRef = doc(db, "players", playerId);
      // Check if player document exists
      const playerDocSnap = await getDocs(query(
        collection(db, "players").withConverter(playerConverter),
        where("uid", "==", playerId),
        firestoreLimit(1)
      ));
      
      if (!playerDocSnap.empty) {
        batch.update(playerRef, { totalPoints } as any);
      }
    }
    
    // Commit all updates
    await batch.commit();
    
    return totalPoints;
  } catch (error) {
    console.error(`Error recalculating points for player ${playerId}:`, error);
    return 0;
  }
};

/**
 * Recalculate points for all players
 * This is a heavy operation and should be used sparingly (e.g., when points config changes)
 * @param pointsConfig - Current points configuration
 * @param onProgress - Optional callback for progress updates
 * @returns Summary of the recalculation
 */
export const recalculateAllPlayerPointsFirestore = async (
  pointsConfig: PointsConfig,
  onProgress?: (processed: number, total: number) => void
): Promise<{ playersUpdated: number; runsUpdated: number; errors: string[] }> => {
  if (!db) {
    return { playersUpdated: 0, runsUpdated: 0, errors: ["Database not initialized"] };
  }
  
  const errors: string[] = [];
  let playersUpdated = 0;
  let runsUpdated = 0;
  
  try {
    // Get all players with points (they're the ones who need recalculation)
    const playersQuery = query(
      collection(db, "players").withConverter(playerConverter),
      where("totalPoints", ">", 0)
    );
    
    const playersSnapshot = await getDocs(playersQuery);
    const players = playersSnapshot.docs.map(doc => doc.data());
    
    const totalPlayers = players.length;
    let processed = 0;
    
    // Process players in batches to avoid overwhelming Firestore
    const BATCH_SIZE = 10;
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (player) => {
          try {
            const newTotal = await recalculatePlayerPointsFirestore(player.uid, pointsConfig);
            if (newTotal > 0 || player.totalPoints > 0) {
              playersUpdated++;
            }
            processed++;
            if (onProgress) {
              onProgress(processed, totalPlayers);
            }
          } catch (error: any) {
            errors.push(`Error recalculating points for player ${player.uid}: ${error.message}`);
            processed++;
            if (onProgress) {
              onProgress(processed, totalPlayers);
            }
          }
        })
      );
    }
    
    // Count total verified runs (all of which were recalculated)
    const allRunsQuery = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("verified", "==", true)
    );
    const allRunsSnapshot = await getDocs(allRunsQuery);
    runsUpdated = allRunsSnapshot.docs.length;
    
  } catch (error: any) {
    errors.push(`Fatal error in recalculation: ${error.message}`);
  }
  
  return { playersUpdated, runsUpdated, errors };
};

/**
 * Real-time points recalculation service
 * Listens for points config changes and automatically recalculates all player points
 */
class PointsRecalculationService {
  private configUnsubscribe: Unsubscribe | null = null;
  private isRecalculating = false;
  private recalculationCallbacks: Set<(isRecalculating: boolean) => void> = new Set();
  private previousConfig: PointsConfig | null = null;
  private isInitialLoad = true;
  
  /**
   * Start listening for points config changes
   */
  start(): void {
    if (this.configUnsubscribe) {
      return; // Already started
    }
    
    this.configUnsubscribe = subscribeToPointsConfigFirestore(async (config) => {
      if (!config) return;
      
      // Skip recalculation on initial load
      if (this.isInitialLoad) {
        this.previousConfig = config;
        this.isInitialLoad = false;
        return;
      }
      
      // Only recalculate if config actually changed
      if (this.hasConfigChanged(this.previousConfig, config)) {
        this.previousConfig = config;
        
        // Only recalculate if we're not already recalculating
        if (!this.isRecalculating) {
          this.isRecalculating = true;
          this.notifyCallbacks(true);
          
          try {
            console.log("Points config changed, recalculating all player points...");
            await recalculateAllPlayerPointsFirestore(config, (processed, total) => {
              console.log(`Recalculating points: ${processed}/${total} players processed`);
            });
            
            console.log("Points recalculation completed");
          } catch (error) {
            console.error("Error during automatic points recalculation:", error);
          } finally {
            this.isRecalculating = false;
            this.notifyCallbacks(false);
          }
        }
      } else {
        // Config didn't change, just update the reference
        this.previousConfig = config;
      }
    });
  }
  
  /**
   * Check if the points config has actually changed
   */
  private hasConfigChanged(oldConfig: PointsConfig | null, newConfig: PointsConfig): boolean {
    if (!oldConfig) return true;
    
    return (
      oldConfig.basePoints !== newConfig.basePoints ||
      oldConfig.rank1Bonus !== newConfig.rank1Bonus ||
      oldConfig.rank2Bonus !== newConfig.rank2Bonus ||
      oldConfig.rank3Bonus !== newConfig.rank3Bonus ||
      oldConfig.coOpMultiplier !== newConfig.coOpMultiplier ||
      oldConfig.ilMultiplier !== newConfig.ilMultiplier ||
      oldConfig.communityGoldsMultiplier !== newConfig.communityGoldsMultiplier ||
      oldConfig.obsoleteMultiplier !== newConfig.obsoleteMultiplier ||
      oldConfig.applyRankBonusesToIL !== newConfig.applyRankBonusesToIL ||
      oldConfig.applyRankBonusesToCommunityGolds !== newConfig.applyRankBonusesToCommunityGolds
    );
  }
  
  /**
   * Stop listening for points config changes
   */
  stop(): void {
    if (this.configUnsubscribe) {
      this.configUnsubscribe();
      this.configUnsubscribe = null;
    }
  }
  
  /**
   * Subscribe to recalculation status updates
   */
  onRecalculationStatus(callback: (isRecalculating: boolean) => void): () => void {
    this.recalculationCallbacks.add(callback);
    return () => {
      this.recalculationCallbacks.delete(callback);
    };
  }
  
  /**
   * Notify all callbacks of recalculation status
   */
  private notifyCallbacks(isRecalculating: boolean): void {
    this.recalculationCallbacks.forEach(callback => {
      try {
        callback(isRecalculating);
      } catch (error) {
        console.error("Error in recalculation status callback:", error);
      }
    });
  }
  
  /**
   * Manually trigger recalculation
   */
  async triggerRecalculation(pointsConfig: PointsConfig): Promise<void> {
    if (this.isRecalculating) {
      console.warn("Recalculation already in progress");
      return;
    }
    
    this.isRecalculating = true;
    this.notifyCallbacks(true);
    
    try {
      await recalculateAllPlayerPointsFirestore(pointsConfig, (processed, total) => {
        console.log(`Manual recalculation: ${processed}/${total} players processed`);
      });
    } finally {
      this.isRecalculating = false;
      this.notifyCallbacks(false);
    }
  }
  
  /**
   * Check if recalculation is in progress
   */
  getIsRecalculating(): boolean {
    return this.isRecalculating;
  }
}

// Singleton instance
let pointsRecalculationService: PointsRecalculationService | null = null;

/**
 * Get the points recalculation service instance
 */
export const getPointsRecalculationService = (): PointsRecalculationService => {
  if (!pointsRecalculationService) {
    pointsRecalculationService = new PointsRecalculationService();
  }
  return pointsRecalculationService;
};

/**
 * Start the real-time points recalculation service
 */
export const startPointsRecalculationService = (): void => {
  const service = getPointsRecalculationService();
  service.start();
};

/**
 * Stop the real-time points recalculation service
 */
export const stopPointsRecalculationService = (): void => {
  if (pointsRecalculationService) {
    pointsRecalculationService.stop();
  }
};

