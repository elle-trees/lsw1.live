export const getUnverifiedLeaderboardEntries = async () => {
  const module = await import("./db/runs");
  return module.getUnverifiedLeaderboardEntries();
};

export const updateRunVerificationStatus = async (runId: string, verified: boolean, verifiedBy?: string) => {
  const module = await import("./db/runs");
  return module.updateRunVerificationStatus(runId, verified, verifiedBy);
};

export const deleteLeaderboardEntry = async (runId: string) => {
  const module = await import("./db/runs");
  return module.deleteLeaderboardEntry(runId);
};

export const addLeaderboardEntry = async (entry: Omit<import("@/types/database").LeaderboardEntry, 'id' | 'rank' | 'isObsolete'> & { verified?: boolean }) => {
  const module = await import("./db/runs");
  return module.addLeaderboardEntry(entry);
};

export const updateLeaderboardEntry = async (runId: string, data: Partial<import("@/types/database").LeaderboardEntry>) => {
  const module = await import("./db/runs");
  return module.updateLeaderboardEntry(runId, data);
};

export const getPlayerByUid = async (uid: string) => {
  const module = await import("./db/players");
  return module.getPlayerByUid(uid);
};

export const getPlayerByDisplayName = async (displayName: string) => {
  const module = await import("./db/players");
  return module.getPlayerByDisplayName(displayName);
};

export const createPlayer = async (player: import("@/types/database").Player) => {
  const module = await import("./db/players");
  return module.createPlayer(player);
};

export const setPlayerAdminStatus = async (uid: string, isAdmin: boolean) => {
  const module = await import("./db/players");
  return module.setPlayerAdminStatus(uid, isAdmin);
};

export const getAllPlayers = async () => {
  const module = await import("./db/players");
  return module.getAllPlayers();
};

export const updatePlayer = async (uid: string, data: Partial<import("@/types/database").Player>) => {
  const module = await import("./db/players");
  return module.updatePlayer(uid, data);
};

export const deletePlayer = async (uid: string) => {
  const module = await import("./db/players");
  return module.deletePlayer(uid);
};

export const getUnreadUserNotifications = async (userId: string) => {
  const module = await import("./db/notifications");
  return module.getUnreadUserNotifications(userId);
};

export const markNotificationAsRead = async (notificationId: string) => {
  const module = await import("./db/notifications");
  return module.markNotificationAsRead(notificationId);
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const module = await import("./db/notifications");
  return module.markAllNotificationsAsRead(userId);
};

export const deleteNotification = async (notificationId: string) => {
  const module = await import("./db/notifications");
  return module.deleteNotification(notificationId);
};

export const getUnclaimedRunsBySRCUsername = async (srcUsername: string) => {
  const module = await import("./db/src-imports");
  return module.getUnclaimedRunsBySRCUsername(srcUsername);
};

export const runAutoclaimingForAllUsers = async () => {
  const module = await import("./db/src-imports");
  return module.runAutoclaimingForAllUsers();
};

// Re-export commonly used functions with lazy loading
export const getCategories = async (leaderboardType?: 'regular' | 'individual-level' | 'community-golds') => {
  const module = await import("./db/categories");
  return module.getCategories(leaderboardType);
};

export const getCategoriesFromFirestore = async (leaderboardType?: 'regular' | 'individual-level' | 'community-golds') => {
  const module = await import("./db/categories");
  return module.getCategoriesFromFirestore(leaderboardType);
};

export const getPlatforms = async () => {
  const module = await import("./db/categories");
  return module.getPlatforms();
};

export const getPlatformsFromFirestore = async () => {
  const module = await import("./db/categories");
  return module.getPlatformsFromFirestore();
};

export const getLevels = async () => {
  const module = await import("./db/categories");
  return module.getLevels();
};

export const getDownloadEntries = async () => {
  const module = await import("./db/downloads");
  return module.getDownloadEntries();
};

export const getImportedSRCRuns = async (limitCount: number = 50) => {
  const module = await import("./db/src-imports");
  return module.getImportedSRCRuns(limitCount);
};

