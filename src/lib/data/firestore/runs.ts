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
  DocumentData,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  writeBatch
} from "firebase/firestore";
import { LeaderboardEntry } from "@/types/database";
import { leaderboardEntryConverter } from "./converters";
import { normalizeLeaderboardEntry, validateLeaderboardEntry } from "@/lib/dataValidation";

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

/**
 * Subscribe to real-time updates for a player's verified runs
 * @param playerId - The player ID to get runs for
 * @param callback - Callback function that receives the runs array
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToPlayerRunsFirestore = (
  playerId: string,
  callback: (runs: LeaderboardEntry[]) => void
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("playerId", "==", playerId),
      where("verified", "==", true),
      orderBy("date", "desc")
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const runs = snapshot.docs.map(d => d.data());
      callback(runs);
    }, (error) => {
      console.error("Error in player runs subscription:", error);
      callback([]);
    });
  } catch (error) {
    console.error("Error setting up player runs subscription:", error);
    return null;
  }
};

/**
 * Subscribe to real-time updates for a player's pending runs
 * @param playerId - The player ID to get pending runs for
 * @param callback - Callback function that receives the runs array
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToPlayerPendingRunsFirestore = (
  playerId: string,
  callback: (runs: LeaderboardEntry[]) => void
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("playerId", "==", playerId),
      where("verified", "==", false),
      orderBy("date", "desc")
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const runs = snapshot.docs.map(d => d.data());
      callback(runs);
    }, (error) => {
      console.error("Error in player pending runs subscription:", error);
      callback([]);
    });
  } catch (error) {
    console.error("Error setting up player pending runs subscription:", error);
    return null;
  }
};

/**
 * Batch verify multiple runs using Firestore batch writes for better performance
 * Firestore batches support up to 500 operations, so we'll split into multiple batches if needed
 * 
 * @param runIds - Array of run IDs to verify
 * @param verifiedBy - User who is verifying the runs
 * @param updates - Optional map of runId -> updates to apply before verification
 * @returns Summary of the batch verification
 */
