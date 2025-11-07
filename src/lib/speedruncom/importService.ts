/**
 * Speedrun.com Import Service
 * Simplified, robust import system based on SRC API best practices
 */

import { 
  getLSWGameId, 
  fetchRunsNotOnLeaderboards,
  mapSRCRunToLeaderboardEntry,
  fetchCategories as fetchSRCCategories,
  fetchLevels as fetchSRCLevels,
  fetchPlatformById,
  type SRCRun,
} from "../speedruncom";
import { 
  getCategoriesFromFirestore,
  getPlatformsFromFirestore,
  getLevels,
  getExistingSRCRunIds,
  addLeaderboardEntry,
  getPlayerByDisplayName,
  runAutoclaimingForAllUsers,
} from "../db";
import { LeaderboardEntry } from "@/types/database";

export interface ImportResult {
  imported: number;
  skipped: number;
  unmatchedPlayers: Map<string, { player1?: string; player2?: string }>;
  errors: string[];
}

export interface ImportProgress {
  total: number;
  imported: number;
  skipped: number;
}

/**
 * SRC Mappings - stores all ID and name mappings between SRC and local data
 */
interface SRCMappings {
  // ID mappings: SRC ID -> Local ID
  categoryMapping: Map<string, string>;
  platformMapping: Map<string, string>;
  levelMapping: Map<string, string>;
  
  // Name mappings: SRC name (lowercase) -> Local ID
  categoryNameMapping: Map<string, string>;
  platformNameMapping: Map<string, string>;
  
  // SRC ID -> SRC name (for fallback when embedded data is missing)
  srcPlatformIdToName: Map<string, string>;
  srcCategoryIdToName: Map<string, string>;
  srcLevelIdToName: Map<string, string>;
}

// Cache for player and platform names fetched from API during import (prevents duplicate API calls)
const playerIdToNameCache = new Map<string, string>();
const platformIdToNameCache = new Map<string, string>();

/**
 * Extract platform ID and name from SRC run data
 * Handles embedded platform data or string ID
 */
function extractPlatformFromRun(run: SRCRun): { id: string; name: string } | null {
  const platform = run.system?.platform;
  if (!platform) return null;

  // If it's a string ID, we'll need to fetch it later
  if (typeof platform === 'string') {
    return { id: platform, name: '' };
  }

  // If it's embedded data
  if (platform.data) {
    const platformData = platform.data;
    const id = platformData.id || '';
    const name = platformData.names?.international || platformData.name || '';
    return { id, name };
  }

  return null;
}

/**
 * Create mapping between SRC IDs and our IDs for categories, platforms, and levels
 * Only fetches platforms that are actually used in the runs being imported
 */
