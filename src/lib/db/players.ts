// Player operations
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
  getPlayersByPointsFirestore,
  subscribeToPlayersByPointsFirestore,
  subscribeToPlayerFirestore
} from "../data/firestore/players";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import type { Player } from "@/types/database";

export const getPlayerByUid = getPlayerByUidFirestore;
export const getPlayerByDisplayName = getPlayerByDisplayNameFirestore;
export const createPlayer = createPlayerFirestore;
export const updatePlayerProfile = updatePlayerProfileFirestore;
export const isDisplayNameAvailable = isDisplayNameAvailableFirestore;
export const getPlayersWithTwitchUsernames = getPlayersWithTwitchUsernamesFirestore;
export const getPlayersWithSRCUsernames = getPlayersWithSRCUsernamesFirestore;
export const getAllPlayers = getAllPlayersFirestore;
export const updatePlayer = updatePlayerFirestore;
export const deletePlayer = deletePlayerFirestore;
export const getPlayersByPoints = getPlayersByPointsFirestore;

// Real-time subscriptions
export const subscribeToPlayersByPoints = (
  callback: (players: Player[]) => void,
  limitCount: number = 100
): Unsubscribe | null => {
  return subscribeToPlayersByPointsFirestore(callback, limitCount);
};

export const subscribeToPlayer = (
  uid: string,
  callback: (player: Player | null) => void
): Unsubscribe | null => {
  return subscribeToPlayerFirestore(uid, callback);
};

// Export totalRuns recalculation functions
export { 
  recalculatePlayerTotalRunsFirestore as recalculatePlayerTotalRuns,
  recalculateAllPlayerTotalRunsFirestore as recalculateAllPlayerTotalRuns
} from "../data/firestore/players-realtime";

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

