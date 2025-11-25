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
import { calculatePoints, parseTimeToSeconds } from "@/lib/utils";
import { getCategoriesFirestore } from "./categories";
import { getPlatformsFirestore } from "./platforms";
import { subscribeToPointsConfigFirestore } from "./points";

/**
 * Calculate the current rank for a run based on the leaderboard
 * This ensures we use the actual current rank, not a stale stored rank
 * @param run - The run to calculate rank for
 * @returns The current rank of the run (undefined if rank cannot be determined)
 */
const calculateCurrentRankForRun = async (run: LeaderboardEntry): Promise<number | undefined> => {
  if (!db) return undefined;
  
  try {
    // Build query to get all verified runs in the same leaderboard group
    const constraints: any[] = [
      where("verified", "==", true),
      where("category", "==", run.category),
      where("platform", "==", run.platform),
      where("runType", "==", run.runType || 'solo'),
    ];
    
    // Add leaderboard type filter
    if (run.leaderboardType) {
      constraints.push(where("leaderboardType", "==", run.leaderboardType));
    }
    
    // Add level filter for IL and Community Golds
    if ((run.leaderboardType === 'individual-level' || run.leaderboardType === 'community-golds') && run.level) {
      constraints.push(where("level", "==", run.level));
    }
    
    // Add subcategory filter for regular leaderboards
    if (run.leaderboardType === 'regular' || !run.leaderboardType) {
      if (run.subcategory) {
        constraints.push(where("subcategory", "==", run.subcategory));
      } else {
        // For runs without subcategory, we need to filter for runs that also don't have subcategory
        // Firestore doesn't support != null queries easily, so we'll fetch all and filter
      }
    }
    
    constraints.push(firestoreLimit(500));
    
    const runsQuery = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      ...constraints
    );
    
    const runsSnapshot = await getDocs(runsQuery);
    let allRuns = runsSnapshot.docs.map(doc => doc.data());
    
    // Filter by subcategory if needed (for regular leaderboards)
    if ((run.leaderboardType === 'regular' || !run.leaderboardType) && !run.subcategory) {
      allRuns = allRuns.filter(r => !r.subcategory);
    }
    
    // Filter out obsolete runs (unless the current run is obsolete)
    if (!run.isObsolete) {
      allRuns = allRuns.filter(r => !r.isObsolete);
    }
    
    // Handle player best runs - only count the best run per player/player pair
    const playerBestRuns = new Map<string, LeaderboardEntry>();
    
    for (const entry of allRuns) {
      const playerId = entry.playerId || entry.playerName || "";
      const player2Id = entry.runType === 'co-op' ? (entry.player2Name || "") : "";
      const groupKey = `${playerId}_${player2Id}_${entry.category}_${entry.platform}_${entry.runType || 'solo'}_${entry.leaderboardType || 'regular'}_${entry.level || ''}`;
      
      const existing = playerBestRuns.get(groupKey);
      if (!existing) {
        playerBestRuns.set(groupKey, entry);
      } else {
        const existingTime = parseTimeToSeconds(existing.time) || Infinity;
        const currentTime = parseTimeToSeconds(entry.time) || Infinity;
        if (currentTime < existingTime) {
          playerBestRuns.set(groupKey, entry);
        }
      }
    }
    
    // Sort by time
    const sortedRuns = Array.from(playerBestRuns.values())
      .map(entry => ({
        entry,
        totalSeconds: parseTimeToSeconds(entry.time) || Infinity
      }))
      .sort((a, b) => a.totalSeconds - b.totalSeconds)
      .map(item => item.entry);
    
    // Find the rank of the current run
    // For the current run, we need to find it in the sorted list
    // We identify it by ID
    const currentRunIndex = sortedRuns.findIndex(r => r.id === run.id);
    
    if (currentRunIndex === -1) {
      // Run not found in leaderboard (might be obsolete or filtered out)
      return undefined;
    }
    
    return currentRunIndex + 1;
  } catch (error) {
    console.error(`Error calculating rank for run ${run.id}:`, error);
    return undefined;
  }
};

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
      
      // Calculate the current rank for this run (not the stored rank which might be stale)
      const currentRank = await calculateCurrentRankForRun(run);
      
      const calculatedPoints = await calculatePoints(
        run.time,
        category?.name || "Unknown",
        platform?.name || "Unknown",
        run.category,
        run.platform,
        currentRank, // Use calculated current rank instead of stored rank
        run.runType as 'solo' | 'co-op' | undefined,
        run.leaderboardType,
        run.isObsolete,
        pointsConfig
      );
      
      totalPoints += calculatedPoints;
      
      // Update the run's points and rank if different
      const needsUpdate = run.points !== calculatedPoints || 
                         (currentRank !== undefined && currentRank !== run.rank);
      
      if (needsUpdate) {
        const runRef = doc(db, "leaderboardEntries", run.id);
        const updateData: any = {};
        if (run.points !== calculatedPoints) {
          updateData.points = calculatedPoints;
        }
        if (currentRank !== undefined && currentRank !== run.rank) {
          updateData.rank = currentRank;
        }
        batch.update(runRef, updateData);
      }
    }
    
    // Update player's total points and totalRuns (only if player exists)
    const playerRef = doc(db, "players", playerId);
    // Check if player document exists
    const playerDocSnap = await getDocs(query(
      collection(db, "players").withConverter(playerConverter),
      where("uid", "==", playerId),
      firestoreLimit(1)
    ));
    
    if (!playerDocSnap.empty) {
      const totalRuns = runs.length;
      batch.update(playerRef, { 
        totalPoints,
        totalRuns
      } as any);
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

/**
 * Get the leaderboard group key for a run
 * This identifies which leaderboard a run belongs to
 * Uses '::' as delimiter to avoid conflicts with IDs that might contain underscores
 */
const getLeaderboardGroupKey = (run: LeaderboardEntry): string => {
  return `${run.category}::${run.platform}::${run.runType || 'solo'}::${run.leaderboardType || 'regular'}::${run.level || '__none__'}::${run.subcategory || '__none__'}`;
};

/**
 * Recalculate and update ranks for all runs in a specific leaderboard group
 * @param groupKey - The leaderboard group key
 * @returns Number of runs updated
 */
const updateRanksForLeaderboardGroup = async (groupKey: string): Promise<number> => {
  if (!db) return 0;
  
  try {
    // Parse the group key to extract filters
    const [category, platform, runType, leaderboardType, level, subcategory] = groupKey.split('::');
    const actualLevel = level === '__none__' ? undefined : level;
    const actualSubcategory = subcategory === '__none__' ? undefined : subcategory;
    
    // Build query to get all verified runs in this leaderboard group
    const constraints: any[] = [
      where("verified", "==", true),
      where("category", "==", category),
      where("platform", "==", platform),
      where("runType", "==", runType),
    ];
    
    if (leaderboardType && leaderboardType !== 'undefined') {
      constraints.push(where("leaderboardType", "==", leaderboardType));
    }
    
    if (actualLevel && (leaderboardType === 'individual-level' || leaderboardType === 'community-golds')) {
      constraints.push(where("level", "==", actualLevel));
    }
    
    if (actualSubcategory && (leaderboardType === 'regular' || !leaderboardType || leaderboardType === 'undefined')) {
      constraints.push(where("subcategory", "==", actualSubcategory));
    }
    
    constraints.push(firestoreLimit(500));
    
    const runsQuery = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      ...constraints
    );
    
    const runsSnapshot = await getDocs(runsQuery);
    let allRuns = runsSnapshot.docs.map(doc => doc.data());
    
    // Filter by subcategory if needed (for regular leaderboards without subcategory)
    if ((!leaderboardType || leaderboardType === 'regular' || leaderboardType === 'undefined') && !actualSubcategory) {
      allRuns = allRuns.filter(r => !r.subcategory);
    }
    
    // Separate obsolete and non-obsolete runs
    const nonObsoleteRuns = allRuns.filter(r => !r.isObsolete);
    const obsoleteRuns = allRuns.filter(r => r.isObsolete);
    
    // Handle player best runs - only count the best run per player/player pair
    const playerBestRuns = new Map<string, LeaderboardEntry>();
    
    for (const entry of nonObsoleteRuns) {
      const playerId = entry.playerId || entry.playerName || "";
      const player2Id = entry.runType === 'co-op' ? (entry.player2Name || "") : "";
      const playerGroupKey = `${playerId}_${player2Id}_${entry.category}_${entry.platform}_${entry.runType || 'solo'}_${entry.leaderboardType || 'regular'}_${entry.level || ''}`;
      
      const existing = playerBestRuns.get(playerGroupKey);
      if (!existing) {
        playerBestRuns.set(playerGroupKey, entry);
      } else {
        const existingTime = parseTimeToSeconds(existing.time) || Infinity;
        const currentTime = parseTimeToSeconds(entry.time) || Infinity;
        if (currentTime < existingTime) {
          playerBestRuns.set(playerGroupKey, entry);
        }
      }
    }
    
    // Sort by time
    const sortedNonObsolete = Array.from(playerBestRuns.values())
      .map(entry => ({
        entry,
        totalSeconds: parseTimeToSeconds(entry.time) || Infinity
      }))
      .sort((a, b) => a.totalSeconds - b.totalSeconds)
      .map(item => item.entry);
    
    const sortedObsolete = obsoleteRuns
      .map(entry => ({
        entry,
        totalSeconds: parseTimeToSeconds(entry.time) || Infinity
      }))
      .sort((a, b) => a.totalSeconds - b.totalSeconds)
      .map(item => item.entry);
    
    // Calculate ranks
    const rankMap = new Map<string, number>();
    sortedNonObsolete.forEach((entry, index) => {
      rankMap.set(entry.id, index + 1);
    });
    sortedObsolete.forEach((entry, index) => {
      rankMap.set(entry.id, sortedNonObsolete.length + index + 1);
    });
    
    // Update ranks in batch
    const batch = writeBatch(db);
    let updatesCount = 0;
    
    for (const run of allRuns) {
      const newRank = rankMap.get(run.id);
      if (newRank !== undefined && newRank !== run.rank) {
        const runRef = doc(db, "leaderboardEntries", run.id);
        batch.update(runRef, { rank: newRank });
        updatesCount++;
      }
    }
    
    if (updatesCount > 0) {
      await batch.commit();
    }
    
    return updatesCount;
  } catch (error) {
    console.error(`Error updating ranks for leaderboard group ${groupKey}:`, error);
    return 0;
  }
};