export async function createSRCMappings(srcRuns: SRCRun[], gameId: string): Promise<SRCMappings> {
  if (!Array.isArray(srcRuns)) {
    throw new Error("srcRuns must be an array");
  }

  if (!gameId) {
    throw new Error("gameId is required");
  }

  // Fetch our local data and SRC game-specific data in parallel
  // Note: getLevels() fetches ALL levels across the site (both individual-level and community-golds)
  // to ensure level matching works for all leaderboard types
  const [ourCategories, ourPlatforms, ourLevels, srcCategories, srcLevels] = await Promise.all([
    getCategoriesFromFirestore(),
    getPlatformsFromFirestore(),
    getLevels(), // Fetches all levels - no filtering by leaderboard type
    fetchSRCCategories(gameId),
    fetchSRCLevels(gameId),
  ]);

  // Ensure all results are arrays
  const safeSrcCategories = Array.isArray(srcCategories) ? srcCategories : [];
  const safeSrcLevels = Array.isArray(srcLevels) ? srcLevels : [];
  const safeOurCategories = Array.isArray(ourCategories) ? ourCategories : [];
  const safeOurPlatforms = Array.isArray(ourPlatforms) ? ourPlatforms : [];
  const safeOurLevels = Array.isArray(ourLevels) ? ourLevels : [];

  // Extract unique platform IDs/names from runs (only LSW1 platforms)
  const uniquePlatforms = new Map<string, { id: string; name: string }>();
  
  for (const run of srcRuns) {
    if (!run || typeof run !== 'object') continue;
    const platformData = extractPlatformFromRun(run);
    if (platformData && platformData.id) {
      // If we already have this platform ID, skip
      if (uniquePlatforms.has(platformData.id)) {
        continue;
      }
      
      // If we have a name from embedded data, use it
      if (platformData.name) {
        uniquePlatforms.set(platformData.id, platformData);
      } else {
        // Store ID only, we'll fetch the name later
        uniquePlatforms.set(platformData.id, { id: platformData.id, name: '' });
      }
    }
  }

  // Fetch platform names for any platforms we only have IDs for
  const platformsToFetch = Array.from(uniquePlatforms.values()).filter(p => !p.name && p.id);
  const platformFetchPromises = platformsToFetch.map(async (platform) => {
    try {
      const name = await fetchPlatformById(platform.id);
      if (name) {
        uniquePlatforms.set(platform.id, { id: platform.id, name });
      }
    } catch (error) {
      console.warn(`[SRC Mapping] Failed to fetch platform ${platform.id}:`, error);
    }
  });

  if (platformFetchPromises.length > 0) {
    await Promise.all(platformFetchPromises);
  }

  // Initialize mappings
  const categoryMapping = new Map<string, string>();
  const platformMapping = new Map<string, string>();
  const levelMapping = new Map<string, string>();
  const categoryNameMapping = new Map<string, string>();
  const platformNameMapping = new Map<string, string>();
  const srcPlatformIdToName = new Map<string, string>();
  const srcCategoryIdToName = new Map<string, string>();
  const srcLevelIdToName = new Map<string, string>();

  // Helper: normalize for comparison
  const normalize = (str: string) => str.toLowerCase().trim();

  // Map categories - match by name, considering leaderboardType
  for (const srcCat of safeSrcCategories) {
    if (!srcCat || !srcCat.name || !srcCat.id) continue;
    
    // Store SRC ID -> name mapping
    srcCategoryIdToName.set(srcCat.id, srcCat.name);
    
    // Determine leaderboardType for this SRC category
    // SRC categories have type: "per-game" or "per-level"
    const srcCategoryType = srcCat.type || 'per-game';
    const expectedLeaderboardType: 'regular' | 'individual-level' = srcCategoryType === 'per-level' ? 'individual-level' : 'regular';
    
    // Find matching local category - try exact match first, then fallback to any match
    let ourCat = safeOurCategories.find(c => {
      if (!c) return false;
      const nameMatch = normalize(c.name) === normalize(srcCat.name);
      if (!nameMatch) return false;
      
      // Prefer match with same leaderboardType, but allow fallback
      const catType = c.leaderboardType || 'regular';
      return catType === expectedLeaderboardType;
    });
    
    // Fallback: if no match with correct type, try any category with matching name
    if (!ourCat) {
      ourCat = safeOurCategories.find(c => c && normalize(c.name) === normalize(srcCat.name));
    }
    
    if (ourCat) {
      categoryMapping.set(srcCat.id, ourCat.id);
      // Store name mapping with normalized name (for all name variations)
      const normalizedSrcName = normalize(srcCat.name);
      categoryNameMapping.set(normalizedSrcName, ourCat.id);
      
      // Also store variations (without special chars) for fuzzy matching
      const simplifiedName = normalizedSrcName.replace(/[^a-z0-9]/g, '');
      if (simplifiedName !== normalizedSrcName) {
        categoryNameMapping.set(simplifiedName, ourCat.id);
      }
    } else {
      // Log unmatched categories for debugging
      console.warn(`[SRC Mapping] Category "${srcCat.name}" (type: ${srcCategoryType}) not found in local categories`);
    }
  }

  // Map platforms (only those used in LSW1 runs)
  for (const [platformId, platformData] of uniquePlatforms) {
    const platformName = platformData?.name;
    if (!platformName) continue;
    
    srcPlatformIdToName.set(platformId, platformName);
    
    const ourPlatform = safeOurPlatforms.find(p => p && normalize(p.name) === normalize(platformName));
    if (ourPlatform) {
      platformMapping.set(platformId, ourPlatform.id);
      platformNameMapping.set(normalize(platformName), ourPlatform.id);
    }
  }

  // Map levels - check against ALL levels configured across the site
  // (both individual-level and community-golds leaderboard types)
  for (const srcLevel of safeSrcLevels) {
    if (!srcLevel || !srcLevel.id) continue;
    
    const levelName = srcLevel.name || srcLevel.names?.international || '';
    if (!levelName) continue;
    
    // Store SRC ID -> name mapping
    srcLevelIdToName.set(srcLevel.id, levelName);
    
    // Find matching local level - searches across ALL levels, not filtered by leaderboard type
    const ourLevel = safeOurLevels.find(l => l && normalize(l.name) === normalize(levelName));
    if (ourLevel) {
      levelMapping.set(srcLevel.id, ourLevel.id);
    }
  }

  return {
    categoryMapping,
    platformMapping,
    levelMapping,
    categoryNameMapping,
    platformNameMapping,
    srcPlatformIdToName,
    srcCategoryIdToName,
    srcLevelIdToName,
  };
}

