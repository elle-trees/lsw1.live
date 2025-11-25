import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit as firestoreLimit,
  writeBatch,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { LeaderboardEntry } from "@/types/database";
import { leaderboardEntryConverter } from "./converters";
import { getPlayersWithSRCUsernamesFirestore } from "./players";

export const checkSRCRunExistsFirestore = async (srcRunId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const q = query(
      collection(db, "leaderboardEntries"),
      where("srcRunId", "==", srcRunId),
      firestoreLimit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking SRC run existence:", error);
    return false;
  }
};

export const getImportedSRCRunsFirestore = async (limitCount: number = 50): Promise<LeaderboardEntry[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("importedFromSRC", "==", true),
      firestoreLimit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching imported SRC runs:", error);
    return [];
  }
};

export const getAllRunsForDuplicateCheckFirestore = async (): Promise<LeaderboardEntry[]> => {
    // Fetch minimal data for duplicate checking
    if (!db) return [];
    try {
        const q = query(collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter));
        // This might be too large. 
        // Optimization: Only fetch srcRunId field if possible, but Firestore returns full docs.
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        return [];
    }
};

export const deleteAllImportedSRCRunsFirestore = async (): Promise<{ deleted: number; errors: string[] }> => {
    if (!db) return { deleted: 0, errors: ["Database not initialized"] };
    
    let deletedCount = 0;
    const errors: string[] = [];

    try {
        // Query all imported runs
        const q = query(
            collection(db, "leaderboardEntries"),
            where("importedFromSRC", "==", true)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return { deleted: 0, errors: [] };
        }

        const batches = [];
        let batch = writeBatch(db);
        let operationCount = 0;

        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            operationCount++;
            deletedCount++;

            if (operationCount >= 500) {
                batches.push(batch.commit());
                batch = writeBatch(db);
                operationCount = 0;
            }
        }

        if (operationCount > 0) {
            batches.push(batch.commit());
        }

        await Promise.all(batches);
        
        return { deleted: deletedCount, errors };
    } catch (error: any) {
        errors.push(error.message || "Unknown error occurred during deletion");
        return { deleted: deletedCount, errors };
    }
};

export const wipeAllImportedSRCRunsFirestore = async (
  onProgress?: (deletedCount: number) => void
): Promise<{ deleted: number; errors: string[] }> => {
    if (!db) return { deleted: 0, errors: ["Database not initialized"] };
    
    let deletedCount = 0;
    const errors: string[] = [];

    try {
        // Query all imported runs
        const q = query(
            collection(db, "leaderboardEntries"),
            where("importedFromSRC", "==", true)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return { deleted: 0, errors: [] };
        }

        // Process in chunks to avoid memory issues and provide progress
        const chunkSize = 500;
        const docs = snapshot.docs;
        
        for (let i = 0; i < docs.length; i += chunkSize) {
            const chunk = docs.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            
            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            deletedCount += chunk.length;
            
            if (onProgress) {
                onProgress(deletedCount);
            }
        }
        
        return { deleted: deletedCount, errors };
    } catch (error: any) {
        errors.push(error.message || "Unknown error occurred during deletion");
        return { deleted: deletedCount, errors };
    }
};

export const getVerifiedRunsWithInvalidDataFirestore = async (): Promise<LeaderboardEntry[]> => {
    // Implementation omitted
    return [];
};

export const getIlRunsToFixFirestore = async (): Promise<LeaderboardEntry[]> => {
    // Implementation omitted
    return [];
};

export const getExistingSRCRunIdsFirestore = async (): Promise<Set<string>> => {
    if (!db) return new Set();
    try {
        const q = query(
            collection(db, "leaderboardEntries"),
            where("importedFromSRC", "==", true)
        );
        const snapshot = await getDocs(q);
        const ids = new Set<string>();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.srcRunId) ids.add(data.srcRunId);
        });
        return ids;
    } catch (error) {
        return new Set();
    }
};

export const getUnclaimedImportedRunsFirestore = async (limitCount: number = 50): Promise<LeaderboardEntry[]> => {
     if (!db) return [];
     try {
         // Unclaimed means playerId is empty or "imported"
         // We can't easily query for "empty or imported" in one go without 'in'
         const q = query(
             collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
             where("importedFromSRC", "==", true),
             // where("playerId", "==", ""), // This might miss nulls or "imported"
             firestoreLimit(limitCount * 2) // Fetch more and filter
         );
         const snapshot = await getDocs(q);
         return snapshot.docs
             .map(doc => doc.data())
             .filter(entry => !entry.playerId || entry.playerId === "imported" || entry.playerId.trim() === "")
             .slice(0, limitCount);
     } catch (error) {
         return [];
     }
};

export const deleteAllUnclaimedImportedRunsFirestore = async (): Promise<{ success: boolean; deletedRuns: number; error?: string }> => {
    if (!db) return { success: false, deletedRuns: 0, error: "Database not initialized" };
    try {
        const runs = await getUnclaimedImportedRunsFirestore(1000); // Limit to avoid timeout
        if (runs.length === 0) return { success: true, deletedRuns: 0 };

        const batch = writeBatch(db);
        runs.forEach(run => {
            batch.delete(doc(db, "leaderboardEntries", run.id));
        });
        await batch.commit();
        return { success: true, deletedRuns: runs.length };
    } catch (error: any) {
        return { success: false, deletedRuns: 0, error: error.message };
    }
};

