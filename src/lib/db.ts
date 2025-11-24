export const getUnverifiedLeaderboardEntries = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.getUnverifiedLeaderboardEntries(...args);
};

export const updateRunVerificationStatus = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.updateRunVerificationStatus(...args);
};

export const deleteLeaderboardEntry = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.deleteLeaderboardEntry(...args);
};

export const addLeaderboardEntry = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.addLeaderboardEntry(...args);
};

export const updateLeaderboardEntry = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.updateLeaderboardEntry(...args);
};

export const getPlayerByUid = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.getPlayerByUid(...args);
};

export const getPlayerByDisplayName = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.getPlayerByDisplayName(...args);
};

export const createPlayer = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.createPlayer(...args);
};

export const setPlayerAdminStatus = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.setPlayerAdminStatus(...args);
};

export const getAllPlayers = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.getAllPlayers(...args);
};

export const updatePlayer = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.updatePlayer(...args);
};

export const deletePlayer = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.deletePlayer(...args);
};

export const getUnreadUserNotifications = async (...args: any[]) => {
  const module = await import("./db/notifications");
  return module.getUnreadUserNotifications(...args);
};

export const markNotificationAsRead = async (...args: any[]) => {
  const module = await import("./db/notifications");
  return module.markNotificationAsRead(...args);
};

export const markAllNotificationsAsRead = async (...args: any[]) => {
  const module = await import("./db/notifications");
  return module.markAllNotificationsAsRead(...args);
};

export const deleteNotification = async (...args: any[]) => {
  const module = await import("./db/notifications");
  return module.deleteNotification(...args);
};

export const getUnclaimedRunsBySRCUsername = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.getUnclaimedRunsBySRCUsername(...args);
};

export const runAutoclaimingForAllUsers = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.runAutoclaimingForAllUsers(...args);
};

// Re-export commonly used functions with lazy loading
export const getCategories = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.getCategories(...args);
};

export const getCategoriesFromFirestore = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.getCategoriesFromFirestore(...args);
};

export const getPlatforms = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.getPlatforms(...args);
};

export const getPlatformsFromFirestore = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.getPlatformsFromFirestore(...args);
};

export const getLevels = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.getLevels(...args);
};

export const getDownloadEntries = async (...args: any[]) => {
  const module = await import("./db/downloads");
  return module.getDownloadEntries(...args);
};

export const getImportedSRCRuns = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.getImportedSRCRuns(...args);
};

export const getLeaderboardEntries = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.getLeaderboardEntries(...args);
};

export const getLeaderboardEntryById = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.getLeaderboardEntryById(...args);
};

export const getRecentRuns = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.getRecentRuns(...args);
};

export const getPlayerRuns = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.getPlayerRuns(...args);
};

export const getPlayerPendingRuns = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.getPlayerPendingRuns(...args);
};

export const updateRunObsoleteStatus = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.updateRunObsoleteStatus(...args);
};

export const deleteAllLeaderboardEntries = async (...args: any[]) => {
  const module = await import("./db/runs");
  return module.deleteAllLeaderboardEntries(...args);
};

export const addCategory = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.addCategory(...args);
};

export const updateCategory = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.updateCategory(...args);
};

export const deleteCategory = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.deleteCategory(...args);
};

export const moveCategoryUp = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.moveCategoryUp(...args);
};

export const moveCategoryDown = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.moveCategoryDown(...args);
};

export const addPlatform = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.addPlatform(...args);
};

export const updatePlatform = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.updatePlatform(...args);
};

export const deletePlatform = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.deletePlatform(...args);
};

export const movePlatformUp = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.movePlatformUp(...args);
};

export const movePlatformDown = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.movePlatformDown(...args);
};

export const addLevel = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.addLevel(...args);
};

export const updateLevel = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.updateLevel(...args);
};

export const deleteLevel = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.deleteLevel(...args);
};

export const moveLevelUp = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.moveLevelUp(...args);
};

export const moveLevelDown = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.moveLevelDown(...args);
};

export const updateLevelCategoryDisabled = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.updateLevelCategoryDisabled(...args);
};

export const addDownloadEntry = async (...args: any[]) => {
  const module = await import("./db/downloads");
  return module.addDownloadEntry(...args);
};

export const deleteDownloadEntry = async (...args: any[]) => {
  const module = await import("./db/downloads");
  return module.deleteDownloadEntry(...args);
};

export const moveDownloadUp = async (...args: any[]) => {
  const module = await import("./db/downloads");
  return module.moveDownloadUp(...args);
};

export const moveDownloadDown = async (...args: any[]) => {
  const module = await import("./db/downloads");
  return module.moveDownloadDown(...args);
};

export const getDownloadCategories = async (...args: any[]) => {
  const module = await import("./db/downloads");
  return module.getDownloadCategories(...args);
};

export const getPointsConfig = async (...args: any[]) => {
  const module = await import("./db/config");
  return module.getPointsConfig(...args);
};

export const updatePointsConfig = async (...args: any[]) => {
  const module = await import("./db/config");
  return module.updatePointsConfig(...args);
};

export const getGameDetailsConfig = async (...args: any[]) => {
  const module = await import("./db/config");
  return module.getGameDetailsConfig(...args);
};

export const updateGameDetailsConfig = async (...args: any[]) => {
  const module = await import("./db/config");
  return module.updateGameDetailsConfig(...args);
};

export const backfillPointsForAllRuns = async (...args: any[]) => {
  const module = await import("./db/config");
  return module.backfillPointsForAllRuns(...args);
};

export const findDuplicateRuns = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.findDuplicateRuns(...args);
};

export const removeDuplicateRuns = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.removeDuplicateRuns(...args);
};

export const deleteAllImportedSRCRuns = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.deleteAllImportedSRCRuns(...args);
};

export const getUserNotifications = async (...args: any[]) => {
  const module = await import("./db/notifications");
  return module.getUserNotifications(...args);
};

export const createNotification = async (...args: any[]) => {
  const module = await import("./db/notifications");
  return module.createNotification(...args);
};

export const getPlayersByPoints = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.getPlayersByPoints(...args);
};

export const getPlayersWithTwitchUsernames = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.getPlayersWithTwitchUsernames(...args);
};

export const getPlayersWithSRCUsernames = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.getPlayersWithSRCUsernames(...args);
};

export const isDisplayNameAvailable = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.isDisplayNameAvailable(...args);
};

export const updatePlayerProfile = async (...args: any[]) => {
  const module = await import("./db/players");
  return module.updatePlayerProfile(...args);
};

export const getUnassignedRuns = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.getUnassignedRuns(...args);
};

export const claimRun = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.claimRun(...args);
};

export const getAllVerifiedRuns = async (...args: any[]) => {
  const module = await import("./db/src-imports");
  return module.getAllVerifiedRuns(...args);
};

export const initializeDefaultCategories = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.initializeDefaultCategories(...args);
};

export const initializeDefaultPlatforms = async (...args: any[]) => {
  const module = await import("./db/categories");
  return module.initializeDefaultPlatforms(...args);
};

export const runTypes = [
  { id: "solo", name: "Solo" },
  { id: "co-op", name: "Co-op" },
];

// Real-time subscription functions (synchronous, so exported directly)
export { subscribeToRecentRuns, subscribeToUnverifiedRuns, subscribeToLeaderboardEntry, subscribeToLeaderboardEntries, subscribeToPlayerRuns, subscribeToPlayerPendingRuns } from "./db/runs";
export { subscribeToUnreadUserNotifications, subscribeToUserNotifications } from "./db/notifications";
export { subscribeToPlayersByPoints, subscribeToPlayer } from "./db/players";