/**
 * Real-time rank update service
 * Listens for changes to verified runs and automatically updates ranks
 */
class RankUpdateService {
  private runsUnsubscribe: Unsubscribe | null = null;
  private isListening = false;
  private rankUpdateDebounceTimer: NodeJS.Timeout | null = null;
  private pendingGroupUpdates = new Set<string>();
  private readonly RANK_UPDATE_DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before processing
  
  /**
   * Start listening for leaderboard entry changes
   */
  start(): void {
    if (this.isListening || !db) return;
    
    this.isListening = true;
    
    try {
      // Listen to all verified runs (no limit - we only process changes, not all data)
      const runsQuery = query(
        collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
        where("verified", "==", true)
      );
      
      this.runsUnsubscribe = onSnapshot(
        runsQuery,
        (snapshot: QuerySnapshot<LeaderboardEntry>) => {
          // Process all changes (added, modified, removed)
          const changes = snapshot.docChanges();
          
          if (changes.length === 0) return;
          
          // Collect affected leaderboard groups
          for (const change of changes) {
            const run = change.doc.data();
            const groupKey = getLeaderboardGroupKey(run);
            this.pendingGroupUpdates.add(groupKey);
          }
          
          // Debounce rank updates to batch process multiple changes
          if (this.rankUpdateDebounceTimer) {
            clearTimeout(this.rankUpdateDebounceTimer);
          }
          
          this.rankUpdateDebounceTimer = setTimeout(() => {
            this.processPendingRankUpdates();
          }, this.RANK_UPDATE_DEBOUNCE_MS);
        },
        (error) => {
          console.error("Error in rank update listener:", error);
        }
      );
    } catch (error) {
      console.error("Error setting up rank update listener:", error);
      this.isListening = false;
    }
  }
  