export const getLeaderboardEntries = async (
  categoryId?: string,
  platformId?: string,
  runType?: 'solo' | 'co-op',
  includeObsolete?: boolean,
  leaderboardType?: 'regular' | 'individual-level' | 'community-golds',
  levelId?: string,
  subcategoryId?: string
) => {
  const module = await import("./db/runs");
  return module.getLeaderboardEntries(categoryId, platformId, runType, includeObsolete, leaderboardType, levelId, subcategoryId);
};

export const getLeaderboardEntryById = async (runId: string) => {
  const module = await import("./db/runs");
  return module.getLeaderboardEntryById(runId);
};

export const getRecentRuns = async (limitCount: number = 20) => {
  const module = await import("./db/runs");
  return module.getRecentRuns(limitCount);
};

export const getPlayerRuns = async (playerId: string) => {
  const module = await import("./db/runs");
  return module.getPlayerRuns(playerId);
};

export const getPlayerPendingRuns = async (playerId: string) => {
  const module = await import("./db/runs");
  return module.getPlayerPendingRuns(playerId);
};

export const updateRunObsoleteStatus = async (runId: string, isObsolete: boolean) => {
  const module = await import("./db/runs");
  return module.updateRunObsoleteStatus(runId, isObsolete);
};

export const deleteAllLeaderboardEntries = async () => {
  const module = await import("./db/runs");
  return module.deleteAllLeaderboardEntries();
};

export const addCategory = async (name: string, leaderboardType?: 'regular' | 'individual-level' | 'community-golds', srcCategoryId?: string) => {
  const module = await import("./db/categories");
  return module.addCategory(name, leaderboardType, srcCategoryId);
};

export const updateCategory = async (id: string, name: string, subcategories?: Array<{ id: string; name: string; order?: number; srcVariableId?: string; srcValueId?: string }>, srcCategoryId?: string | null, srcSubcategoryVariableName?: string | null) => {
  const module = await import("./db/categories");
  return module.updateCategory(id, name, subcategories, srcCategoryId, srcSubcategoryVariableName);
};

export const deleteCategory = async (id: string) => {
  const module = await import("./db/categories");
  return module.deleteCategory(id);
};

export const moveCategoryUp = async (id: string) => {
  const module = await import("./db/categories");
  return module.moveCategoryUp(id);
};

export const moveCategoryDown = async (id: string) => {
  const module = await import("./db/categories");
  return module.moveCategoryDown(id);
};

export const addPlatform = async (name: string) => {
  const module = await import("./db/categories");
  return module.addPlatform(name);
};

export const updatePlatform = async (id: string, name: string) => {
  const module = await import("./db/categories");
  return module.updatePlatform(id, name);
};

export const deletePlatform = async (id: string) => {
  const module = await import("./db/categories");
  return module.deletePlatform(id);
};

export const movePlatformUp = async (id: string) => {
  const module = await import("./db/categories");
  return module.movePlatformUp(id);
};

export const movePlatformDown = async (id: string) => {
  const module = await import("./db/categories");
  return module.movePlatformDown(id);
};

export const addLevel = async (name: string) => {
  const module = await import("./db/categories");
  return module.addLevel(name);
};

export const updateLevel = async (id: string, name: string) => {
  const module = await import("./db/categories");
  return module.updateLevel(id, name);
};

export const deleteLevel = async (id: string) => {
  const module = await import("./db/categories");
  return module.deleteLevel(id);
};

export const moveLevelUp = async (id: string) => {
  const module = await import("./db/categories");
  return module.moveLevelUp(id);
};

export const moveLevelDown = async (id: string) => {
  const module = await import("./db/categories");
  return module.moveLevelDown(id);
};

export const updateLevelCategoryDisabled = async (levelId: string, categoryId: string, disabled: boolean) => {
  const module = await import("./db/categories");
  return module.updateLevelCategoryDisabled(levelId, categoryId, disabled);
};

export const addDownloadEntry = async (download: Omit<import("@/types/database").DownloadEntry, 'id' | 'dateAdded'>) => {
  const module = await import("./db/downloads");
  return module.addDownloadEntry(download);
};

export const deleteDownloadEntry = async (id: string) => {
  const module = await import("./db/downloads");
  return module.deleteDownloadEntry(id);
};

export const moveDownloadUp = async (id: string) => {
  const module = await import("./db/downloads");
  return module.moveDownloadUp(id);
};

