import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  DocumentChange,
  updateDoc,
  doc,
  writeBatch,
  getDocs,
  limit as firestoreLimit,
} from "firebase/firestore";
import { LeaderboardEntry, Player } from "@/types/database";
import { leaderboardEntryConverter, playerConverter } from "./converters";
import { tryAutoAssignRunFirestore } from "./src-imports";
import { autoClaimRunsBySRCUsernameFirestore } from "./src-imports";

/**
 * Real-time autoclaiming service that listens for:
 * 1. New imported runs and automatically claims them for matching users
 * 2. Players updating their srcUsername and claims matching unclaimed runs
 */

// Track active listeners
let importedRunsUnsubscribe: Unsubscribe | null = null;
let playersUnsubscribe: Unsubscribe | null = null;
let isListening = false;

// Debounce helper to batch process multiple changes
let claimDebounceTimer: NodeJS.Timeout | null = null;
const CLAIM_DEBOUNCE_MS = 1000; // Wait 1 second after last change before processing

/**
 * Claim a single run for a player if it matches
 */
const claimRunForPlayer = async (run: LeaderboardEntry, playerUid: string): Promise<boolean> => {
  if (!db) return false;
  try {
    // Only claim if currently unclaimed
    if (!run.playerId || run.playerId === "imported" || run.playerId.trim() === "") {
      const runRef = doc(db, "leaderboardEntries", run.id).withConverter(leaderboardEntryConverter);
      await updateDoc(runRef, { playerId: playerUid });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error claiming run for player:", error);
    return false;
  }
};

/**
 * Process newly imported runs and claim them for matching players
 */
const processNewImportedRuns = async (changes: DocumentChange<LeaderboardEntry>[]) => {
  if (!db) return;

  const newRuns: LeaderboardEntry[] = [];
  
  for (const change of changes) {
    if (change.type === "added") {
      const run = change.doc.data();
      // Only process unclaimed imported runs
      if (
        run.importedFromSRC &&
        run.srcPlayerName &&
        (!run.playerId || run.playerId === "imported" || run.playerId.trim() === "")
      ) {
        newRuns.push(run);
      }
    }
  }

  if (newRuns.length === 0) return;

  // Get all players with SRC usernames
  const playersQuery = query(
    collection(db, "players").withConverter(playerConverter),
    where("srcUsername", ">", "")
  );
  
  let players: Player[];
  try {
    const playersSnapshot = await getDocs(playersQuery);
    players = playersSnapshot.docs.map(doc => doc.data());
  } catch (error) {
    // Fallback: fetch all players and filter
    try {
      const allPlayersQuery = query(
        collection(db, "players").withConverter(playerConverter),
        firestoreLimit(1000)
      );
      const allPlayersSnapshot = await getDocs(allPlayersQuery);
      players = allPlayersSnapshot.docs
        .map(doc => doc.data())
        .filter(p => p.srcUsername && p.srcUsername.trim());
    } catch (e) {
      console.error("Error fetching players for autoclaiming:", e);
      return;
    }
  }

  // Create a map of normalized srcUsername -> player for quick lookup
  const playerMap = new Map<string, Player>();
  for (const player of players) {
    if (player.srcUsername) {
      const normalized = player.srcUsername.trim().toLowerCase();
      playerMap.set(normalized, player);
    }
  }

  // Process runs in batches
  const batches: ReturnType<typeof writeBatch>[] = [];
  let currentBatch = writeBatch(db);
  let currentBatchSize = 0;
  let totalClaimed = 0;
  const maxBatchSize = 500;

  for (const run of newRuns) {
    if (!run.srcPlayerName) continue;
    
    const normalizedSrcPlayerName = run.srcPlayerName.trim().toLowerCase();
    const matchingPlayer = playerMap.get(normalizedSrcPlayerName);
    
    if (matchingPlayer) {
      // Only claim if still unclaimed (double-check)
      if (!run.playerId || run.playerId === "imported" || run.playerId.trim() === "") {
        const runRef = doc(db, "leaderboardEntries", run.id);
        currentBatch.update(runRef, { playerId: matchingPlayer.uid });
        currentBatchSize++;
        totalClaimed++;
        
        if (currentBatchSize >= maxBatchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          currentBatchSize = 0;
        }
      }
    }
  }

  // Commit remaining batch
  if (currentBatchSize > 0) {
    batches.push(currentBatch);
  }

  // Execute all batches
  if (batches.length > 0) {
    try {
      await Promise.all(batches.map(batch => batch.commit()));
      if (totalClaimed > 0) {
        console.log(`[Autoclaim] Claimed ${totalClaimed} new run(s) via real-time listener`);
      }
    } catch (error) {
      console.error("Error committing autoclaim batches:", error);
    }
  }
};

/**
 * Process player srcUsername updates and claim matching runs
 * This works with both verified and unverified runs
 */
const processPlayerSRCUpdate = async (player: Player) => {
  if (!db || !player.srcUsername) return;

  const normalizedUsername = player.srcUsername.trim().toLowerCase();
  
  // Use the existing function to claim all matching runs (verified or unverified)
  // autoClaimRunsBySRCUsernameFirestore doesn't filter by verified status
  try {
    const claimed = await autoClaimRunsBySRCUsernameFirestore(player.uid, normalizedUsername);
    if (claimed > 0) {
      console.log(`[Autoclaim] Claimed ${claimed} run(s) for player ${player.uid} after srcUsername update`);
    }
  } catch (error) {
    console.error("Error claiming runs for updated player:", error);
  }
};

/**
 * Process existing unclaimed runs for all players with SRC usernames
 * This is called once when autoclaiming starts to catch any existing runs
 * Works with both verified and unverified runs
 */
const processExistingUnclaimedRuns = async (): Promise<void> => {
  if (!db) return;

  try {
    // Get all players with SRC usernames
    const playersQuery = query(
      collection(db, "players").withConverter(playerConverter),
      where("srcUsername", ">", "")
    );
    
    let players: Player[];
    try {
      const playersSnapshot = await getDocs(playersQuery);
      players = playersSnapshot.docs.map(doc => doc.data());
    } catch (error) {
      // Fallback: fetch all players and filter
      try {
        const allPlayersQuery = query(
          collection(db, "players").withConverter(playerConverter),
          firestoreLimit(1000)
        );
        const allPlayersSnapshot = await getDocs(allPlayersQuery);
        players = allPlayersSnapshot.docs
          .map(doc => doc.data())
          .filter(p => p.srcUsername && p.srcUsername.trim());
      } catch (e) {
        console.error("Error fetching players for initial autoclaiming:", e);
        return;
      }
    }

    // Process each player's runs
    let totalClaimed = 0;
    for (const player of players) {
      if (player.srcUsername) {
        try {
          const normalizedUsername = player.srcUsername.trim().toLowerCase();
          const claimed = await autoClaimRunsBySRCUsernameFirestore(player.uid, normalizedUsername);
          if (claimed > 0) {
            totalClaimed += claimed;
            console.log(`[Autoclaim] Initial check: Claimed ${claimed} existing run(s) for player ${player.uid}`);
          }
        } catch (error) {
          console.error(`Error claiming runs for player ${player.uid} during initial check:`, error);
        }
      }
    }

    if (totalClaimed > 0) {
      console.log(`[Autoclaim] Initial check complete: Claimed ${totalClaimed} total existing run(s)`);
    }
  } catch (error) {
    console.error("Error processing existing unclaimed runs:", error);
  }
};

/**
 * Start real-time autoclaiming listeners
 * Also processes existing unclaimed runs on startup
 */
export const startRealtimeAutoclaiming = (): void => {
  if (isListening || !db) return;
  
  isListening = true;

  // Process existing unclaimed runs once when starting (works with verified and unverified runs)
  // This ensures any existing runs get claimed when autoclaiming starts
  processExistingUnclaimedRuns().catch(error => {
    console.error("Error processing existing runs on startup:", error);
  });

  // Listener for new imported runs
  try {
    const importedRunsQuery = query(
      collection(db, "leaderboardEntries").withConverter(leaderboardEntryConverter),
      where("importedFromSRC", "==", true)
    );

    importedRunsUnsubscribe = onSnapshot(
      importedRunsQuery,
      (snapshot: QuerySnapshot<LeaderboardEntry>) => {
        // Only process new additions
        const addedChanges = snapshot.docChanges().filter(change => change.type === "added");
        
        if (addedChanges.length > 0) {
          // Debounce to batch process multiple runs
          if (claimDebounceTimer) {
            clearTimeout(claimDebounceTimer);
          }
          
          claimDebounceTimer = setTimeout(() => {
            processNewImportedRuns(addedChanges).catch(error => {
              console.error("Error processing new imported runs:", error);
            });
          }, CLAIM_DEBOUNCE_MS);
        }
      },
      (error) => {
        console.error("Error in imported runs listener:", error);
      }
    );
  } catch (error) {
    console.error("Error setting up imported runs listener:", error);
  }

  // Listener for players with srcUsername updates
  try {
    const playersQuery = query(
      collection(db, "players").withConverter(playerConverter),
      where("srcUsername", ">", "")
    );

    playersUnsubscribe = onSnapshot(
      playersQuery,
      (snapshot: QuerySnapshot<Player>) => {
        // Process both new players with srcUsername and updates to existing players
        const changes = snapshot.docChanges();
        
        for (const change of changes) {
          const player = change.doc.data();
          
          // Only process if player has srcUsername
          if (player.srcUsername && player.srcUsername.trim()) {
            // Debounce to avoid processing the same player multiple times
            if (claimDebounceTimer) {
              clearTimeout(claimDebounceTimer);
            }
            
            claimDebounceTimer = setTimeout(() => {
              processPlayerSRCUpdate(player).catch(error => {
                console.error("Error processing player SRC update:", error);
              });
            }, CLAIM_DEBOUNCE_MS);
          }
        }
      },
      (error) => {
        console.error("Error in players listener:", error);
      }
    );
  } catch (error) {
    console.error("Error setting up players listener:", error);
    // Fallback: use a broader query if the indexed query fails
    try {
      const allPlayersQuery = query(
        collection(db, "players").withConverter(playerConverter),
        firestoreLimit(1000)
      );

      let previousPlayers = new Map<string, string>(); // uid -> srcUsername
      
      playersUnsubscribe = onSnapshot(
        allPlayersQuery,
        (snapshot: QuerySnapshot<Player>) => {
          const currentPlayers = new Map<string, string>();
          
          snapshot.docs.forEach(doc => {
            const player = doc.data();
            if (player.srcUsername && player.srcUsername.trim()) {
              currentPlayers.set(player.uid, player.srcUsername.trim().toLowerCase());
            }
          });

          // Check for new or updated srcUsernames
          for (const [uid, srcUsername] of currentPlayers.entries()) {
            const previousSrcUsername = previousPlayers.get(uid);
            
            // If this is a new player with srcUsername or srcUsername changed
            if (!previousSrcUsername || previousSrcUsername !== srcUsername) {
              const player = snapshot.docs.find(d => d.data().uid === uid)?.data();
              if (player) {
                if (claimDebounceTimer) {
                  clearTimeout(claimDebounceTimer);
                }
                
                claimDebounceTimer = setTimeout(() => {
                  processPlayerSRCUpdate(player).catch(error => {
                    console.error("Error processing player SRC update:", error);
                  });
                }, CLAIM_DEBOUNCE_MS);
              }
            }
          }
          
          previousPlayers = currentPlayers;
        },
        (error) => {
          console.error("Error in fallback players listener:", error);
        }
      );
    } catch (fallbackError) {
      console.error("Error setting up fallback players listener:", fallbackError);
    }
  }

  console.log("[Autoclaim] Real-time autoclaiming listeners started");
};

/**
 * Stop real-time autoclaiming listeners
 */
export const stopRealtimeAutoclaiming = (): void => {
  if (claimDebounceTimer) {
    clearTimeout(claimDebounceTimer);
    claimDebounceTimer = null;
  }

  if (importedRunsUnsubscribe) {
    importedRunsUnsubscribe();
    importedRunsUnsubscribe = null;
  }

  if (playersUnsubscribe) {
    playersUnsubscribe();
    playersUnsubscribe = null;
  }

  isListening = false;
  console.log("[Autoclaim] Real-time autoclaiming listeners stopped");
};

/**
 * Check if real-time autoclaiming is currently active
 */
export const isRealtimeAutoclaimingActive = (): boolean => {
  return isListening;
};

