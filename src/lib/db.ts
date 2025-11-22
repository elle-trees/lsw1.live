import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";


// I need to be careful. I might have missed some functions.
// Let's check where I put each function.

// players.ts:
// getPlayerByUidFirestore, getPlayerByDisplayNameFirestore, createPlayerFirestore, updatePlayerProfileFirestore,
// isDisplayNameAvailableFirestore, getPlayersWithTwitchUsernamesFirestore, getPlayersWithSRCUsernamesFirestore,
// getAllPlayersFirestore, updatePlayerFirestore, deletePlayerFirestore, getPlayersByPointsFirestore

// runs.ts:
// addLeaderboardEntryFirestore, updateLeaderboardEntryFirestore, deleteLeaderboardEntryFirestore,
// getRecentRunsFirestore, getPlayerRunsFirestore, getPlayerPendingRunsFirestore, getUnverifiedLeaderboardEntriesFirestore,
// updateRunVerificationStatusFirestore, updateRunObsoleteStatusFirestore, deleteAllLeaderboardEntriesFirestore

// leaderboards.ts:
// getLeaderboardEntriesFirestore

// categories.ts:
// getCategoriesFirestore, addCategoryFirestore, updateCategoryFirestore, deleteCategoryFirestore,
// moveCategoryUpFirestore, moveCategoryDownFirestore

// platforms.ts:
// getPlatformsFirestore, addPlatformFirestore, updatePlatformFirestore, deletePlatformFirestore,
// movePlatformUpFirestore, movePlatformDownFirestore

// levels.ts:
// getLevelsFirestore, addLevelFirestore, updateLevelFirestore, deleteLevelFirestore,
// moveLevelUpFirestore, moveLevelDownFirestore, updateLevelCategoryDisabledFirestore

// downloads.ts:
// getDownloadEntriesFirestore, addDownloadEntryFirestore, deleteDownloadEntryFirestore,
// updateDownloadOrderFirestore, moveDownloadUpFirestore, moveDownloadDownFirestore,
// getDownloadCategoriesFirestore, addDownloadCategoryFirestore, updateDownloadCategoryFirestore, deleteDownloadCategoryFirestore

// points.ts:
// getPointsConfigFirestore, updatePointsConfigFirestore, backfillPointsForAllRunsFirestore, wipeLeaderboardsFirestore

// src-imports.ts:
// checkSRCRunExistsFirestore, getImportedSRCRunsFirestore, getAllRunsForDuplicateCheckFirestore,
// deleteAllImportedSRCRunsFirestore, wipeAllImportedSRCRunsFirestore, getVerifiedRunsWithInvalidDataFirestore,
// getIlRunsToFixFirestore, getExistingSRCRunIdsFirestore, getUnclaimedImportedRunsFirestore,
// deleteAllUnclaimedImportedRunsFirestore, findDuplicateRunsFirestore, removeDuplicateRunsFirestore,
// autoClaimRunsBySRCUsernameFirestore, runAutoclaimingForAllUsersFirestore, tryAutoAssignRunFirestore,
// getUnclaimedRunsBySRCUsernameFirestore, getUnassignedRunsFirestore, claimRunFirestore, getAllVerifiedRunsFirestore

// MISSING:
// getLeaderboardEntryByIdFirestore - I missed this one! It was in the original firestore.ts.
// I need to add it to runs.ts or leaderboards.ts.

import {
  getPlayerByUidFirestore,
  getPlayerByDisplayNameFirestore,
  createPlayerFirestore,
  updatePlayerProfileFirestore,
  isDisplayNameAvailableFirestore,
  getPlayersWithTwitchUsernamesFirestore,
  getPlayersWithSRCUsernamesFirestore,
  getAllPlayersFirestore,
  updatePlayerFirestore,
  deletePlayerFirestore,
  getPlayersByPointsFirestore
} from "./data/firestore/players";

import {
  createNotificationFirestore,
  getUserNotificationsFirestore,
  getUnreadUserNotificationsFirestore,
  markNotificationAsReadFirestore,
  markAllNotificationsAsReadFirestore,
  deleteNotificationFirestore
} from "./data/firestore/notifications";

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
  deleteAllLeaderboardEntriesFirestore
} from "./data/firestore/runs";

