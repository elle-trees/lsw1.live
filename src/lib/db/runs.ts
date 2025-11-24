// Runs and Leaderboard operations
import {
  addLeaderboardEntryFirestore,
  updateLeaderboardEntryFirestore,
  deleteLeaderboardEntryFirestore,
  getRecentRunsFirestore,
  getPlayerRunsFirestore,
  getPlayerPendingRunsFirestore,
  getUnverifiedLeaderboardEntriesFirestore,
  updateRunVerificationStatusFirestore,
  updateRunObsoleteStatusFirestore,
  deleteAllLeaderboardEntriesFirestore,
  subscribeToRecentRunsFirestore,
  subscribeToUnverifiedRunsFirestore,
  subscribeToLeaderboardEntryFirestore,
  subscribeToPlayerRunsFirestore,
  subscribeToPlayerPendingRunsFirestore
} from "../data/firestore/runs";

import {
  getLeaderboardEntriesFirestore,
  getLeaderboardEntryByIdFirestore,
  subscribeToLeaderboardEntriesFirestore
} from "../data/firestore/leaderboards";

import { LeaderboardEntry } from "@/types/database";
import type { Unsubscribe } from "firebase/firestore";

export const getLeaderboardEntries = async (
  categoryId?: string,
  platformId?: string,
  runType?: 'solo' | 'co-op',
  includeObsolete?: boolean,
  leaderboardType?: 'regular' | 'individual-level' | 'community-golds',
  levelId?: string,
  subcategoryId?: string
): Promise<LeaderboardEntry[]> => {
  return getLeaderboardEntriesFirestore(categoryId, platformId, runType, includeObsolete, leaderboardType, levelId, subcategoryId);
};

export const getLeaderboardEntryById = getLeaderboardEntryByIdFirestore;
export const addLeaderboardEntry = addLeaderboardEntryFirestore;
export const getRecentRuns = getRecentRunsFirestore;
export const getPlayerRuns = getPlayerRunsFirestore;
export const getPlayerPendingRuns = getPlayerPendingRunsFirestore;
export const getUnverifiedLeaderboardEntries = getUnverifiedLeaderboardEntriesFirestore;

export const updateLeaderboardEntry = async (runId: string, data: Partial<LeaderboardEntry>): Promise<boolean> => {
  try {
    return await updateLeaderboardEntryFirestore(runId, data);
  } catch (error: any) {
    // Re-throw with more context
    throw new Error(error.message || error.code || "Failed to update run");
  }
};

export const updateRunVerificationStatus = updateRunVerificationStatusFirestore;
export const deleteLeaderboardEntry = deleteLeaderboardEntryFirestore;
export const deleteAllLeaderboardEntries = deleteAllLeaderboardEntriesFirestore;
export const updateRunObsoleteStatus = updateRunObsoleteStatusFirestore;

export const runTypes = [
  { id: "solo", name: "Solo" },
  { id: "co-op", name: "Co-op" },
];

// Real-time subscriptions
export const subscribeToRecentRuns = (
  callback: (runs: LeaderboardEntry[]) => void,
  limitCount: number = 20
): Unsubscribe | null => {
  return subscribeToRecentRunsFirestore(callback, limitCount);
};

export const subscribeToUnverifiedRuns = (
  callback: (runs: LeaderboardEntry[]) => void
): Unsubscribe | null => {
  return subscribeToUnverifiedRunsFirestore(callback);
};

export const subscribeToLeaderboardEntry = (
  runId: string,
  callback: (run: LeaderboardEntry | null) => void
): Unsubscribe | null => {
  return subscribeToLeaderboardEntryFirestore(runId, callback);
};

export const subscribeToLeaderboardEntries = (
  callback: (entries: LeaderboardEntry[]) => void,
  categoryId?: string,
  platformId?: string,
  runType?: 'solo' | 'co-op',
  includeObsolete?: boolean,
  leaderboardType?: 'regular' | 'individual-level' | 'community-golds',
  levelId?: string,
  subcategoryId?: string
): Unsubscribe | null => {
  return subscribeToLeaderboardEntriesFirestore(callback, categoryId, platformId, runType, includeObsolete, leaderboardType, levelId, subcategoryId);
};

export const subscribeToPlayerRuns = (
  playerId: string,
  callback: (runs: LeaderboardEntry[]) => void
): Unsubscribe | null => {
  return subscribeToPlayerRunsFirestore(playerId, callback);
};

export const subscribeToPlayerPendingRuns = (
  playerId: string,
  callback: (runs: LeaderboardEntry[]) => void
): Unsubscribe | null => {
  return subscribeToPlayerPendingRunsFirestore(playerId, callback);
};