/**
 * Validate a mapped run before importing
 * Returns validation errors if any
 */
function validateMappedRun(
  run: Partial<LeaderboardEntry> & { srcRunId: string },
  srcRunId: string
): string[] {
  const errors: string[] = [];

  // Essential fields
  if (!run.playerName || run.playerName.trim() === '') {
    errors.push('missing player name');
  }

  if (!run.time || run.time.trim() === '') {
    errors.push('missing time');
  } else if (!/^\d{1,2}:\d{2}:\d{2}$/.test(run.time)) {
    errors.push(`invalid time format "${run.time}" (expected HH:MM:SS)`);
  }

  if (!run.date || run.date.trim() === '') {
    errors.push('missing date');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(run.date)) {
    errors.push(`invalid date format "${run.date}" (expected YYYY-MM-DD)`);
  }

  // Category and platform are optional - we'll import runs even if they don't match local categories/platforms
  // Admin can assign them during verification
  // No validation errors for missing category/platform - just warnings

  // Run type must be valid
  if (run.runType && run.runType !== 'solo' && run.runType !== 'co-op') {
    errors.push(`invalid run type "${run.runType}"`);
  }

  // Leaderboard type must be valid
  if (run.leaderboardType && 
      run.leaderboardType !== 'regular' && 
      run.leaderboardType !== 'individual-level' && 
      run.leaderboardType !== 'community-golds') {
    errors.push(`invalid leaderboard type "${run.leaderboardType}"`);
  }

  // For IL/Community Golds, level is optional - admin can assign during verification
  // No validation error for missing level - just a warning

  // For co-op, player2Name should be present
  // Allow "Unknown" as a placeholder (admin can fix later)
  if (run.runType === 'co-op') {
    if (!run.player2Name || (run.player2Name.trim() === '' && run.player2Name !== 'Unknown')) {
      errors.push('missing player 2 name for co-op run');
    }
  }

  return errors;
}

/**
 * Import runs from speedrun.com
 * Simplified, robust implementation with clear error handling
 */