import {
  getLeaderboardEntriesFirestore
} from "./data/firestore/leaderboards";

import {
  getCategoriesFirestore,
  addCategoryFirestore,
  updateCategoryFirestore,
  deleteCategoryFirestore,
  moveCategoryUpFirestore,
  moveCategoryDownFirestore
} from "./data/firestore/categories";

import {
  getPlatformsFirestore,
  addPlatformFirestore,
  updatePlatformFirestore,
  deletePlatformFirestore,
  movePlatformUpFirestore,
  movePlatformDownFirestore
} from "./data/firestore/platforms";

import {
  getLevelsFirestore,
  addLevelFirestore,
  updateLevelFirestore,
  deleteLevelFirestore,
  moveLevelUpFirestore,
  moveLevelDownFirestore,
  updateLevelCategoryDisabledFirestore
} from "./data/firestore/levels";

import {
  getDownloadEntriesFirestore,
  addDownloadEntryFirestore,
  deleteDownloadEntryFirestore,
  updateDownloadOrderFirestore,
  moveDownloadUpFirestore,
  moveDownloadDownFirestore,
  getDownloadCategoriesFirestore,
  addDownloadCategoryFirestore,
  updateDownloadCategoryFirestore,
  deleteDownloadCategoryFirestore
} from "./data/firestore/downloads";

import {
  getPointsConfigFirestore,
  updatePointsConfigFirestore,
  backfillPointsForAllRunsFirestore,
  wipeLeaderboardsFirestore
} from "./data/firestore/points";

import {
  getGameDetailsConfigFirestore,
  updateGameDetailsConfigFirestore
} from "./data/firestore/game-details";

import {
  checkSRCRunExistsFirestore,
  getImportedSRCRunsFirestore,
  getAllRunsForDuplicateCheckFirestore,
  deleteAllImportedSRCRunsFirestore,
  wipeAllImportedSRCRunsFirestore,
  getVerifiedRunsWithInvalidDataFirestore,
  getIlRunsToFixFirestore,
  getExistingSRCRunIdsFirestore,
  getUnclaimedImportedRunsFirestore,
  deleteAllUnclaimedImportedRunsFirestore,
  findDuplicateRunsFirestore,
  removeDuplicateRunsFirestore,
  autoClaimRunsBySRCUsernameFirestore,
  runAutoclaimingForAllUsersFirestore,
  getUnclaimedRunsBySRCUsernameFirestore,
  getUnassignedRunsFirestore,
  claimRunFirestore,
  getAllVerifiedRunsFirestore
} from "./data/firestore/src-imports";

import { LeaderboardEntry, Category, Platform } from "@/types/database";

// Helper to fix missing function
const getLeaderboardEntryByIdFirestore = async (id: string): Promise<LeaderboardEntry | null> => {
  if (!db) return null;
  try {
    const docRef = doc(db, "leaderboardEntries", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as LeaderboardEntry;
    }
    return null;
  } catch (_error) {
    return null;
  }
};

const defaultCategories = [
  { name: "Any%" },
  { name: "Free Play" },
  { name: "All Minikits" },
  { name: "100%" },
];

export const initializeDefaultCategories = async (): Promise<void> => {
  try {
    const existingCategories = await getCategoriesFirestore();
    if (existingCategories.length === 0) {
      for (let i = 0; i < defaultCategories.length; i++) {
        await addCategoryFirestore(defaultCategories[i].name);
      }
    }
  } catch (_error) {
    // Silent fail
  }
};

export const getCategories = async (leaderboardType?: 'regular' | 'individual-level' | 'community-golds'): Promise<Category[]> => {
  try {
    const type = leaderboardType || 'regular';
    let firestoreCategories = await getCategoriesFirestore(type);
    
    // Only initialize default categories for regular leaderboard type
    if (firestoreCategories.length === 0 && type === 'regular') {
      await initializeDefaultCategories();
      firestoreCategories = await getCategoriesFirestore(type);
    }
    
    return firestoreCategories;
  } catch (_error) {
    return [];
  }
};

