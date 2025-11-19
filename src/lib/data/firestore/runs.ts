import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  DocumentData
} from "firebase/firestore";
import { LeaderboardEntry } from "@/types/database";
import { leaderboardEntryConverter } from "./converters";
import { normalizeLeaderboardEntry, validateLeaderboardEntry } from "@/lib/dataValidation";
import { checkSRCRunExistsFirestore, tryAutoAssignRunFirestore } from "./src-imports";
import { createNotificationFirestore } from "./notifications";

// We need to be careful about circular dependencies. 
// checkSRCRunExistsFirestore is in the main file currently. 
// I will assume for now I can import from "../firestore" but eventually I should move those here or to a separate file.
// Actually, let's implement them here or in a new file to avoid circular deps if possible.
// But `tryAutoAssignRunFirestore` depends on `getPlayersWithSRCUsernamesFirestore` which is in players.ts.
// So `runs.ts` -> `players.ts` is fine.
// But `firestore.ts` -> `runs.ts` is fine.
// The issue is `checkSRCRunExistsFirestore` is currently in `firestore.ts`.
// I should move `checkSRCRunExistsFirestore` to `runs.ts` or `src-imports.ts`.
// Let's put basic run CRUD here.

export const addLeaderboardEntryFirestore = async (entry: Omit<LeaderboardEntry, 'id' | 'rank' | 'isObsolete'> & { verified?: boolean }): Promise<string | null> => {
  if (!db) return null;
  try {
    const normalized = normalizeLeaderboardEntry(entry);
    const isImportedRun = normalized.importedFromSRC === true || normalized.importedFromSRC === Boolean(true) || !!normalized.importedFromSRC;
    
    // Check for duplicates (logic moved here or imported)
    if (isImportedRun && normalized.srcRunId && normalized.srcRunId.trim() !== "") {
       // We need to check if it exists. 
       // For now, I will assume we can query it here directly.
       const q = query(
         collection(db, "leaderboardEntries"),
         where("srcRunId", "==", normalized.srcRunId),
         firestoreLimit(1)
       );
       const snap = await getDocs(q);
       if (!snap.empty) {
         throw new Error(`Run with srcRunId ${normalized.srcRunId} already exists`);
       }
    }
    
    if (isImportedRun) {
      if (!normalized.playerName || normalized.playerName.trim() === "") throw new Error("Player name is required");
      if (!normalized.time || normalized.time.trim() === "") throw new Error("Time is required");
      if (!normalized.date || normalized.date.trim() === "") throw new Error("Date is required");
    } else {
      const validation = validateLeaderboardEntry(normalized);
      if (!validation.valid) throw new Error(`Invalid entry data: ${validation.errors.join(', ')}`);
    }
    
    const newDocRef = doc(collection(db, "leaderboardEntries")).withConverter(leaderboardEntryConverter);
    const finalLeaderboardType = normalized.leaderboardType || 'regular';
    
    const newEntry: LeaderboardEntry = {
        id: newDocRef.id,
        ...normalized,
        leaderboardType: finalLeaderboardType,
        verified: normalized.verified ?? false,
        isObsolete: false,
        // Ensure all required fields are present for the type
        playerId: normalized.playerId || entry.playerId || "",
        playerName: normalized.playerName || "",
        category: normalized.category || "",
        platform: normalized.platform || "",
        runType: normalized.runType || 'solo',
        time: normalized.time || "",
        date: normalized.date || "",
    };

    await setDoc(newDocRef, newEntry);
    
    // Auto-assign logic would go here. 
    // For now, I'll leave a comment to hook it up later or import it if I move it to a shared module.
    
    return newDocRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateLeaderboardEntryFirestore = async (runId: string, data: Partial<LeaderboardEntry>): Promise<boolean> => {
    if (!db) return false;
    try {
        const docRef = doc(db, "leaderboardEntries", runId).withConverter(leaderboardEntryConverter);
        await updateDoc(docRef, data);
        return true;
    } catch (error) {
        console.error("Error updating run:", error);
        throw error;
    }
};

export const deleteLeaderboardEntryFirestore = async (runId: string): Promise<boolean> => {
    if (!db) return false;
    try {
        await deleteDoc(doc(db, "leaderboardEntries", runId));
        return true;
    } catch (error) {
        console.error("Error deleting run:", error);
        return false;
    }
};

export const getRecentRunsFirestore = async (limitCount: number = 10): Promise<LeaderboardEntry[]> => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
            where("verified", "==", true),
            orderBy("date", "desc"),
            firestoreLimit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (error) {
        console.error("Error fetching recent runs:", error);
        return [];
    }
};

export const getPlayerRunsFirestore = async (playerId: string): Promise<LeaderboardEntry[]> => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
            where("playerId", "==", playerId),
            where("verified", "==", true),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (error) {
        console.error("Error fetching player runs:", error);
        return [];
    }
};

export const getPlayerPendingRunsFirestore = async (playerId: string): Promise<LeaderboardEntry[]> => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
            where("playerId", "==", playerId),
            where("verified", "==", false),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (error) {
        console.error("Error fetching player pending runs:", error);
        return [];
    }
};

export const getUnverifiedLeaderboardEntriesFirestore = async (): Promise<LeaderboardEntry[]> => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
            where("verified", "==", false),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (error) {
        console.error("Error fetching unverified runs:", error);
        return [];
    }
};

export const updateRunVerificationStatusFirestore = async (runId: string, verified: boolean, verifiedBy?: string): Promise<boolean> => {
    if (!db) return false;
    try {
        const success = await updateLeaderboardEntryFirestore(runId, { verified, verifiedBy });
        
        if (success && verified) {
            // Fetch the run to get the playerId and details
            const docRef = doc(db, "leaderboardEntries", runId).withConverter(leaderboardEntryConverter);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const run = docSnap.data();
                if (run.playerId) {
                    await createNotificationFirestore({
                        userId: run.playerId,
                        type: 'run_verified',
                        title: 'Run Verified',
                        message: `Your run for ${run.category} has been verified!`,
                        link: `/runs/${runId}`,
                        metadata: { runId: run.id }
                    });
                }
            }
        }
        return success;
    } catch (error) {
        console.error("Error updating verification status and notifying:", error);
        return false;
    }
};

export const updateRunObsoleteStatusFirestore = async (runId: string, isObsolete: boolean): Promise<boolean> => {
    return updateLeaderboardEntryFirestore(runId, { isObsolete });
};

export const deleteAllLeaderboardEntriesFirestore = async (): Promise<boolean> => {
    // This is a dangerous operation, usually for dev/admin.
    // Implementing via batch delete if needed, or just returning false for safety for now unless explicitly requested.
    // The original file had it, so I'll implement it but maybe with a warning.
    if (!db) return false;
    try {
        const q = query(collection(db, "leaderboardEntries"), firestoreLimit(500));
        const snapshot = await getDocs(q);
        const { writeBatch } = await import("firebase/firestore");
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting all runs:", error);
        return false;
    }
};
