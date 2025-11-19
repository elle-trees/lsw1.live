import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  limit as firestoreLimit,
  DocumentData
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
    // Note: This is expensive and should be avoided if possible. 
    // Ideally, we should have a normalized 'emailPrefix' field or similar.
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

/**
 * Check if a display name is available (case-insensitive)
 * Returns true if available, false if taken
 */
export const isDisplayNameAvailableFirestore = async (displayName: string): Promise<boolean> => {
  if (!db || !displayName || !displayName.trim()) return false;
  try {
    const normalizedDisplayName = displayName.trim().toLowerCase();
    
    // Optimization: If we had a 'displayNameLower' field, we could use a simple where clause.
    // For now, we still have to fetch, but we can try to limit the impact.
    // TODO: Add 'displayNameLower' field to Player document for efficient querying.
    
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
    // Optimization: Use 'where' clause if possible, but twitchUsername might not be indexed or might be null for many.
    // If we have an index on twitchUsername, we can use: where("twitchUsername", "!=", null)
    // However, "!=" queries are not supported directly in this way usually (requires specific setup).
    // ">" "" works for non-empty strings.
    
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

export const getAllPlayersFirestore = async (): Promise<Player[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, "players").withConverter(playerConverter));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (error) {
        console.error("Error fetching all players:", error);
        return [];
    }
};

export const updatePlayerFirestore = async (uid: string, data: Partial<Player>): Promise<boolean> => {
    return updatePlayerProfileFirestore(uid, data);
};

export const deletePlayerFirestore = async (uid: string): Promise<boolean> => {
    if (!db) return false;
    try {
        await updateDoc(doc(db, "players", uid), {
            // We might want to soft delete or just delete the doc.
            // For now, let's assume we shouldn't actually delete players often.
            // But if requested:
        });
        // Actually delete:
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "players", uid));
        return true;
    } catch (error) {
        console.error("Error deleting player:", error);
        return false;
    }
};

export const getPlayersByPointsFirestore = async (limitCount: number = 100): Promise<Player[]> => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "players").withConverter(playerConverter),
            where("totalPoints", ">", 0),
            firestoreLimit(limitCount)
            // orderBy("totalPoints", "desc") // Requires index
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