export const moveDownloadDown = async (id: string) => {
  const module = await import("./db/downloads");
  return module.moveDownloadDown(id);
};

export const getDownloadCategories = async () => {
  const module = await import("./db/downloads");
  return module.getDownloadCategories();
};

export const getPointsConfig = async () => {
  const module = await import("./db/config");
  return module.getPointsConfig();
};

export const updatePointsConfig = async (config: import("@/types/database").PointsConfig) => {
  const module = await import("./db/config");
  return module.updatePointsConfig(config);
};

export const getGameDetailsConfig = async () => {
  const module = await import("./db/config");
  return module.getGameDetailsConfig();
};

export const updateGameDetailsConfig = async (config: Partial<import("@/types/database").GameDetailsConfig>) => {
  const module = await import("./db/config");
  return module.updateGameDetailsConfig(config);
};

export const backfillPointsForAllRuns = async () => {
  const module = await import("./db/config");
  return module.backfillPointsForAllRuns();
};

export const findDuplicateRuns = async () => {
  const module = await import("./db/src-imports");
  return module.findDuplicateRuns();
};

export const removeDuplicateRuns = async (duplicateGroups: Array<{ runs: import("@/types/database").LeaderboardEntry[]; key: string }>) => {
  const module = await import("./db/src-imports");
  return module.removeDuplicateRuns(duplicateGroups);
};

export const deleteAllImportedSRCRuns = async () => {
  const module = await import("./db/src-imports");
  return module.deleteAllImportedSRCRuns();
};

export const getUserNotifications = async (userId: string, limitCount: number = 20) => {
  const module = await import("./db/notifications");
  return module.getUserNotifications(userId, limitCount);
};

export const createNotification = async (notification: Omit<import("@/types/notifications").Notification, "id" | "createdAt" | "read">) => {
  const module = await import("./db/notifications");
  return module.createNotification(notification);
};

export const getPlayersByPoints = async (limitCount: number = 100) => {
  const module = await import("./db/players");
  return module.getPlayersByPoints(limitCount);
};

export const getPlayersWithTwitchUsernames = async () => {
  const module = await import("./db/players");
  return module.getPlayersWithTwitchUsernames();
};

export const getPlayersWithSRCUsernames = async () => {
  const module = await import("./db/players");
  return module.getPlayersWithSRCUsernames();
};

export const isDisplayNameAvailable = async (displayName: string) => {
  const module = await import("./db/players");
  return module.isDisplayNameAvailable(displayName);
};

export const updatePlayerProfile = async (uid: string, data: Partial<import("@/types/database").Player>) => {
  const module = await import("./db/players");
  return module.updatePlayerProfile(uid, data);
};

export const getUnassignedRuns = async () => {
  const module = await import("./db/src-imports");
  return module.getUnassignedRuns();
};

export const claimRun = async (runId: string, playerId: string) => {
  const module = await import("./db/src-imports");
  return module.claimRun(runId, playerId);
};

export const getAllVerifiedRuns = async () => {
  const module = await import("./db/src-imports");
  return module.getAllVerifiedRuns();
};

export const initializeDefaultCategories = async () => {
  const module = await import("./db/categories");
  return module.initializeDefaultCategories();
};

export const initializeDefaultPlatforms = async () => {
  const module = await import("./db/categories");
  return module.initializeDefaultPlatforms();
};

export const runTypes = [
  { id: "solo", name: "Solo" },
  { id: "co-op", name: "Co-op" },
];

// Real-time subscription functions (synchronous, so exported directly)
export { subscribeToRecentRuns, subscribeToUnverifiedRuns, subscribeToLeaderboardEntry, subscribeToLeaderboardEntries, subscribeToPlayerRuns, subscribeToPlayerPendingRuns } from "./db/runs";
export { subscribeToUnreadUserNotifications, subscribeToUserNotifications } from "./db/notifications";
export { subscribeToPlayersByPoints, subscribeToPlayer } from "./db/players";

// Real-time autoclaiming functions (synchronous, so exported directly)
export { startRealtimeAutoclaiming, stopRealtimeAutoclaiming, isRealtimeAutoclaimingActive } from "./data/firestore/autoclaim-realtime";