  /**
   * Process pending rank updates for all affected leaderboard groups
   */
  private async processPendingRankUpdates(): Promise<void> {
    if (this.pendingGroupUpdates.size === 0) return;
    
    const groupsToUpdate = Array.from(this.pendingGroupUpdates);
    this.pendingGroupUpdates.clear();
    
    console.log(`Updating ranks for ${groupsToUpdate.length} leaderboard group(s)...`);
    
    // Process groups in parallel (but limit concurrency to avoid overwhelming Firestore)
    const BATCH_SIZE = 5;
    for (let i = 0; i < groupsToUpdate.length; i += BATCH_SIZE) {
      const batch = groupsToUpdate.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (groupKey) => {
          try {
            const updated = await updateRanksForLeaderboardGroup(groupKey);
            if (updated > 0) {
              console.log(`Updated ranks for ${updated} runs in group ${groupKey}`);
            }
          } catch (error) {
            console.error(`Error updating ranks for group ${groupKey}:`, error);
          }
        })
      );
    }
    
    console.log("Rank updates completed");
  }
  
  /**
   * Stop listening for changes
   */
  stop(): void {
    if (this.rankUpdateDebounceTimer) {
      clearTimeout(this.rankUpdateDebounceTimer);
      this.rankUpdateDebounceTimer = null;
    }
    
    if (this.runsUnsubscribe) {
      this.runsUnsubscribe();
      this.runsUnsubscribe = null;
    }
    
    this.isListening = false;
    this.pendingGroupUpdates.clear();
  }
  
  /**
   * Check if the service is currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }
  
  /**
   * Manually trigger rank updates for a specific leaderboard group
   */
  async updateRanksForGroup(groupKey: string): Promise<number> {
    return await updateRanksForLeaderboardGroup(groupKey);
  }
}

// Singleton instance
let rankUpdateService: RankUpdateService | null = null;

/**
 * Get the rank update service instance
 */
export const getRankUpdateService = (): RankUpdateService => {
  if (!rankUpdateService) {
    rankUpdateService = new RankUpdateService();
  }
  return rankUpdateService;
};

/**
 * Start the real-time rank update service
 */
export const startRankUpdateService = (): void => {
  const service = getRankUpdateService();
  service.start();
};

/**
 * Stop the real-time rank update service
 */
export const stopRankUpdateService = (): void => {
  if (rankUpdateService) {
    rankUpdateService.stop();
  }
};

