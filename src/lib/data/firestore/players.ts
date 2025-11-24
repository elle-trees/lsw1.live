import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  limit as firestoreLimit,
  orderBy,
  updateDoc,
  writeBatch,
  getDoc,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot
} from "firebase/firestore";
import { Player } from "@/types/database";
import { playerConverter } from "./converters";

export const getPlayerByUidFirestore = async (uid: string): Promise<Player | null> => {
  if (!db) return null;
  try {
    const playerDocRef = doc(db, "players", uid).withConverter(playerConverter);
    const playerDocSnap = await getDoc(playerDocRef);
    if (playerDocSnap.exists()) {
      return playerDocSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching player by UID:", error);
    return null;
  }
};

/**
 * Subscribe to real-time updates for a specific player
 * @param uid - The player UID to subscribe to
 * @param callback - Callback function that receives the player or null if not found
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToPlayerFirestore = (
  uid: string,
  callback: (player: Player | null) => void
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const playerDocRef = doc(db, "players", uid).withConverter(playerConverter);
    
    return onSnapshot(playerDocRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback(null);
      }
    }, (error) => {
      console.error("Error in player subscription:", error);
      callback(null);
    });
  } catch (error) {
    console.error("Error setting up player subscription:", error);
    return null;
  }
};

export const createPlayerFirestore = async (player: Player): Promise<string | null> => {
  if (!db) return null;
  try {
    const playerDocRef = doc(db, "players", player.uid).withConverter(playerConverter);
    await setDoc(playerDocRef, player);
    return player.uid;
  } catch (error) {
    console.error("Error creating player:", error);
    return null;
  }
};

export const updatePlayerProfileFirestore = async (uid: string, data: Partial<Player>): Promise<boolean> => {
  if (!db) return false;
  try {
    const playerDocRef = doc(db, "players", uid).withConverter(playerConverter);
    await updateDoc(playerDocRef, data);
    return true;
  } catch (error) {
    console.error("Error updating player profile:", error);
    return false;
  }
};

export const getPlayerByDisplayNameFirestore = async (displayName: string): Promise<Player | null> => {
  if (!db) return null;
  try {
    const normalizedDisplayName = displayName.trim();
    const q = query(
      collection(db, "players").withConverter(playerConverter),
      where("displayName", "==", normalizedDisplayName),
      firestoreLimit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
    
    // Fallback: search by email prefix (only if displayName query fails)
    const allPlayersQuery = query(collection(db, "players").withConverter(playerConverter), firestoreLimit(500));
    const allPlayersSnapshot = await getDocs(allPlayersQuery);
    const normalizedSearch = normalizedDisplayName.toLowerCase();
    
    const playerDoc = allPlayersSnapshot.docs.find(doc => {
      const data = doc.data();
      const email = (data.email || "").toLowerCase();
      return email.split('@')[0] === normalizedSearch;
    });
    
    if (playerDoc) {
      return playerDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching player by display name:", error);
    return null;
  }
};

export const isDisplayNameAvailableFirestore = async (displayName: string): Promise<boolean> => {
  if (!db || !displayName || !displayName.trim()) return false;
  try {
    const normalizedDisplayName = displayName.trim().toLowerCase();
    const allPlayersQuery = query(collection(db, "players").withConverter(playerConverter), firestoreLimit(1000));
    const querySnapshot = await getDocs(allPlayersQuery);
    
    for (const doc of querySnapshot.docs) {
      const player = doc.data();
      const playerDisplayName = (player.displayName || "").trim().toLowerCase();
      
      if (playerDisplayName === normalizedDisplayName) {
        return false; // Display name is taken
      }
    }
    
    return true; // Display name is available
  } catch (error) {
    console.error("Error checking display name availability:", error);
    return false; // On error, assume not available to be safe
  }
};

export const getPlayersWithTwitchUsernamesFirestore = async (): Promise<Array<{ uid: string; displayName: string; twitchUsername: string; nameColor?: string; profilePicture?: string }>> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, "players").withConverter(playerConverter),
      where("twitchUsername", ">", ""), 
      firestoreLimit(1000)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const player = doc.data();
      return {
        uid: player.uid,
        displayName: player.displayName || "",
        twitchUsername: player.twitchUsername!.trim(),
        nameColor: player.nameColor,
        profilePicture: player.profilePicture,
      };
    });
  } catch (error) {
    // Fallback to client-side filtering if index is missing
    try {
        const q = query(collection(db, "players").withConverter(playerConverter), firestoreLimit(1000));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => doc.data())
            .filter(player => player.twitchUsername && player.twitchUsername.trim())
            .map(player => ({
                uid: player.uid,
                displayName: player.displayName || "",
                twitchUsername: player.twitchUsername!.trim(),
                nameColor: player.nameColor,
                profilePicture: player.profilePicture,
            }));
    } catch (e) {
        console.error("Error fetching players with Twitch usernames:", e);
        return [];
    }
  }
};

export const getPlayersWithSRCUsernamesFirestore = async (): Promise<Array<{ uid: string; srcUsername: string }>> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, "players").withConverter(playerConverter),
      where("srcUsername", ">", ""),
      firestoreLimit(1000)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const player = doc.data();
      return {
        uid: player.uid,
        srcUsername: player.srcUsername!.trim(),
      };
    });
  } catch (error) {
     // Fallback
     try {
        const q = query(collection(db, "players").withConverter(playerConverter), firestoreLimit(1000));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => doc.data())
            .filter(player => player.srcUsername && player.srcUsername.trim())
            .map(player => ({
                uid: player.uid,
                srcUsername: player.srcUsername!.trim(),
            }));
     } catch (e) {
         console.error("Error fetching players with SRC usernames:", e);
         return [];
     }
  }
};

export const getAllPlayersFirestore = async (sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<Player[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, "players").withConverter(playerConverter));
        const snapshot = await getDocs(q);
        let players = snapshot.docs.map(d => d.data());
        
        if (sortBy) {
            players.sort((a, b) => {
                const valA = (a as any)[sortBy];
                const valB = (b as any)[sortBy];
                
                if (valA === valB) return 0;
                
                if (valA === undefined || valA === null) return 1;
                if (valB === undefined || valB === null) return -1;
                
                if (sortOrder === 'desc') {
                    return valA > valB ? -1 : 1;
                } else {
                    return valA > valB ? 1 : -1;
                }
            });
        }
        
        return players;
    } catch (error) {
        console.error("Error fetching all players:", error);
        return [];
    }
};

export const updatePlayerFirestore = async (uid: string, data: Partial<Player>): Promise<boolean> => {
    return updatePlayerProfileFirestore(uid, data);
};

export const deletePlayerFirestore = async (uid: string, deleteRuns: boolean = false): Promise<{ success: boolean; error?: string; deletedRuns?: number }> => {
    if (!db) return { success: false, error: "Database not initialized" };
    try {
        let deletedRunsCount = 0;
        const batch = writeBatch(db);
        
        // Delete player
        const playerRef = doc(db, "players", uid);
        batch.delete(playerRef);
        
        // Delete runs if requested
        if (deleteRuns) {
            const runsQuery = query(collection(db, "leaderboardEntries"), where("playerId", "==", uid));
            const runsSnapshot = await getDocs(runsQuery);
            runsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                deletedRunsCount++;
            });
        }
        
        await batch.commit();
        
        return { success: true, deletedRuns: deletedRunsCount };
    } catch (error: any) {
        console.error("Error deleting player:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Get players by points with optimized query
 * Note: Using converter for type safety, but could be optimized with select() for minimal fields
 * if we create a separate query function without converter
 */
export const getPlayersByPointsFirestore = async (limitCount: number = 100): Promise<Player[]> => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "players").withConverter(playerConverter),
            where("totalPoints", ">", 0),
            firestoreLimit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        let players = snapshot.docs.map(d => d.data());
        
        // Sort in memory if index is missing/failing
        players.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        
        return players;
    } catch (error) {
        console.error("Error fetching players by points:", error);
        return [];
    }
};

/**
 * Subscribe to real-time updates for players sorted by points
 * @param callback - Callback function that receives the players array
 * @param limitCount - Maximum number of players to return (default: 100)
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToPlayersByPointsFirestore = (
  callback: (players: Player[]) => void,
  limitCount: number = 100
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, "players").withConverter(playerConverter),
      where("totalPoints", ">", 0),
      firestoreLimit(limitCount)
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      let players = snapshot.docs.map(d => d.data());
      // Sort in memory (Firestore doesn't support sorting on multiple fields easily)
      players.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      callback(players);
    }, (error) => {
      console.error("Error in players by points subscription:", error);
      callback([]);
    });
  } catch (error) {
    console.error("Error setting up players by points subscription:", error);
    return null;
  }
};