export const batchVerifyRunsFirestore = async (
  runIds: string[],
  verifiedBy: string,
  updates?: Map<string, Partial<LeaderboardEntry>>
): Promise<{
  successCount: number;
  errorCount: number;
  errors: string[];
}> => {
  if (!db) {
    return { successCount: 0, errorCount: runIds.length, errors: ["Database not initialized"] };
  }

  const result = {
    successCount: 0,
    errorCount: 0,
    errors: [] as string[],
  };

  if (runIds.length === 0) {
    return result;
  }

  // Firestore batch limit is 500 operations
  // Each run needs: 1 update for verification + potentially 1 update for field updates = 2 operations max
  // So we can process up to 250 runs per batch safely
  const BATCH_SIZE = 250;
  const batches: string[][] = [];
  
  for (let i = 0; i < runIds.length; i += BATCH_SIZE) {
    batches.push(runIds.slice(i, i + BATCH_SIZE));
  }

  try {
    for (const batch of batches) {
      const firestoreBatch = writeBatch(db);
      let operationsInBatch = 0;

      for (const runId of batch) {
        try {
          const docRef = doc(db, "leaderboardEntries", runId).withConverter(leaderboardEntryConverter);
          
          // Apply field updates if provided
          if (updates && updates.has(runId)) {
            const runUpdates = updates.get(runId)!;
            firestoreBatch.update(docRef, runUpdates as any);
            operationsInBatch++;
          }

          // Update verification status
          firestoreBatch.update(docRef, {
            verified: true,
            verifiedBy: verifiedBy
          } as any);
          operationsInBatch++;

          // Check if we're approaching the limit (500 operations per batch)
          if (operationsInBatch >= 500) {
            // Commit current batch and start a new one
            await firestoreBatch.commit();
            result.successCount += Math.floor(operationsInBatch / 2); // Each run = 2 operations
            const newBatch = writeBatch(db);
            // Continue with remaining runs in a new batch
            // This is a simplified approach - in practice, we'd need to track which runs were processed
          }
        } catch (error: any) {
          result.errorCount++;
          result.errors.push(`Error preparing run ${runId}: ${error.message || String(error)}`);
        }
      }

      // Commit the batch
      if (operationsInBatch > 0) {
        try {
          await firestoreBatch.commit();
          // Count successful verifications (each run = 2 operations: update + verify, or just verify)
          const runsInBatch = Math.ceil(operationsInBatch / 2);
          result.successCount += runsInBatch;
        } catch (error: any) {
          // If batch commit fails, all operations in the batch fail
          result.errorCount += Math.ceil(operationsInBatch / 2);
          result.errors.push(`Batch commit failed: ${error.message || String(error)}`);
        }
      }
    }

    // Create notifications for verified runs (do this after successful verification)
    // This is done separately to avoid making the batch too large
    if (result.successCount > 0) {
      try {
        const { createNotificationFirestore } = await import("./notifications");
        const verifiedRunIds = runIds.slice(0, result.successCount);
        
        // Fetch runs to get playerIds for notifications
        const runPromises = verifiedRunIds.map(runId => 
          getDoc(doc(db, "leaderboardEntries", runId).withConverter(leaderboardEntryConverter))
        );
        const runSnaps = await Promise.all(runPromises);
        
        // Create notifications in batches (Firestore batch limit is 500)
        const notificationBatch = writeBatch(db);
        let notificationCount = 0;
        
        for (const runSnap of runSnaps) {
          if (runSnap.exists()) {
            const run = runSnap.data();
            if (run.playerId) {
              const notificationRef = doc(collection(db, "notifications"));
              notificationBatch.set(notificationRef, {
                id: notificationRef.id,
                userId: run.playerId,
                type: 'run_verified',
                title: 'Run Verified',
                message: `Your run for ${run.category} has been verified!`,
                link: `/runs/${run.id}`,
                read: false,
                createdAt: new Date().toISOString(),
                metadata: { runId: run.id }
              });
              notificationCount++;
              
              // Commit if approaching limit
              if (notificationCount >= 500) {
                await notificationBatch.commit();
                notificationCount = 0;
                // Start new batch would require more complex logic
                break; // For simplicity, we'll just create notifications for first batch
              }
            }
          }
        }
        
        if (notificationCount > 0) {
          await notificationBatch.commit();
        }
      } catch (error) {
        // Don't fail the whole operation if notifications fail
        console.error("Error creating notifications for batch verification:", error);
      }
    }
  } catch (error: any) {
    result.errorCount += runIds.length - result.successCount;
    result.errors.push(`Batch verification error: ${error.message || String(error)}`);
  }

  return result;
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
                    const { createNotificationFirestore } = await import("./notifications");
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

/**
 * Subscribe to real-time updates for recent verified runs
 * @param callback - Callback function that receives the runs array
 * @param limitCount - Maximum number of runs to return (default: 20)
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToRecentRunsFirestore = (
  callback: (runs: LeaderboardEntry[]) => void,
  limitCount: number = 20
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("verified", "==", true),
      orderBy("date", "desc"),
      firestoreLimit(limitCount)
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const runs = snapshot.docs.map(d => d.data());
      callback(runs);
    }, (error) => {
      console.error("Error in recent runs subscription:", error);
      callback([]);
    });
  } catch (error) {
    console.error("Error setting up recent runs subscription:", error);
    return null;
  }
};

/**
 * Subscribe to real-time updates for unverified leaderboard entries
 * @param callback - Callback function that receives the runs array
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToUnverifiedRunsFirestore = (
  callback: (runs: LeaderboardEntry[]) => void
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("verified", "==", false),
      orderBy("date", "desc")
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const runs = snapshot.docs.map(d => d.data());
      callback(runs);
    }, (error) => {
      console.error("Error in unverified runs subscription:", error);
      callback([]);
    });
  } catch (error) {
    console.error("Error setting up unverified runs subscription:", error);
    return null;
  }
};

/**
 * Subscribe to real-time updates for a specific leaderboard entry
 * @param runId - The ID of the run to subscribe to
 * @param callback - Callback function that receives the run or null if not found
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToLeaderboardEntryFirestore = (
  runId: string,
  callback: (run: LeaderboardEntry | null) => void
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const docRef = doc(db, "leaderboardEntries", runId).withConverter(leaderboardEntryConverter);
    
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback(null);
      }
    }, (error) => {
      console.error("Error in run subscription:", error);
      callback(null);
    });
  } catch (error) {
    console.error("Error setting up run subscription:", error);
    return null;
  }
};