const defaultPlatforms = [
  { name: "PC" },
  { name: "PS2" },
  { name: "Xbox" },
  { name: "GameCube" },
];

export const initializeDefaultPlatforms = async (): Promise<void> => {
  try {
    const existingPlatforms = await getPlatformsFirestore();
    if (existingPlatforms.length === 0) {
      for (let i = 0; i < defaultPlatforms.length; i++) {
        await addPlatformFirestore(defaultPlatforms[i].name);
      }
    }
  } catch (_error) {
    // Silent fail
  }
};

export const getPlatforms = async (): Promise<Platform[]> => {
  try {
    let firestorePlatforms = await getPlatformsFirestore();
    
    if (firestorePlatforms.length === 0) {
      await initializeDefaultPlatforms();
      firestorePlatforms = await getPlatformsFirestore();
    }
    
    return firestorePlatforms;
  } catch (_error) {
    return [];
  }
};

export const runTypes = [
  { id: "solo", name: "Solo" },
  { id: "co-op", name: "Co-op" },
];

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
export const getPlayerByUid = getPlayerByUidFirestore;
export const getPlayerByDisplayName = getPlayerByDisplayNameFirestore;
export const createPlayer = createPlayerFirestore;
export const updatePlayerProfile = updatePlayerProfileFirestore;
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

export const getDownloadEntries = getDownloadEntriesFirestore;
export const addDownloadEntry = addDownloadEntryFirestore;
export const deleteDownloadEntry = deleteDownloadEntryFirestore;
export const updateDownloadOrder = updateDownloadOrderFirestore;
export const moveDownloadUp = moveDownloadUpFirestore;
export const moveDownloadDown = moveDownloadDownFirestore;

export const getCategoriesFromFirestore = async (leaderboardType?: 'regular' | 'individual-level' | 'community-golds'): Promise<Category[]> => {
  return getCategoriesFirestore(leaderboardType);
};
export const addCategory = async (name: string, leaderboardType?: 'regular' | 'individual-level' | 'community-golds', srcCategoryId?: string): Promise<string | null> => {
  return addCategoryFirestore(name, leaderboardType, srcCategoryId);
};
export const updateCategory = async (id: string, name: string, subcategories?: Array<{ id: string; name: string; order?: number; srcVariableId?: string; srcValueId?: string }>, srcCategoryId?: string | null, srcSubcategoryVariableName?: string | null): Promise<boolean> => {
  return updateCategoryFirestore(id, name, subcategories, srcCategoryId, srcSubcategoryVariableName);
};
export const deleteCategory = deleteCategoryFirestore;
export const moveCategoryUp = moveCategoryUpFirestore;
export const moveCategoryDown = moveCategoryDownFirestore;

export const getPlatformsFromFirestore = getPlatformsFirestore;
export const addPlatform = addPlatformFirestore;
export const updatePlatform = updatePlatformFirestore;
export const deletePlatform = deletePlatformFirestore;
export const movePlatformUp = movePlatformUpFirestore;
export const movePlatformDown = movePlatformDownFirestore;

export const getUnclaimedRunsBySRCUsername = getUnclaimedRunsBySRCUsernameFirestore;
export const getUnassignedRuns = getUnassignedRunsFirestore;
export const claimRun = claimRunFirestore;

export const getAllVerifiedRuns = getAllVerifiedRunsFirestore;

export const getPlayersByPoints = getPlayersByPointsFirestore;

export const getLevels = getLevelsFirestore;
export const addLevel = addLevelFirestore;
export const updateLevel = updateLevelFirestore;
export const deleteLevel = deleteLevelFirestore;
export const moveLevelUp = moveLevelUpFirestore;
export const moveLevelDown = moveLevelDownFirestore;
export const updateLevelCategoryDisabled = updateLevelCategoryDisabledFirestore;

export const getPlayersWithTwitchUsernames = getPlayersWithTwitchUsernamesFirestore;

// Download Categories (managed in Firestore)
export const getDownloadCategories = getDownloadCategoriesFirestore;
export const addDownloadCategory = addDownloadCategoryFirestore;
export const updateDownloadCategory = updateDownloadCategoryFirestore;
export const deleteDownloadCategory = deleteDownloadCategoryFirestore;

