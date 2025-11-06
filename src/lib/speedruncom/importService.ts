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
  fetchPlatforms as fetchSRCPlatforms,
  type SRCRun,
} from "../speedruncom";
import { 
  getCategoriesFromFirestore,
  getPlatformsFromFirestore,
  getLevels,
  getAllRunsForDuplicateCheck,
  addLeaderboardEntry,
  getPlayerByDisplayName,
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

// Cache for player and platform names fetched from API during import
// This prevents duplicate API calls for the same ID
const playerIdToNameCache = new Map<string, string>();
const platformIdToNameCache = new Map<string, string>();

/**
 * Create mapping between SRC IDs and our IDs for categories, platforms, and levels
 * Simplified and more robust mapping logic
 */
export async function createSRCMappings(): Promise<SRCMappings> {
  const gameId = await getLSWGameId();
  if (!gameId) {
    throw new Error("Could not find LEGO Star Wars game on speedrun.com");
  }

  // Fetch all data in parallel
  const [ourCategories, ourPlatforms, ourLevels, srcCategories, srcPlatforms, srcLevels] = await Promise.all([
    getCategoriesFromFirestore(),
    getPlatformsFromFirestore(),
    getLevels(),
    fetchSRCCategories(gameId),
    fetchSRCPlatforms(),
    fetchSRCLevels(gameId),
  ]);

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

  // Map categories
  for (const srcCat of srcCategories) {
    if (!srcCat.name) continue;
    
    // Store SRC ID -> name mapping
    srcCategoryIdToName.set(srcCat.id, srcCat.name);
    
    // Find matching local category
    const ourCat = ourCategories.find(c => normalize(c.name) === normalize(srcCat.name));
    if (ourCat) {
      categoryMapping.set(srcCat.id, ourCat.id);
      categoryNameMapping.set(normalize(srcCat.name), ourCat.id);
    }
  }

  // Map platforms
  for (const srcPlatform of srcPlatforms) {
    // Platforms use names.international (per SRC API docs)
    const platformName = srcPlatform.names?.international || srcPlatform.name || '';
    if (!platformName) {
      console.warn(`[SRC Mapping] Platform ${srcPlatform.id} has no name`);
      continue;
    }
    
    // Store SRC ID -> name mapping (critical for fallback)
    srcPlatformIdToName.set(srcPlatform.id, platformName);
    
    // Find matching local platform
    const ourPlatform = ourPlatforms.find(p => normalize(p.name) === normalize(platformName));
    if (ourPlatform) {
      platformMapping.set(srcPlatform.id, ourPlatform.id);
      platformNameMapping.set(normalize(platformName), ourPlatform.id);
    } else {
      console.log(`[SRC Mapping] Platform "${platformName}" (ID: ${srcPlatform.id}) not found locally`);
    }
  }

  console.log(`[SRC Mapping] Created ${srcPlatformIdToName.size} platform ID->name mappings`);

  // Map levels
  for (const srcLevel of srcLevels) {
    const levelName = srcLevel.name || srcLevel.names?.international || '';
    if (!levelName) continue;
    
    // Store SRC ID -> name mapping
    srcLevelIdToName.set(srcLevel.id, levelName);
    
    // Find matching local level
    const ourLevel = ourLevels.find(l => normalize(l.name) === normalize(levelName));
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
 * Check if a run is a duplicate based on run data
 */
function isDuplicateRun(
  run: Partial<LeaderboardEntry>,
  existingRunKeys: Set<string>
): boolean {
  const normalizeName = (name: string) => name.trim().toLowerCase();
  const player1Name = normalizeName(run.playerName || '');
  const player2Name = run.player2Name ? normalizeName(run.player2Name) : '';
  
  // Create run key: player1|player2|category|platform|runType|time|leaderboardType|level
  const runKey = `${player1Name}|${player2Name}|${run.category || ''}|${run.platform || ''}|${run.runType || 'solo'}|${run.time || ''}|${run.leaderboardType || 'regular'}|${run.level || ''}`;
  
  if (existingRunKeys.has(runKey)) {
    return true;
  }

  // For co-op runs, also check swapped players
  if (run.runType === 'co-op' && player2Name) {
    const swappedKey = `${player2Name}|${player1Name}|${run.category || ''}|${run.platform || ''}|${run.runType || 'co-op'}|${run.time || ''}|${run.leaderboardType || 'regular'}|${run.level || ''}`;
    if (existingRunKeys.has(swappedKey)) {
      return true;
    }
  }

  return false;
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

  // Category must be mapped (we only import runs with matching categories)
  if (!run.category || run.category.trim() === '') {
    errors.push(`category "${run.srcCategoryName || 'Unknown'}" not found on leaderboards`);
  }

  // Platform validation - allow empty if SRC name exists
  if (!run.platform && !run.srcPlatformName) {
    errors.push('missing platform');
  }

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

  // For IL/Community Golds, level should be present if category requires it
  if ((run.leaderboardType === 'individual-level' || run.leaderboardType === 'community-golds') && 
      !run.level && !run.srcLevelName) {
    errors.push('missing level for individual level run');
  }

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

    // Step 2: Fetch runs from SRC
    let srcRuns: SRCRun[];
    try {
      srcRuns = await fetchRunsNotOnLeaderboards(gameId, 500);
    } catch (error) {
      result.errors.push(`Failed to fetch runs: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }

    if (srcRuns.length === 0) {
      result.errors.push("No runs found to import");
      return result;
    }

    // Step 3: Create mappings
    let mappings: SRCMappings;
    try {
      mappings = await createSRCMappings();
    } catch (error) {
      result.errors.push(`Failed to create mappings: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }

    // Step 4: Get existing runs for duplicate checking
    let existingRuns: LeaderboardEntry[];
    try {
      existingRuns = await getAllRunsForDuplicateCheck();
    } catch (error) {
      result.errors.push(`Failed to fetch existing runs: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }

    // Build sets for duplicate checking
    const existingSRCRunIds = new Set(
      existingRuns.filter(r => r.srcRunId).map(r => r.srcRunId!)
    );

    const normalizeName = (name: string) => name.trim().toLowerCase();
    const existingRunKeys = new Set<string>();
    for (const run of existingRuns.filter(r => r.verified)) {
      const player1Name = normalizeName(run.playerName);
      const player2Name = run.player2Name ? normalizeName(run.player2Name) : '';
      const key = `${player1Name}|${player2Name}|${run.category || ''}|${run.platform || ''}|${run.runType || 'solo'}|${run.time || ''}|${run.leaderboardType || 'regular'}|${run.level || ''}`;
      existingRunKeys.add(key);
      
      // For co-op runs, also add swapped key
      if (run.runType === 'co-op' && player2Name) {
        const swappedKey = `${player2Name}|${player1Name}|${run.category || ''}|${run.platform || ''}|${run.runType || 'co-op'}|${run.time || ''}|${run.leaderboardType || 'regular'}|${run.level || ''}`;
        existingRunKeys.add(swappedKey);
      }
    }

    onProgress?.({ total: srcRuns.length, imported: 0, skipped: 0 });

    // Step 5: Process each run
    for (const srcRun of srcRuns) {
      try {
        // Skip if already imported
        if (existingSRCRunIds.has(srcRun.id)) {
          result.skipped++;
          onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
          continue;
        }

        // Map SRC run to our format (now async to support fetching names from API)
        let mappedRun: Partial<LeaderboardEntry> & { srcRunId: string; importedFromSRC: boolean };
        try {
          mappedRun = await mapSRCRunToLeaderboardEntry(
            srcRun,
            undefined,
            mappings.categoryMapping,
            mappings.platformMapping,
            mappings.levelMapping,
            "imported",
            mappings.categoryNameMapping,
            mappings.platformNameMapping,
            mappings.srcPlatformIdToName,
            mappings.srcCategoryIdToName,
            mappings.srcLevelIdToName,
            playerIdToNameCache,
            platformIdToNameCache
          );
        } catch (mapError) {
          result.skipped++;
          result.errors.push(`Run ${srcRun.id}: mapping failed: ${mapError instanceof Error ? mapError.message : String(mapError)}`);
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

        // Validate the mapped run
        const validationErrors = validateMappedRun(mappedRun, srcRun.id);
        if (validationErrors.length > 0) {
          result.skipped++;
          result.errors.push(`Run ${srcRun.id}: ${validationErrors.join(', ')}`);
          onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
          continue;
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

        // Check for duplicates
        if (isDuplicateRun(mappedRun, existingRunKeys)) {
          result.skipped++;
          onProgress?.({ total: srcRuns.length, imported: result.imported, skipped: result.skipped });
          continue;
        }

        // Check player matching (for warnings, doesn't block import)
        const player1Matched = await getPlayerByDisplayName(mappedRun.playerName);
        const player2Matched = mappedRun.player2Name ? await getPlayerByDisplayName(mappedRun.player2Name) : null;

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

          // Add to existing keys to prevent batch duplicates
          const player1Name = normalizeName(mappedRun.playerName);
          const player2Name = mappedRun.player2Name ? normalizeName(mappedRun.player2Name) : '';
          const runKey = `${player1Name}|${player2Name}|${mappedRun.category || ''}|${mappedRun.platform || ''}|${mappedRun.runType || 'solo'}|${mappedRun.time || ''}|${mappedRun.leaderboardType || 'regular'}|${mappedRun.level || ''}`;
          existingRunKeys.add(runKey);

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

    return result;
  } catch (error) {
    // Catch any unexpected top-level errors
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Import error:", error);
    return result;
  }
}