export const findDuplicateRunsFirestore = async (): Promise<any[]> => {
    return [];
};

export const removeDuplicateRunsFirestore = async (duplicateRuns: { runs: LeaderboardEntry[]; key: string }[]): Promise<{ removed: number; errors: string[] }> => {
    if (!db) return { removed: 0, errors: ["Database not initialized"] };
    let removedCount = 0;
    const errors: string[] = [];
    
    try {
        const batch = writeBatch(db);
        
        for (const group of duplicateRuns) {
            // Keep the first one (or based on some criteria), remove others
            // For simplicity, keep the verified one or the one with most info
            // Here we assume the first one is "main" and others are duplicates to remove
            // This logic depends on how findDuplicateRuns finds them.
            // Assuming we remove all BUT one.
            
            if (group.runs.length <= 1) continue;
            
            // Sort to keep the "best" one? 
            // For now, just remove subsequent ones
            const toRemove = group.runs.slice(1);
            
            toRemove.forEach(run => {
                batch.delete(doc(db, "leaderboardEntries", run.id));
                removedCount++;
            });
        }
        
        if (removedCount > 0) {
            await batch.commit();
        }
        
        return { removed: removedCount, errors };
    } catch (error: any) {
        errors.push(error.message);
        return { removed: removedCount, errors };
    }
};

export const autoClaimRunsBySRCUsernameFirestore = async (uid: string, srcUsername: string): Promise<number> => {
    if (!db) return 0;
    try {
        // Normalize username for consistent matching (lowercase, trimmed)
        const normalizedUsername = srcUsername.trim().toLowerCase();
        
        // Find runs with matching srcPlayerName
        const q = query(
            collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
            where("importedFromSRC", "==", true),
            where("srcPlayerName", "==", normalizedUsername)
        );
        
        const snapshot = await getDocs(q);
        let claimedCount = 0;
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
            const entry = doc.data();
            // Only claim if currently unclaimed
            if (!entry.playerId || entry.playerId === "imported" || entry.playerId.trim() === "") {
                batch.update(doc.ref, { playerId: uid });
                claimedCount++;
            }
        });
        
        if (claimedCount > 0) {
            await batch.commit();
        }
        
        return claimedCount;
    } catch (error) {
        console.error("Error auto-claiming runs:", error);
        return 0;
    }
};

export const runAutoclaimingForAllUsersFirestore = async (): Promise<{ runsUpdated: number; playersUpdated: number; errors: string[] }> => {
    if (!db) return { runsUpdated: 0, playersUpdated: 0, errors: [] };
    
    const result = { runsUpdated: 0, playersUpdated: 0, errors: [] as string[] };
    
    try {
        const playersWithSRC = await getPlayersWithSRCUsernamesFirestore();
        
        for (const player of playersWithSRC) {
            try {
                const claimed = await autoClaimRunsBySRCUsernameFirestore(player.uid, player.srcUsername);
                if (claimed > 0) {
                    result.runsUpdated += claimed;
                    result.playersUpdated++;
                }
            } catch (err: any) {
                result.errors.push(`Error claiming for ${player.srcUsername}: ${err.message}`);
            }
        }
        
        return result;
    } catch (error: any) {
        result.errors.push(`Fatal error: ${error.message}`);
        return result;
    }
};

export const tryAutoAssignRunFirestore = async (runId: string, entry: LeaderboardEntry): Promise<boolean> => {
    // Logic to match entry.srcPlayerName to a player with that srcUsername
    if (!db) return false;
    if (!entry.srcPlayerName) return false;
    
    try {
        // Normalize both values for consistent matching
        const normalizedSrcPlayerName = entry.srcPlayerName.trim().toLowerCase();
        
        const q = query(
            collection(db, "players"),
            where("srcUsername", "==", normalizedSrcPlayerName),
            firestoreLimit(1)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const player = snapshot.docs[0].data();
            await updateDoc(doc(db, "leaderboardEntries", runId), { playerId: player.uid });
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
};

export const getUnclaimedRunsBySRCUsernameFirestore = async (srcUsername: string): Promise<LeaderboardEntry[]> => {
    if (!db) return [];
    try {
        // Normalize username for consistent matching (lowercase, trimmed)
        const normalizedUsername = srcUsername.trim().toLowerCase();
        
        const q = query(
            collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
            where("importedFromSRC", "==", true),
            where("srcPlayerName", "==", normalizedUsername)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => doc.data())
            .filter(entry => !entry.playerId || entry.playerId === "imported" || entry.playerId.trim() === "");
    } catch (error) {
        return [];
    }
};

export const getUnassignedRunsFirestore = async (): Promise<LeaderboardEntry[]> => {
    return getUnclaimedImportedRunsFirestore(100);
};

export const claimRunFirestore = async (runId: string, userId: string): Promise<boolean> => {
    if (!db) return false;
    try {
        await updateDoc(doc(db, "leaderboardEntries", runId), { playerId: userId });
        return true;
    } catch (error) {
        return false;
    }
};

export const getAllVerifiedRunsFirestore = async (): Promise<LeaderboardEntry[]> => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
            where("verified", "==", true)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        return [];
    }
};