export const checkSRCRunExists = checkSRCRunExistsFirestore;
export const getImportedSRCRuns = getImportedSRCRunsFirestore;
export const getAllRunsForDuplicateCheck = getAllRunsForDuplicateCheckFirestore;
export const deleteAllImportedSRCRuns = deleteAllImportedSRCRunsFirestore;
export const wipeAllImportedSRCRuns = wipeAllImportedSRCRunsFirestore;
export const getVerifiedRunsWithInvalidData = getVerifiedRunsWithInvalidDataFirestore;
export const getIlRunsToFix = getIlRunsToFixFirestore;
export const getExistingSRCRunIds = getExistingSRCRunIdsFirestore;
export const getUnclaimedImportedRuns = getUnclaimedImportedRunsFirestore;
export const deleteAllUnclaimedImportedRuns = deleteAllUnclaimedImportedRunsFirestore;
export const findDuplicateRuns = findDuplicateRunsFirestore;
export const removeDuplicateRuns = removeDuplicateRunsFirestore;
export const autoClaimRunsBySRCUsername = autoClaimRunsBySRCUsernameFirestore;
export const isDisplayNameAvailable = isDisplayNameAvailableFirestore;
export const getAllPlayers = getAllPlayersFirestore;
export const updatePlayer = updatePlayerFirestore;
export const deletePlayer = deletePlayerFirestore;
export const getPlayersWithSRCUsernames = getPlayersWithSRCUsernamesFirestore;
export const runAutoclaimingForAllUsers = runAutoclaimingForAllUsersFirestore;

// Notification exports
export const createNotification = createNotificationFirestore;
export const getUserNotifications = getUserNotificationsFirestore;
export const getUnreadUserNotifications = getUnreadUserNotificationsFirestore;
export const markNotificationAsRead = markNotificationAsReadFirestore;
export const markAllNotificationsAsRead = markAllNotificationsAsReadFirestore;
export const deleteNotification = deleteNotificationFirestore;

// Note: syncCategoriesFromSRC is exported directly from ./speedruncom/importService
// to avoid circular dependency. Import it directly from there if needed.

export const getPointsConfig = getPointsConfigFirestore;
export const updatePointsConfig = updatePointsConfigFirestore;

export const getGameDetailsConfig = getGameDetailsConfigFirestore;
export const updateGameDetailsConfig = updateGameDetailsConfigFirestore;

export const backfillPointsForAllRuns = async () => {
  return backfillPointsForAllRunsFirestore();
};

export const wipeLeaderboards = async () => {
  return wipeLeaderboardsFirestore();
};

/**
 * Set admin status for a player
 * Creates player document if it doesn't exist
 */
export const setPlayerAdminStatus = async (uid: string, isAdmin: boolean): Promise<boolean> => {
  try {
    const existingPlayer = await getPlayerByUid(uid);
    
    if (!existingPlayer) {
      const today = new Date().toISOString().split('T')[0];
      const newPlayer = {
        id: uid,
        uid: uid,
        displayName: "",
        email: "",
        joinDate: today,
        totalRuns: 0,
        bestRank: null,
        favoriteCategory: null,
        favoritePlatform: null,
        nameColor: "#cba6f7",
        isAdmin: isAdmin,
      };
      const result = await createPlayer(newPlayer);
      return result !== null;
    } else {
      const playerDocRef = doc(db, "players", uid);
      const docSnap = await getDoc(playerDocRef);
      
      if (docSnap.exists()) {
        try {
          await updateDoc(playerDocRef, { isAdmin });
          return true;
        } catch (updateError: any) {
          // Try alternative method if permission denied
          if (updateError?.code === 'permission-denied') {
            try {
              await setDoc(playerDocRef, { uid, isAdmin }, { merge: true });
              return true;
            } catch {
              return false;
            }
          }
          return false;
        }
      } else {
        await setDoc(playerDocRef, { uid, isAdmin }, { merge: true });
        return true;
      }
    }
  } catch {
    return false;
  }
};