export async function importSRCRuns(
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    unmatchedPlayers: new Map(),
    errors: [],
  };

  try {
    // Step 1: Get game ID
    const gameId = await getLSWGameId();
    if (!gameId) {
      result.errors.push("Could not find LEGO Star Wars game on speedrun.com");
      return result;
    }

    // Step 2: Fetch runs from SRC - get 200 most recent runs
    let srcRuns: SRCRun[];
    try {
      srcRuns = await fetchRunsNotOnLeaderboards(gameId, 200);
    } catch (error) {
      result.errors.push(`Failed to fetch runs: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }

    if (srcRuns.length === 0) {
      result.errors.push("No runs found to import");
      return result;
    }

    // Step 3: Get existing SRC run IDs to check for duplicates (optimized - only fetch IDs, not full runs)
    let existingSRCRunIds: Set<string>;
    try {
      existingSRCRunIds = await getExistingSRCRunIds();
    } catch (error) {
      result.errors.push(`Failed to fetch existing run IDs: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }

    // Step 4: Create mappings (only for platforms used in these runs) - pass gameId to avoid redundant API call
    let mappings: SRCMappings;
    try {
      mappings = await createSRCMappings(srcRuns, gameId);
    } catch (error) {
      result.errors.push(`Failed to create mappings: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }

    onProgress?.({ total: srcRuns.length, imported: 0, skipped: 0 });

    // Step 5: Pre-fetch all unique player names to batch lookups
    const uniquePlayerNames = new Set<string>();
    for (const srcRun of srcRuns) {
      if (srcRun.players && Array.isArray(srcRun.players)) {
        for (const player of srcRun.players) {
          if (player && typeof player === 'object') {
            const playerData = 'data' in player && Array.isArray(player.data) ? player.data[0] : 
                             'data' in player ? player.data : player;
            if (playerData?.names?.international) {
              uniquePlayerNames.add(playerData.names.international.trim());
            }
          }
        }
      }
    }

    // Batch lookup all players at once
    const playerNameCache = new Map<string, any>();
    const playerLookupPromises = Array.from(uniquePlayerNames).map(async (name) => {
      try {
        const player = await getPlayerByDisplayName(name);
        if (player) {
          playerNameCache.set(name.toLowerCase(), player);
        }
      } catch (error) {
        // Silently fail - player doesn't exist
      }
    });
    await Promise.all(playerLookupPromises);

    // Step 6: Process each run
    for (const srcRun of srcRuns) {
      try {
        // Skip if already exists in database (already linked on boards)
        if (existingSRCRunIds.has(srcRun.id)) {
          result.skipped++;
          onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
          continue;
        }

        // Map SRC run to our format
        let mappedRun: Partial<LeaderboardEntry> & { srcRunId: string; importedFromSRC: boolean };
        try {
          mappedRun = await mapSRCRunToLeaderboardEntry(
            srcRun,
            undefined,
            mappings.categoryMapping,
            mappings.platformMapping,
            mappings.levelMapping,
            "", // CRITICAL: Use empty string for unclaimed imported runs - never create temporary profiles
            mappings.categoryNameMapping,
            mappings.platformNameMapping,
            mappings.srcPlatformIdToName,
            mappings.srcCategoryIdToName,
            mappings.srcLevelIdToName,
            playerIdToNameCache,
            platformIdToNameCache
          );
        } catch (mapError: any) {
          result.skipped++;
          const errorMessage = mapError instanceof Error ? mapError.message : String(mapError);
          result.errors.push(`Run ${srcRun?.id || 'unknown'}: ${errorMessage}`);
          onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
          continue;
        }

        // Set import metadata
        mappedRun.importedFromSRC = true;
        mappedRun.srcRunId = srcRun.id;
        mappedRun.verified = false;

        // Ensure required fields have defaults
        if (!mappedRun.runType) mappedRun.runType = 'solo';
        if (!mappedRun.leaderboardType) mappedRun.leaderboardType = 'regular';
        if (!mappedRun.playerName || mappedRun.playerName.trim() === '') {
          mappedRun.playerName = 'Unknown';
        }
        
        // Validate time - check if time is missing or 00:00:00 when it shouldn't be
        if (!mappedRun.time || mappedRun.time.trim() === '' || mappedRun.time === '00:00:00') {
          // Check if the source run actually has a time
          if (srcRun.times?.primary_t && srcRun.times.primary_t > 0) {
            // Time exists in source but was lost during conversion - try to fix it
            const fixedTime = secondsToTime(srcRun.times.primary_t);
            if (fixedTime && fixedTime !== '00:00:00') {
              mappedRun.time = fixedTime;
              console.warn(`[importSRCRuns] Fixed missing time for run ${srcRun.id}: ${fixedTime}`);
            } else {
              console.error(`[importSRCRuns] Time conversion failed for run ${srcRun.id}: primary_t=${srcRun.times.primary_t}, got ${fixedTime}`);
              result.errors.push(`Run ${srcRun.id}: time conversion failed`);
            }
          } else if (srcRun.times?.primary && srcRun.times.primary.trim() !== '') {
            // Try ISO duration conversion
            const fixedTime = isoDurationToTime(srcRun.times.primary);
            if (fixedTime && fixedTime !== '00:00:00') {
              mappedRun.time = fixedTime;
              console.warn(`[importSRCRuns] Fixed missing time for run ${srcRun.id} using ISO duration: ${fixedTime}`);
            } else {
              console.error(`[importSRCRuns] ISO duration conversion failed for run ${srcRun.id}: primary=${srcRun.times.primary}, got ${fixedTime}`);
              result.errors.push(`Run ${srcRun.id}: time conversion failed`);
            }
          } else {
            console.error(`[importSRCRuns] No time data available for run ${srcRun.id}`);
            result.errors.push(`Run ${srcRun.id}: missing time data in source run`);
          }
        }

        // Validate the mapped run - only skip if essential fields are missing
        const validationErrors = validateMappedRun(mappedRun, srcRun.id);
        const criticalErrors = validationErrors.filter(err => 
          err.includes('missing player name') || 
          err.includes('missing time') || 
          err.includes('invalid time format') ||
          err.includes('missing date') ||
          err.includes('invalid date format')
        );
        
        if (criticalErrors.length > 0) {
          result.skipped++;
          result.errors.push(`Run ${srcRun.id}: ${criticalErrors.join(', ')}`);
          onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
          continue;
        }
        
        // Log non-critical validation issues as warnings
        const warnings = validationErrors.filter(err => 
          !err.includes('missing player name') && 
          !err.includes('missing time') && 
          !err.includes('invalid time format') &&
          !err.includes('missing date') &&
          !err.includes('invalid date format')
        );
        if (warnings.length > 0) {
          console.warn(`Run ${srcRun.id} has warnings: ${warnings.join(', ')}`);
        }

        // Handle platform - allow empty if SRC name exists
        if (!mappedRun.platform || mappedRun.platform.trim() === '') {
          if (!mappedRun.srcPlatformName) {
            mappedRun.platform = '';
            mappedRun.srcPlatformName = 'Unknown Platform (from SRC)';
            result.errors.push(`Run ${srcRun.id}: missing platform (using placeholder)`);
          } else {
            mappedRun.platform = '';
          }
        }

        // Normalize player names
        mappedRun.playerName = mappedRun.playerName.trim();
        
        // For co-op runs, preserve player2Name even if it's "Unknown"
        if (mappedRun.runType === 'co-op') {
          if (mappedRun.player2Name) {
            mappedRun.player2Name = mappedRun.player2Name.trim() || "Unknown";
          } else {
            mappedRun.player2Name = "Unknown";
          }
        } else {
          // For solo runs, clear player2Name
          mappedRun.player2Name = undefined;
        }

        // Check player matching (for warnings only, doesn't block import) - use cached lookups
        const player1Matched = playerNameCache.get(mappedRun.playerName.toLowerCase());
        const player2Matched = mappedRun.player2Name ? playerNameCache.get(mappedRun.player2Name.toLowerCase()) : null;

        const unmatched: { player1?: string; player2?: string } = {};
        if (!player1Matched) unmatched.player1 = mappedRun.playerName;
        if (mappedRun.player2Name && !player2Matched) unmatched.player2 = mappedRun.player2Name;

        // Save to database
        try {
          const addedRunId = await addLeaderboardEntry(mappedRun as LeaderboardEntry);
          if (!addedRunId) {
            result.skipped++;
            result.errors.push(`Run ${srcRun.id}: failed to save to database`);
            onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
            continue;
          }

          // Track unmatched players
          if (unmatched.player1 || unmatched.player2) {
            result.unmatchedPlayers.set(addedRunId, unmatched);
          }

          result.imported++;
          onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });

        } catch (addError: any) {
          result.skipped++;
          const errorMsg = addError?.message || String(addError);
          result.errors.push(`Run ${srcRun.id}: ${errorMsg}`);
          console.error(`Failed to save run ${srcRun.id}:`, addError);
          onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
        }

      } catch (error) {
        // Catch any unexpected errors processing this run
        result.skipped++;
        result.errors.push(`Run ${srcRun.id}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Error processing run ${srcRun.id}:`, error);
        onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
      }
    }

    // After importing runs, run autoclaiming for all users with SRC usernames
    // This ensures newly imported runs are automatically claimed
    try {
      console.log("[Import] Running autoclaiming for all users after import...");
      const autoclaimResult = await runAutoclaimingForAllUsers();
      if (autoclaimResult.totalClaimed > 0) {
        console.log(`[Import] Autoclaimed ${autoclaimResult.totalClaimed} runs for ${autoclaimResult.totalUsers} users`);
      }
      if (autoclaimResult.errors.length > 0) {
        console.warn(`[Import] Autoclaiming had ${autoclaimResult.errors.length} errors:`, autoclaimResult.errors);
      }
    } catch (autoclaimError) {
      // Don't fail the import if autoclaiming fails
      console.error("[Import] Error running autoclaiming after import:", autoclaimError);
    }

    return result;
  } catch (error) {
    // Catch any unexpected top-level errors
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Import error:", error);
    return result;
  }
}
